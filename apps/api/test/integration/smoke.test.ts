import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import type { FastifyInstance } from 'fastify';
import {
  buildTestApp,
  closeTestApp,
  devLogin,
  shouldRunIntegrationTests,
  injectAuth,
  resetGameData,
} from '../helpers/test-app.js';

/** Level-0 random characters match production funnel flow and include starting gear. */
async function createRandomPc(
  app: FastifyInstance,
  cookie: string,
  gameId: string,
) {
  const res = await injectAuth(app, cookie, {
    method: 'POST',
    url: `/games/${gameId}/characters`,
    payload: { mode: 'random', level: 0 },
  });
  expect(res.statusCode).toBe(200);
  return res.json() as {
    character: { id: string; name: string; items: { id: string }[] };
  };
}

describe.skipIf(!shouldRunIntegrationTests())('API integration smoke', () => {
  beforeAll(async () => {
    await buildTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  beforeEach(async () => {
    await resetGameData();
  });

  test('POST /auth/dev-login + GET /auth/me round-trip', async () => {
    const app = await buildTestApp();
    const { cookie, userId } = await devLogin(app, 'dm');

    const me = await injectAuth(app, cookie, { method: 'GET', url: '/auth/me' });
    expect(me.statusCode).toBe(200);
    const body = me.json() as { user: { id: string } };
    expect(body.user.id).toBe(userId);
  });

  test('POST /games then POST /games/join/:invite as second user', async () => {
    const app = await buildTestApp();
    const dm = await devLogin(app, 'dm');
    const player = await devLogin(app, 'player');

    const created = await injectAuth(app, dm.cookie, {
      method: 'POST',
      url: '/games',
      payload: { title: 'Test table' },
    });
    expect(created.statusCode).toBe(200);
    const { game } = created.json() as { game: { id: string; inviteCode: string } };

    const joined = await injectAuth(app, player.cookie, {
      method: 'POST',
      url: `/games/join/${game.inviteCode}`,
    });
    expect(joined.statusCode).toBe(200);
    const joinBody = joined.json() as { role: string; game: { id: string } };
    expect(joinBody.role).toBe('player');
    expect(joinBody.game.id).toBe(game.id);
  });

  test('PATCH /characters/:id with status dead reconciles initiative and syncs map', async () => {
    const app = await buildTestApp();
    const dm = await devLogin(app, 'dm');

    const created = await injectAuth(app, dm.cookie, {
      method: 'POST',
      url: '/games',
      payload: { title: 'Combat table' },
    });
    expect(created.statusCode).toBe(200);
    const { game } = created.json() as { game: { id: string } };

    const { character } = await createRandomPc(app, dm.cookie, game.id);

    const start = await injectAuth(app, dm.cookie, {
      method: 'POST',
      url: `/games/${game.id}/initiative/start`,
    });
    expect(start.statusCode).toBe(200);
    const started = start.json() as { initiative: { active: boolean; order: { characterId?: string }[] } };
    expect(started.initiative.active).toBe(true);
    expect(started.initiative.order.some((e) => e.characterId === character.id)).toBe(true);

    const mapsBefore = await injectAuth(app, dm.cookie, {
      method: 'GET',
      url: `/games/${game.id}/maps`,
    });
    expect(mapsBefore.statusCode).toBe(200);
    const { maps: mapsBeforeList } = mapsBefore.json() as { maps: { tokens: { characterId: string | null }[] }[] };
    const tokenCountBefore = mapsBeforeList.flatMap((m) => m.tokens).filter((t) => t.characterId === character.id).length;
    expect(tokenCountBefore).toBeGreaterThan(0);

    const patch = await injectAuth(app, dm.cookie, {
      method: 'PATCH',
      url: `/characters/${character.id}`,
      payload: { status: 'dead' },
    });
    expect(patch.statusCode).toBe(200);

    const initiative = await injectAuth(app, dm.cookie, {
      method: 'GET',
      url: `/games/${game.id}/initiative`,
    });
    expect(initiative.statusCode).toBe(200);
    const initBody = initiative.json() as { initiative: { active: boolean } | null };
    expect(initBody.initiative?.active).toBe(true);

    const mapsAfter = await injectAuth(app, dm.cookie, {
      method: 'GET',
      url: `/games/${game.id}/maps`,
    });
    expect(mapsAfter.statusCode).toBe(200);
    const { maps: mapsAfterList } = mapsAfter.json() as { maps: { tokens: { characterId: string | null; isDead: boolean }[] }[] };
    const deadToken = mapsAfterList.flatMap((m) => m.tokens).find((t) => t.characterId === character.id);
    expect(deadToken).toBeDefined();
    expect(deadToken!.isDead).toBe(true);
  });

  test('POST /games/:id/transfer-item rejects player-to-player while initiative active', async () => {
    const app = await buildTestApp();
    const dm = await devLogin(app, 'dm');
    const player = await devLogin(app, 'player');

    const created = await injectAuth(app, dm.cookie, {
      method: 'POST',
      url: '/games',
      payload: { title: 'Loot table' },
    });
    expect(created.statusCode).toBe(200);
    const { game } = created.json() as { game: { inviteCode: string; id: string } };

    const joined = await injectAuth(app, player.cookie, {
      method: 'POST',
      url: `/games/join/${game.inviteCode}`,
    });
    expect(joined.statusCode).toBe(200);

    const a = await createRandomPc(app, player.cookie, game.id);
    const b = await createRandomPc(app, player.cookie, game.id);
    expect(a.character.items.length).toBeGreaterThan(0);

    const start = await injectAuth(app, dm.cookie, {
      method: 'POST',
      url: `/games/${game.id}/initiative/start`,
    });
    expect(start.statusCode).toBe(200);

    const transfer = await injectAuth(app, player.cookie, {
      method: 'POST',
      url: `/games/${game.id}/transfer-item`,
      payload: {
        sourceType: 'character',
        sourceId: a.character.id,
        sourceItemId: a.character.items[0]!.id,
        targetType: 'character',
        targetId: b.character.id,
        quantity: 1,
      },
    });
    expect(transfer.statusCode).toBe(400);
    expect(transfer.body).toContain('combat ends');
  });

  test('POST /games/:id/initiative/start + /advance cycles round', async () => {
    const app = await buildTestApp();
    const dm = await devLogin(app, 'dm');

    const created = await injectAuth(app, dm.cookie, {
      method: 'POST',
      url: '/games',
      payload: { title: 'Round table' },
    });
    expect(created.statusCode).toBe(200);
    const { game } = created.json() as { game: { id: string } };

    await createRandomPc(app, dm.cookie, game.id);

    const start = await injectAuth(app, dm.cookie, {
      method: 'POST',
      url: `/games/${game.id}/initiative/start`,
    });
    expect(start.statusCode).toBe(200);
    const started = start.json() as { initiative: { round: number; turnIndex: number; order: unknown[] } };
    expect(started.initiative.order.length).toBeGreaterThan(0);

    const entryCount = started.initiative.order.length;
    let round = started.initiative.round;

    for (let i = 0; i < entryCount; i += 1) {
      const adv = await injectAuth(app, dm.cookie, {
        method: 'POST',
        url: `/games/${game.id}/initiative/advance`,
      });
      expect(adv.statusCode).toBe(200);
      const body = adv.json() as { initiative: { round: number } };
      round = body.initiative.round;
    }

    expect(round).toBeGreaterThan(started.initiative.round);
  });
});
