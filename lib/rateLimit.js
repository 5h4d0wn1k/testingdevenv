// In-memory rate limiting storage
const rateLimitStore = new Map();

// Cleanup interval (run every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    // Remove timestamps older than the longest window (assume 1 hour max)
    data.timestamps = data.timestamps.filter(ts => now - ts < 60 * 60 * 1000);
    if (data.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // 5 minutes

/**
 * Rate limiting function
 * @param {Request} request - The Next.js request object
 * @param {number} maxRequests - Maximum requests allowed in the window
 * @param {number} windowMs - Window size in milliseconds
 * @returns {Response|null} - Returns 429 response if limited, null if ok
 */
export async function rateLimit(request, maxRequests, windowMs) {
  const now = Date.now();

  // Get user identifier: Clerk userId if authenticated, else IP
  let identifier;
  try {
    const { getAuth } = await import('@clerk/nextjs/server');
    const { userId } = getAuth(request);
    if (userId) {
      identifier = userId;
    } else {
      // Fallback to IP - handle both Headers instance and plain object
      const headers = request?.headers;
      if (headers) {
        identifier = (headers.get ? headers.get('x-forwarded-for') : headers['x-forwarded-for']) ||
                     (headers.get ? headers.get('x-real-ip') : headers['x-real-ip']) ||
                     request.ip ||
                     'unknown';
      } else {
        identifier = request?.ip || 'unknown';
      }
    }
  } catch (error) {
    // Fallback to IP if Clerk fails - handle both Headers instance and plain object
    const headers = request?.headers;
    if (headers) {
      identifier = (headers.get ? headers.get('x-forwarded-for') : headers['x-forwarded-for']) ||
                   (headers.get ? headers.get('x-real-ip') : headers['x-real-ip']) ||
                   request.ip ||
                   'unknown';
    } else {
      identifier = request?.ip || 'unknown';
    }
  }

  if (!rateLimitStore.has(identifier)) {
    rateLimitStore.set(identifier, { timestamps: [] });
  }

  const data = rateLimitStore.get(identifier);
  const { timestamps } = data;

  // Remove old timestamps outside the window
  while (timestamps.length > 0 && now - timestamps[0] > windowMs) {
    timestamps.shift();
  }

  if (timestamps.length >= maxRequests) {
    // Calculate retry-after in seconds
    const oldestTimestamp = timestamps[0];
    const resetTime = oldestTimestamp + windowMs;
    const retryAfter = Math.ceil((resetTime - now) / 1000);

    const remaining = 0;

    return new Response(JSON.stringify({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
      },
    });
  }

  // Add current timestamp
  timestamps.push(now);

  return null; // Proceed
}