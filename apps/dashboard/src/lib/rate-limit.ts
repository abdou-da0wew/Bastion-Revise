interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, 300000);

export async function checkRateLimit(params: {
  key: string;
  max: number;
  windowMs: number;
}): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const entry = store.get(params.key);

  if (!entry || entry.resetAt <= now) {
    store.set(params.key, {
      count: 1,
      resetAt: now + params.windowMs,
    });
    return { allowed: true, remaining: params.max - 1, resetAt: now + params.windowMs };
  }

  if (entry.count >= params.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: params.max - entry.count,
    resetAt: entry.resetAt,
  };
}

export function getRateLimitHeaders(key: string): {
  remaining: number;
  resetAt: number;
} {
  const entry = store.get(key);
  if (!entry || entry.resetAt <= Date.now()) {
    return { remaining: 0, resetAt: Date.now() };
  }
  return {
    remaining: Math.max(0, entry.count ? entry.count : 0),
    resetAt: entry.resetAt,
  };
}
