import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import { config } from './lib/config.js';
import { MAX_MAP_IMAGE_BYTES } from './lib/map-image-upload.js';
import { registerAuth } from './plugins/auth.js';
import { registerGameAccess } from './plugins/game-access.js';
import { createRouteRateLimits, registerRateLimit } from './plugins/rate-limit.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { gameRoutes } from './routes/games.js';
import { characterRoutes } from './routes/characters.js';
import { diceRoutes } from './routes/dice.js';
import { mapRoutes } from './routes/maps.js';
import { itemRoutes } from './routes/items.js';
import { initiativeRoutes } from './routes/initiative.js';
import { monsterRoutes } from './routes/monsters.js';
import { ensureOccupationsLoaded } from './services/occupation-service.js';
import { ensureCharacterNamesLoaded } from './services/name-service.js';

declare module 'fastify' {
  interface FastifyInstance {
    io: import('socket.io').Server | null;
    routeRateLimits: ReturnType<typeof import('./plugins/rate-limit.js').createRouteRateLimits>;
  }
}

export async function buildApp() {
  const app = Fastify({ logger: true });
  app.decorate('io', null);

  await app.register(sensible);
  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });
  await app.register(cookie);
  await app.register(multipart, {
    limits: { fileSize: MAX_MAP_IMAGE_BYTES, files: 1 },
  });
  await app.register(jwt, {
    secret: config.jwtSecret,
    cookie: {
      cookieName: config.sessionCookieName,
      signed: false,
    },
  });
  await registerRateLimit(app);
  app.decorate('routeRateLimits', createRouteRateLimits(app));
  await registerAuth(app);
  await registerGameAccess(app);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(gameRoutes);
  await app.register(characterRoutes);
  await app.register(diceRoutes);
  await app.register(mapRoutes);
  await app.register(itemRoutes);
  await app.register(initiativeRoutes);
  await app.register(monsterRoutes);

  await ensureOccupationsLoaded();
  await ensureCharacterNamesLoaded();

  return app;
}
