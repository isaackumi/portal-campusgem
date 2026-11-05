/**
 * Tiny in-memory fixed-window rate limiter for public endpoints (per server instance).
 * Not a security boundary on its own: the 128-bit token is. It just stops one client
 * hammering the database.
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 5000 }: { limit: number; windowMs: number; maxKeys?: number }) {
  const hits = new Map<string, { start: number; count: number }>()
  return {
    /** Records a hit; returns false when the key is over its limit for this window. */
    allow(key: string, now = Date.now()): boolean {
      const entry = hits.get(key)
      if (!entry || now - entry.start >= windowMs) {
        if (hits.size >= maxKeys) {
          for (const [k, e] of Array.from(hits)) if (now - e.start >= windowMs) hits.delete(k)
          if (hits.size >= maxKeys) hits.clear()
        }
        hits.set(key, { start: now, count: 1 })
        return true
      }
      entry.count++
      return entry.count <= limit
    },
  }
}
