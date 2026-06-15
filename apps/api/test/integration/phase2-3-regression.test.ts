import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import {
  buildTestApp,
  closeTestApp,
  devLogin,
  shouldRunIntegrationTests,
  injectAuth,
  resetGameData,
} from '../helpers/test-app.js';
import { planMapTokenSync } from '../../src/services/map-service.js';

describe.skipIf(!shouldRunIntegrationTests())('Phase 2–3 regression (integration)', () => {
  beforeAll(async () => {
    await buildTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  beforeEach(async () => {
    await resetGameData();
  });

  test('requireMember rejects non-member on GET /games/:gameId/maps', async () => {
    const app = await buildTestApp();
    const dm = await devLogin(app, 'dm');
    const outsider = await devLogin(app, 'player');

    const created = await injectAuth(app, dm.cookie, {
      method: 'POST',
      url: '/games',
      payload: { title: 'Private table' },
    });
    const { game } = created.json() as { game: { id: string } };

    const res = await injectAuth(app, outsider.cookie, {
      method: 'GET',
      url: `/games/${game.id}/maps`,
    });
    expect(res.statusCode).toBe(403);
  });

  test('POST sync-tokens batches token create/update/delete', async () => {
    const app = await buildTestApp();
    const dm = await devLogin(app, 'dm');

    const created = await injectAuth(app, dm.cookie, {
      method: 'POST',
      url: '/games',
      payload: { title: 'Map sync table' },
    });
    const { game } = created.json() as { game: { id: string } };

    const mapsRes = await injectAuth(app, dm.cookie, {
      method: 'GET',
      url: `/games/${game.id}/maps`,
    });
    const { maps } = mapsRes.json() as { maps: { id: string }[] };
    const mapId = maps[0]!.id;

    await injectAuth(app, dm.cookie, {
      method: 'POST',
      url: `/games/${game.id}/characters`,
      payload: { mode: 'manual', name: 'Token PC', level: 1, className: 'Warrior' },
    });

    const sync = await injectAuth(app, dm.cookie, {
      method: 'POST',
      url: `/games/${game.id}/maps/${mapId}/sync-tokens`,
    });
    expect(sync.statusCode).toBe(200);
    const { map } = sync.json() as { map: { tokens: { kind: string; label: string }[] } };
    expect(map.tokens.some((t) => t.kind === 'pc' && t.label === 'Token PC')).toBe(true);
  });

  test('planMapTokenSync creates token for alive visible PC', () => {
    const mapId = '33333333-3333-4333-8333-333333333333';
    const plan = planMapTokenSync(
      mapId,
      [{ id: 'c1', status: 'alive', name: 'Alive', stats: {} }],
      [],
      [],
    );
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toCreate[0]?.characterId).toBe('c1');
  });
});
