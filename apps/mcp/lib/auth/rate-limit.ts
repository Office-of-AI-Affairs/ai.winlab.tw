// In-memory, single-instance sliding-window rate limiter.
//
// IMPORTANT: Vercel serverless functions (and Fluid compute) can run many
// concurrent instances behind the same deployment, and each instance has its
// own process memory — this counter is NOT shared across instances. This is
// a best-effort first line of defense against obvious credential-stuffing /
// brute-force bursts hitting a single warm instance, not a strong guarantee
// across the whole deployment. A durable, cross-instance limiter (backed by
// Supabase/Upstash/etc.) is a follow-up if attacks persist past this.
interface WindowEntry {
  count: number;
  resetAt: number;
}

// Safety net against unbounded Map growth if an attacker cycles through many
// unique keys (e.g. many emails) faster than entries naturally expire.
const MAX_TRACKED_ENTRIES = 5000;

export interface RateLimiter {
  /** True if `key` has already hit the limit for the current window. */
  isLimited(key: string, now?: number): boolean;
  /** Record a failed attempt for `key`. Only call this on failure. */
  recordFailure(key: string, now?: number): void;
  /** Clear all tracked failures for `key` (e.g. on successful login). */
  reset(key: string): void;
  /** Seconds remaining until `key`'s window resets, or 0 if not tracked. */
  retryAfterSeconds(key: string, now?: number): number;
}

export function createRateLimiter(windowMs: number, maxAttempts: number): RateLimiter {
  const store = new Map<string, WindowEntry>();

  function prune(now: number) {
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }

    if (store.size > MAX_TRACKED_ENTRIES) {
      const oldestFirst = [...store.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
      const overflow = store.size - MAX_TRACKED_ENTRIES;
      for (const [key] of oldestFirst.slice(0, overflow)) store.delete(key);
    }
  }

  return {
    isLimited(key, now = Date.now()) {
      prune(now);
      const entry = store.get(key);
      if (!entry || entry.resetAt <= now) return false;
      return entry.count >= maxAttempts;
    },
    recordFailure(key, now = Date.now()) {
      prune(now);
      const entry = store.get(key);
      if (!entry || entry.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return;
      }
      entry.count += 1;
    },
    reset(key) {
      store.delete(key);
    },
    retryAfterSeconds(key, now = Date.now()) {
      const entry = store.get(key);
      if (!entry) return 0;
      return Math.max(0, Math.ceil((entry.resetAt - now) / 1000));
    },
  };
}

/** Extract the caller's IP from proxy headers, falling back to "unknown". */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwardedFor) return forwardedFor;

  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
