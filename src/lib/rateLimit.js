/**
 * @file src/lib/rateLimit.js
 * In-memory sliding-window rate limiter for sensitive public APIs.
 * Supports configurable windowMs and maxRequests per IP.
 */

const ipRequestMap = new Map();

// Periodic cleanup every 5 minutes to avoid memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipRequestMap.entries()) {
      if (now - record.resetTime > 60000) {
        ipRequestMap.delete(key);
      }
    }
  }, 300000);
}

/**
 * Check if a client IP has exceeded the rate limit.
 *
 * @param {string} ip - Client IP identifier
 * @param {object} options - Rate limit config
 * @param {number} options.limit - Max allowed requests within window (default: 20)
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 min)
 * @returns {{ allowed: boolean, remaining: number, resetInSeconds: number }}
 */
export function checkRateLimit(ip = 'anonymous', { limit = 20, windowMs = 60000 } = {}) {
  const now = Date.now();
  const safeIp = String(ip || 'anonymous').trim();
  const record = ipRequestMap.get(safeIp) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    ipRequestMap.set(safeIp, record);
    return {
      allowed: true,
      remaining: limit - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  record.count += 1;
  ipRequestMap.set(safeIp, record);

  const isAllowed = record.count <= limit;
  const remaining = Math.max(0, limit - record.count);
  const resetInSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));

  return {
    allowed: isAllowed,
    remaining,
    resetInSeconds,
  };
}
