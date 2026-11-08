/**
 * Agronomy AI — High Performance In-Memory Client API Cache
 * Eliminates redundant network requests when switching between navigation tabs.
 * Provides instant page rendering with background stale-while-revalidate capability.
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

const memoryCache = new Map<string, CacheEntry<any>>()

/**
 * Retrieve cached data if valid
 */
export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key)
  if (!entry) return null

  // If expired, return null (stale entry)
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key)
    return null
  }

  return entry.data as T
}

/**
 * Retrieve cached data even if expired (for optimistic stale-while-revalidate rendering)
 */
export function getStaleWhileRevalidate<T>(key: string): { data: T | null; isStale: boolean } {
  const entry = memoryCache.get(key)
  if (!entry) return { data: null, isStale: true }

  const isStale = Date.now() > entry.expiresAt
  return { data: entry.data as T, isStale }
}

/**
 * Store data in client cache with TTL (Time To Live in milliseconds)
 */
export function setCached<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttlMs,
  })
}

/**
 * Invalidate specific cache key or all cache
 */
export function invalidateCache(key?: string): void {
  if (key) {
    memoryCache.delete(key)
  } else {
    memoryCache.clear()
  }
}
