import type { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ success: false, error: 'Unauthorized' });
  }
}

// Type augmentation for JWT payload
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string; tier: string };
    user: { sub: string; email: string; tier: string };
  }
}
