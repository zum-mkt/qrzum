type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

/**
 * Returns true if the request is allowed, false if rate limited.
 * Key: any string (e.g. "pin:<ip>", "scanai:<ip>").
 * max: max requests allowed in the window.
 * windowMs: sliding window in milliseconds.
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    // Prune stale entries to prevent unbounded growth
    if (store.size > 20_000) {
      for (const [k, v] of store) {
        if (now >= v.resetAt) store.delete(k);
      }
    }
    return true;
  }

  if (entry.count >= max) return false;
  entry.count++;
  return true;
}
