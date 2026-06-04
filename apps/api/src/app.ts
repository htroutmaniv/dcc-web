import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import sensible from '@fastify/sensible';
import { config } from './lib/config.js';
import { registerAuth } from './plugins/auth.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { gameRoutes } from './routes/games.js';
import { characterRoutes } from './routes/characters.js';
import { diceRoutes } from './routes/dice.js';
import { mapRoutes } from './routes/maps.js';

declare module 'fastify' {
  interface FastifyInstance {
    io: import('socket.io').Server | null;
  }
}

export async function buildApp() {
  const app = Fastify({ logger: true });
  app.decorate('io', null);

  await app.register(sensible);
  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });
  await app.register(cookie);
  await app.register(jwt, {
    secret: config.jwtSecret,
    cookie: {
      cookieName: config.sessionCookieName,
      signed: false,
    },
  });
  await registerAuth(app);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(gameRoutes);
  await app.register(characterRoutes);
  await app.register(diceRoutes);
  await app.register(mapRoutes);

  return app;
}
