import type { FastifyRequest, FastifyReply } from 'fastify';

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = request.ip;
    const now = Date.now();
    const entry = requestCounts.get(key);

    if (!entry || now > entry.resetAt) {
      requestCounts.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    entry.count++;
    if (entry.count > maxRequests) {
      reply.status(429).send({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }
  };
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestCounts) {
    if (now > entry.resetAt) requestCounts.delete(key);
  }
}, 5 * 60 * 1000);
