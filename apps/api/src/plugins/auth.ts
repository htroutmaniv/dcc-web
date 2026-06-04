import type { FastifyInstance, FastifyRequest } from 'fastify';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
  interface FastifyRequest {
    userId?: string;
  }
}

export async function registerAuth(app: FastifyInstance) {
  app.decorate(
    'authenticate',
    async function authenticate(request: FastifyRequest) {
      try {
        const payload = await request.jwtVerify<{ sub: string }>();
        request.userId = payload.sub;
      } catch {
        throw app.httpErrors.unauthorized('Authentication required');
      }
    },
  );
}
