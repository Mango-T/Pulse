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

test('1. two simultaneous getOrCompute with same key run compute exactly once', async () => {
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

test('7b. concurrency: stale getOrCompute can overwrite a fresh refreshCache result (out-of-order write)', async () => {
  const mod = await freshModule();
  const goc = deferred<string>();

  const pGoc = mod.getOrCompute('k', () => goc.promise);

  // refresh resolves first and writes 'fresh'.
  const refVal = await mod.refreshCache('k', () => Promise.resolve('fresh'));
  assert.equal(refVal, 'fresh');
  assert.equal(mod.getCache('k'), 'fresh');

  // The older getOrCompute compute resolves later and writes 'stale',
  // overwriting the fresh value.
  goc.resolve('stale');
  await pGoc;

  assert.equal(
    mod.getCache('k'),
    'stale',
    'CONFIRMED BUG: stale getOrCompute result overwrote fresh refreshCache result',
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

test('10. refreshCache does NOT register or clear inflight — duplicate compute confirmed by structure', async () => {
  // Inspection-driven: refreshCache never touches the inflight map, so a
  // concurrent getOrCompute cannot be shared with it. This test confirms the
  // observable consequence (already covered in 7a) and documents that there is
  // no inflight coordination on the refresh path.
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
});
