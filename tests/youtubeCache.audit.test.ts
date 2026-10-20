/**
 * Audit tests for src/lib/youtubeCache.ts — dedup, LRU, refresh, concurrency.
 *
 * No network, no YouTube API, no fetch. Uses only controlled Promises and
 * an in-memory localStorage mock. Runs with Node's built-in test runner:
 *
 *   node --experimental-strip-types --test tests/youtubeCache.audit.test.ts
 *
 * Each test gets a FRESH module instance via a cache-busting dynamic import,
 * so module-level state (memory map, inflight map, memoryHydrated flag) resets
 * between tests. A new localStorage mock is also installed per test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

type CacheModule = typeof import('../src/lib/youtubeCache.ts');

function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  } as unknown as Storage;
}

let moduleCounter = 0;
async function freshModule(): Promise<CacheModule> {
  moduleCounter += 1;
  globalThis.localStorage = makeLocalStorage();
  // Unique query forces a fresh module evaluation → fresh module-level state.
  return import(`../src/lib/youtubeCache.ts?t=${moduleCounter}`);
}

function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('1. two simultaneous getOrCompute with same key share a single execution', async () => {
  const mod = await freshModule();
  let calls = 0;
  const { promise: computePromise, resolve } = deferred<string>();

  const p1 = mod.getOrCompute('k', () => {
    calls += 1;
    return computePromise;
  });
  const p2 = mod.getOrCompute('k', () => {
    calls += 1;
    return Promise.resolve('should-not-run');
  });

  // compute() runs in a microtask, so we must yield once before asserting.
  await Promise.resolve();
  assert.equal(calls, 1, 'compute ran more than once for simultaneous same-key calls');
  resolve('v');

  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(r1, 'v');
  assert.equal(r2, 'v');
  assert.equal(calls, 1, 'compute ran again during resolution');
});

test('2. subsequent call after cache is filled does NOT call compute', async () => {
  const mod = await freshModule();
  let calls = 0;
  await mod.getOrCompute('k', () => {
    calls += 1;
    return Promise.resolve('v');
  });
  assert.equal(calls, 1);

  const r = await mod.getOrCompute('k', () => {
    calls += 1;
    return Promise.resolve('should-not-run');
  });
  assert.equal(r, 'v');
  assert.equal(calls, 1, 'compute ran again despite cache hit');
});

test('3. compute failure clears inflight and allows a fresh retry', async () => {
  const mod = await freshModule();
  let attempts = 0;

  await assert.rejects(
    mod.getOrCompute('fail', () => {
      attempts += 1;
      return Promise.reject(new Error('boom'));
    }),
    /boom/,
  );

  // A second call must actually run compute again (failure was not cached).
  const r = await mod.getOrCompute('fail', () => {
    attempts += 1;
    return Promise.resolve('ok');
  });
  assert.equal(r, 'ok');
  assert.equal(attempts, 2, 'retry did not invoke compute again');
  assert.equal(mod.getCache('fail'), 'ok', 'failure was cached as a result');
});

test('4. refreshCache ignores stored value and replaces cache only on valid result', async () => {
  const mod = await freshModule();
  await mod.getOrCompute('k', () => Promise.resolve('old'));
  assert.equal(mod.getCache('k'), 'old');

  let calls = 0;
  const r = await mod.refreshCache(
    'k',
    () => {
      calls += 1;
      return Promise.resolve('new');
    },
    (v) => v === 'new',
  );
  assert.equal(r, 'new');
  assert.equal(calls, 1);
  assert.equal(mod.getCache('k'), 'new', 'refresh did not replace cached value');
});

test('5. refreshCache with invalid result (shouldCache=false) preserves prior valid cache', async () => {
  const mod = await freshModule();
  await mod.getOrCompute('k', () => Promise.resolve('good'));
  assert.equal(mod.getCache('k'), 'good');

  const r = await mod.refreshCache(
    'k',
    () => Promise.resolve('bad'),
    () => false,
  );
  assert.equal(r, 'bad');
  assert.equal(mod.getCache('k'), 'good', 'invalid refresh overwrote valid cache');
});

test('6. refreshCache failure preserves prior valid cache', async () => {
  const mod = await freshModule();
  await mod.getOrCompute('k', () => Promise.resolve('good'));
  assert.equal(mod.getCache('k'), 'good');

  await assert.rejects(
    mod.refreshCache('k', () => Promise.reject(new Error('net'))),
    /net/,
  );
  assert.equal(mod.getCache('k'), 'good', 'refresh failure wiped valid cache');
});

test('7a. concurrency: refreshCache while getOrCompute in flight runs a SECOND compute', async () => {
  const mod = await freshModule();
  let calls = 0;
  const goc = deferred<string>();

  const pGoc = mod.getOrCompute('k', () => {
    calls += 1;
    return goc.promise;
  });

  // While getOrCompute is in flight, force a refresh.
  const pRef = mod.refreshCache('k', () => {
    calls += 1;
    return Promise.resolve('fresh');
  });

  goc.resolve('stale');
  const [gocVal, refVal] = await Promise.all([pGoc, pRef]);

  assert.equal(gocVal, 'stale');
  assert.equal(refVal, 'fresh');
  assert.equal(calls, 2, 'expected a duplicate compute from refresh-in-flight');
});

test('7b. concurrency: stale getOrCompute does NOT overwrite a fresh refreshCache result', async () => {
  // The generation guard prevents an older getOrCompute from writing its result
  // after a refreshCache has already advanced the generation and stored a fresh value.
  const mod = await freshModule();
  const goc = deferred<string>();

  const pGoc = mod.getOrCompute('k', () => goc.promise);

  // refresh resolves first and writes 'fresh'.
  const refVal = await mod.refreshCache('k', () => Promise.resolve('fresh'));
  assert.equal(refVal, 'fresh');
  assert.equal(mod.getCache('k'), 'fresh');

  // The older getOrCompute compute resolves later with 'stale'.
  // The generation guard must prevent it from overwriting 'fresh'.
  goc.resolve('stale');
  await pGoc;

  assert.equal(
    mod.getCache('k'),
    'fresh',
    'stale getOrCompute result overwrote fresh refreshCache result (generation guard failed)',
  );
});

test('8. different keys execute in parallel (no global serialization)', async () => {
  const mod = await freshModule();
  const a = deferred<number>();
  const b = deferred<number>();

  const pA = mod.getOrCompute('a', () => a.promise);
  const pB = mod.getOrCompute('b', () => b.promise);

  // Both computes are pending simultaneously → parallel.
  a.resolve(1);
  b.resolve(2);
  const [ra, rb] = await Promise.all([pA, pB]);
  assert.equal(ra, 1);
  assert.equal(rb, 2);
});

test('9. cache hydrates from localStorage on first access (memory miss → storage hit)', async () => {
  const ls = makeLocalStorage();
  ls.setItem(
    'pulse:yt-cache:v1',
    JSON.stringify({
      version: 1,
      entries: { 'persisted': { value: 'from-storage', lastUsed: 1 } },
    }),
  );
  globalThis.localStorage = ls;
  moduleCounter += 1;
  const mod = (await import(`../src/lib/youtubeCache.ts?t=${moduleCounter}`)) as CacheModule;

  let calls = 0;
  const r = await mod.getOrCompute('persisted', () => {
    calls += 1;
    return Promise.resolve('from-network');
  });
  assert.equal(r, 'from-storage', 'did not hydrate from localStorage');
  assert.equal(calls, 0, 'compute ran despite persisted cache entry');
});

test('10. refreshCache supersedes older getOrCompute — duplicate compute but safe write', async () => {
  const mod = await freshModule();
  let calls = 0;
  const goc = deferred<string>();
  const pGoc = mod.getOrCompute('k', () => {
    calls += 1;
    return goc.promise;
  });
  await mod.refreshCache('k', () => {
    calls += 1;
    return Promise.resolve('fresh');
  });
  goc.resolve('stale');
  await pGoc;
  assert.equal(calls, 2);
  assert.equal(mod.getCache('k'), 'fresh', 'older getOrCompute overwrote fresh refresh');
});

test('11. shouldCache=false prevents caching of error-like results', async () => {
  const mod = await freshModule();
  const r = await mod.getOrCompute(
    'k',
    () => Promise.resolve({ ok: false }),
    (v) => (v as { ok: boolean }).ok === true,
  );
  assert.deepEqual(r, { ok: false });
  assert.equal(mod.getCache('k'), undefined, 'uncacheable result was cached');
});

test('12. undefined result is not cached', async () => {
  const mod = await freshModule();
  let calls = 0;
  const r1 = await mod.getOrCompute('k', () => {
    calls += 1;
    return Promise.resolve(undefined as unknown as string);
  });
  assert.equal(r1, undefined);
  assert.equal(mod.getCache('k'), undefined, 'undefined was cached');

  const r2 = await mod.getOrCompute('k', () => {
    calls += 1;
    return Promise.resolve('real');
  });
  assert.equal(r2, 'real');
  assert.equal(calls, 2, 'second call did not re-run compute (undefined was cached)');
});

test('13. invalidateCache removes entry and prevents older operations from restoring it', async () => {
  const mod = await freshModule();
  await mod.getOrCompute('k', () => Promise.resolve('v'));
  assert.equal(mod.getCache('k'), 'v');

  mod.invalidateCache('k');
  assert.equal(mod.getCache('k'), undefined, 'entry still present after invalidate');

  let calls = 0;
  const r = await mod.getOrCompute('k', () => {
    calls += 1;
    return Promise.resolve('v2');
  });
  assert.equal(r, 'v2');
  assert.equal(calls, 1);
});

test('14. clearCache removes all entries and localStorage', async () => {
  const mod = await freshModule();
  await mod.getOrCompute('a', () => Promise.resolve('1'));
  await mod.getOrCompute('b', () => Promise.resolve('2'));
  assert.equal(mod.getCache('a'), '1');

  mod.clearCache();
  assert.equal(mod.getCache('a'), undefined);
  assert.equal(mod.getCache('b'), undefined);
  assert.equal(
    localStorage.getItem('pulse:yt-cache:v1'),
    null,
    'localStorage not cleared',
  );
});

test('15. corrupt localStorage is discarded without throwing', async () => {
  const ls = makeLocalStorage();
  ls.setItem('pulse:yt-cache:v1', '{not valid json');
  globalThis.localStorage = ls;
  moduleCounter += 1;
  const mod = (await import(`../src/lib/youtubeCache.ts?t=${moduleCounter}`)) as CacheModule;

  let calls = 0;
  const r = await mod.getOrCompute('k', () => {
    calls += 1;
    return Promise.resolve('fresh');
  });
  assert.equal(r, 'fresh');
  assert.equal(calls, 1, 'compute did not run despite corrupt storage');
  assert.equal(mod.getCache('k'), 'fresh');
});

test('16. LRU eviction removes least-recently-used entry under MAX_ENTRIES', async () => {
  const mod = await freshModule();
  // MAX_ENTRIES is 120; fill beyond it to trigger eviction.
  for (let i = 0; i < 125; i++) {
    await mod.getOrCompute(`k${i}`, () => Promise.resolve(i));
  }
  // k0 should be evicted (oldest), k124 should exist (newest).
  assert.equal(mod.getCache('k0'), undefined, 'oldest entry was not evicted');
  assert.equal(mod.getCache('k124'), 124);
});

test('16b. hydration enforces the entry limit before serving cached values', async () => {
  const ls = makeLocalStorage();
  const entries: Record<string, { value: number; lastUsed: number }> = {};
  for (let i = 0; i < 125; i += 1) {
    entries[`k${i}`] = { value: i, lastUsed: i };
  }
  ls.setItem('pulse:yt-cache:v1', JSON.stringify({ version: 1, entries }));
  globalThis.localStorage = ls;
  moduleCounter += 1;
  const mod = (await import(`../src/lib/youtubeCache.ts?t=${moduleCounter}`)) as CacheModule;

  assert.equal(mod.getCache('k0'), undefined, 'oldest hydrated entry was not evicted');
  assert.equal(mod.getCache('k124'), 124);
});

test('17. touch on getCache updates LRU order', async () => {
  const mod = await freshModule();
  for (let i = 0; i < 120; i++) {
    await mod.getOrCompute(`k${i}`, () => Promise.resolve(i));
  }
  // Access k0 to make it most-recently-used.
  assert.equal(mod.getCache('k0'), 0);
  // Add one more, which should evict k1 (now oldest), not k0.
  await mod.getOrCompute('k120', () => Promise.resolve(120));
  assert.equal(mod.getCache('k0'), 0, 'touched entry was evicted');
  assert.equal(mod.getCache('k1'), undefined, 'true LRU entry was not evicted');
});

test('18. persistence round-trips through localStorage', async () => {
  const ls = makeLocalStorage();
  globalThis.localStorage = ls;
  moduleCounter += 1;
  const mod1 = (await import(`../src/lib/youtubeCache.ts?t=${moduleCounter}`)) as CacheModule;
  await mod1.getOrCompute('persist', () => Promise.resolve('value1'));

  // Fresh module reads from same localStorage.
  moduleCounter += 1;
  const mod2 = (await import(`../src/lib/youtubeCache.ts?t=${moduleCounter}`)) as CacheModule;
  let calls = 0;
  const r = await mod2.getOrCompute('persist', () => {
    calls += 1;
    return Promise.resolve('should-not-run');
  });
  assert.equal(r, 'value1');
  assert.equal(calls, 0, 'hydrated module re-ran compute for cached key');
});

test('19. equivalent search reuses cache — no duplicate compute on repeated calls', async () => {
  const mod = await freshModule();
  let calls = 0;
  const compute = () => {
    calls += 1;
    return Promise.resolve({ songs: [], error: null });
  };

  await mod.getOrCompute('search:q=rock:max=10', compute, (r) => r.error === null);
  await mod.getOrCompute('search:q=rock:max=10', compute, (r) => r.error === null);
  await mod.getOrCompute('search:q=rock:max=10', compute, (r) => r.error === null);
  assert.equal(calls, 1, 'repeated identical keys triggered more than one compute');
});

test('20. error results are not cached and allow retry', async () => {
  const mod = await freshModule();
  let calls = 0;
  await mod.getOrCompute(
    'errkey',
    () => {
      calls += 1;
      return Promise.resolve({ data: null, error: 'API down' });
    },
    (r) => (r as { error: string | null }).error === null,
  );
  assert.equal(calls, 1);
  assert.equal(mod.getCache('errkey'), undefined, 'error result was cached');

  // Retry should call compute again.
  const r = await mod.getOrCompute(
    'errkey',
    () => {
      calls += 1;
      return Promise.resolve({ data: 'ok', error: null });
    },
    (v) => (v as { error: string | null }).error === null,
  );
  assert.equal(calls, 2);
  assert.deepEqual(r, { data: 'ok', error: null });
});

test('21. clearCache advances generations so stale inflight cannot write after clear', async () => {
  const mod = await freshModule();
  const goc = deferred<string>();
  const pGoc = mod.getOrCompute('k', () => goc.promise);

  mod.clearCache();

  // Now a fresh getOrCompute fills the cache.
  await mod.getOrCompute('k', () => Promise.resolve('fresh-after-clear'));

  // The old inflight resolves with 'stale' — must not overwrite.
  goc.resolve('stale');
  await pGoc;

  assert.equal(
    mod.getCache('k'),
    'fresh-after-clear',
    'stale inflight wrote after clearCache',
  );
});
