/**
 * LRU cache for YouTube API results.
 *
 * Lookup order: in-memory -> localStorage -> compute (network).
 * No TTL: entries remain until evicted by LRU, cleared, or refreshed.
 *
 * Limits (conservative, documented):
 * - MAX_ENTRIES = 120  — enough for ~120 distinct queries/pages
 * - MAX_BYTES   = 1_500_000 (~1.5 MB) — well under typical 5 MB localStorage quota,
 *   leaving room for auth, favorites, playlists and other app data.
 *
 * Storage: a single namespaced key `STORAGE_KEY`. Only this key is read/written;
 * no other localStorage entries are ever touched.
 *
 * Format: versioned JSON `{ version, entries: { [key]: { value, lastUsed } } }`.
 * Invalid JSON, wrong version, or malformed entries are discarded silently
 * without affecting the rest of the cache or other storage.
 *
 * In-flight dedup: identical concurrent compute() calls for the same key share
 * a single Promise. Rejected promises are NOT cached.
 */

const STORAGE_KEY = 'pulse:yt-cache:v1';
const CACHE_VERSION = 1;
const MAX_ENTRIES = 120;
const MAX_BYTES = 1_500_000;

interface StoredEntry {
  value: unknown;
  lastUsed: number;
}

interface StoredCache {
  version: number;
  entries: Record<string, StoredEntry>;
}

// In-memory store, ordered by insertion (Map preserves insertion order).
// Accessing a key re-inserts it to move it to the end (most recently used).
const memory = new Map<string, StoredEntry>();
// In-flight compute promises, for deduplication of identical concurrent requests.
const inflight = new Map<string, Promise<unknown>>();

// Tracks the latest operation allowed to write each cache key.
const generations = new Map<string, number>();

function getGeneration(key: string): number {
  return generations.get(key) ?? 0;
}

function advanceGeneration(key: string): number {
  const next = getGeneration(key) + 1;
  generations.set(key, next);
  return next;
}

let memoryHydrated = false;

function hydrateFromStorage(): void {
  if (memoryHydrated) return;
  memoryHydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as StoredCache;
    if (!parsed || typeof parsed !== 'object') return;
    if (parsed.version !== CACHE_VERSION) return;
    const entries = parsed.entries;
    if (!entries || typeof entries !== 'object') return;

    // Sort by lastUsed ascending so the Map insertion order reflects LRU.
    const valid: { key: string; entry: StoredEntry }[] = [];
    for (const [key, entry] of Object.entries(entries)) {
      if (
        entry &&
        typeof entry === 'object' &&
        typeof entry.lastUsed === 'number' &&
        'value' in entry
      ) {
        valid.push({ key, entry });
      }
    }
    valid.sort((a, b) => a.entry.lastUsed - b.entry.lastUsed);
    for (const { key, entry } of valid) {
      memory.set(key, entry);
    }
  } catch {
    // Corrupt or unreadable cache — start empty. Do not touch other keys.
  }
}

function touch(key: string, entry: StoredEntry): void {
  // Re-insert to move to end (most recently used).
  memory.delete(key);
  memory.set(key, { ...entry, lastUsed: Date.now() });
}

function serializeCache(): string {
  const entries: Record<string, StoredEntry> = {};
  for (const [key, entry] of memory.entries()) {
    entries[key] = entry;
  }
  return JSON.stringify({ version: CACHE_VERSION, entries } satisfies StoredCache);
}

function approxByteSize(json: string): number {
  try {
    return new Blob([json]).size;
  } catch {
    // Blob unavailable — approximate with UTF-8 byte length.
    return json.length * 2;
  }
}

/** Evict least-recently-used entries until both count and byte limits are satisfied. */
function evictToFit(extraBytes = 0): void {
  while (memory.size >= MAX_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
  }

  let size = approxByteSize(serializeCache()) + extraBytes;
  while (size > MAX_BYTES && memory.size > 0) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
    size = approxByteSize(serializeCache());
  }
}

function persist(): void {
  evictToFit();
  const json = serializeCache();
  try {
    localStorage.setItem(STORAGE_KEY, json);
    return;
  } catch {
    // Quota exceeded — evict ~25% of LRU entries and retry once.
  }

  const evictCount = Math.max(1, Math.ceil(memory.size / 4));
  for (let i = 0; i < evictCount && memory.size > 0; i += 1) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
  }
  const retried = serializeCache();
  try {
    localStorage.setItem(STORAGE_KEY, retried);
  } catch {
    // Still failing — keep in-memory copy and continue. Search still works.
  }
}

/** Read a cached value, updating LRU order. Returns undefined on miss. */
export function getCache<T>(key: string): T | undefined {
  hydrateFromStorage();
  const entry = memory.get(key);
  if (entry === undefined) return undefined;
  touch(key, entry);
  return entry.value as T;
}

/** Store a value and persist. Does not cache rejected/undefined-by-design values. */
export function setCache<T>(key: string, value: T): void {
  hydrateFromStorage();
  const entry: StoredEntry = { value, lastUsed: Date.now() };
  memory.delete(key);
  memory.set(key, entry);
  persist();
}

/**
 * Return a cached value if present, otherwise call `compute`, cache the result,
 * and return it. Identical concurrent calls share the same in-flight Promise.
 * Rejections are NOT cached. If `shouldCache` is provided, only results for
 * which it returns true are cached (e.g. to avoid caching API error payloads).
 */
export function getOrCompute<T>(
  key: string,
  compute: () => Promise<T>,
  shouldCache?: (result: T) => boolean,
): Promise<T> {
  const cached = getCache<T>(key);
  if (cached !== undefined) {
    return Promise.resolve(cached);
  }

  const existing = inflight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const generation = getGeneration(key);

  let promise: Promise<T>;

  promise = compute()
    .then((result) => {
      if (
        generation === getGeneration(key) &&
        result !== undefined &&
        (!shouldCache || shouldCache(result))
      ) {
        setCache(key, result);
      }

      return result;
    })
    .finally(() => {
      if (inflight.get(key) === promise) {
        inflight.delete(key);
      }
    });

  inflight.set(key, promise);
  return promise;
}

/**
 * Force a fresh computation, ignoring the cached value.
 * A refresh supersedes older operations for the same key.
 * Failed refreshes preserve the existing cached value.
 */
export function refreshCache<T>(
  key: string,
  compute: () => Promise<T>,
  shouldCache?: (result: T) => boolean,
): Promise<T> {
  const generation = advanceGeneration(key);

  let promise: Promise<T>;

  promise = Promise.resolve()
    .then(compute)
    .then((result) => {
      if (
        generation === getGeneration(key) &&
        result !== undefined &&
        (!shouldCache || shouldCache(result))
      ) {
        setCache(key, result);
      }

      return result;
    })
    .finally(() => {
      if (inflight.get(key) === promise) {
        inflight.delete(key);
      }
    });

  inflight.set(key, promise);
  return promise;
}

/** Remove a single entry and prevents older operations from restoring it. */
export function invalidateCache(key: string): void {
  hydrateFromStorage();
  advanceGeneration(key);
  memory.delete(key);
  inflight.delete(key);
  persist();
}

/** Remove all entries belonging to this cache only. */
export function clearCache(): void {
  for (const key of memory.keys()) {
    advanceGeneration(key);
  }

  memory.clear();
  inflight.clear();

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}