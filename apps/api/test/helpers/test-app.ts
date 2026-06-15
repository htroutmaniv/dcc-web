process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://dcc:dcc@localhost:5432/dcc';

import '../../src/load-env.js';

import type { InjectOptions, LightMyRequestResponse } from 'light-my-request';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { config } from '../../src/lib/config.js';
import { prisma } from '../../src/lib/prisma.js';

let sharedApp: FastifyInstance | null = null;

export async function buildTestApp(): Promise<FastifyInstance> {
  if (sharedApp) return sharedApp;
  const app = await buildApp();
  await app.ready();
  sharedApp = app;
  return app;
}

export async function closeTestApp(): Promise<void> {
  if (sharedApp) {
    await sharedApp.close();
    sharedApp = null;
  }
  await prisma.$disconnect();
}

export function sessionCookieHeader(setCookie: string | string[] | undefined): string {
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!raw) throw new Error('Expected Set-Cookie header');
  return raw.split(';')[0]!;
}

export async function devLogin(
  app: FastifyInstance,
  account: 'dm' | 'player',
): Promise<{ userId: string; cookie: string }> {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/dev-login',
    payload: { account },
  });
  if (res.statusCode !== 200) {
    throw new Error(`dev-login failed: ${res.statusCode} ${res.body}`);
  }
  const body = res.json() as { user: { id: string } };
  return {
    userId: body.user.id,
    cookie: sessionCookieHeader(res.headers['set-cookie']),
  };
}

export async function injectAuth(
  app: FastifyInstance,
  cookie: string,
  options: InjectOptions,
): Promise<LightMyRequestResponse> {
  const headers = { ...(options.headers ?? {}), cookie };
  return app.inject({ ...options, headers });
}

export async function resetGameData(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      movement_requests,
      dice_rolls,
      map_tokens,
      game_maps,
      character_items,
      characters,
      game_monsters,
      monster_items,
      game_initiative,
      game_players,
      games
    RESTART IDENTITY CASCADE
  `);
}

export function shouldRunIntegrationTests(): boolean {
  return (
    process.env.CI === 'true' ||
    process.env.GITHUB_ACTIONS === 'true' ||
    process.env.RUN_INTEGRATION_TESTS === '1'
  );
}

export { config };
