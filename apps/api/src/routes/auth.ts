import type { FastifyInstance, FastifyRequest } from 'fastify';
import { randomBytes } from 'node:crypto';
import { config } from '../lib/config.js';
import { prisma } from '../lib/prisma.js';

const DISCORD_API = 'https://discord.com/api/v10';

export const DEV_AUTH_ACCOUNTS = {
  dm: { email: 'dev-dm@localhost', displayName: 'Dev DM' },
  player: { email: 'dev-player@localhost', displayName: 'Dev Player' },
} as const;

export type DevAuthAccount = keyof typeof DEV_AUTH_ACCOUNTS;

/** Origin for redirects (preserves port, e.g. localhost:8080). */
function requestOrigin(request: FastifyRequest): string {
  const proto =
    (request.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] ??
    'http';
  const host =
    (request.headers['x-forwarded-host'] as string | undefined) ??
    request.headers.host ??
    'localhost';
  return `${proto}://${host}`;
}

export async function authRoutes(app: FastifyInstance) {
  /**
   * Dev login — two fixed accounts (DM vs player) for local testing.
   * Body: { account: "dm" | "player", displayName?: string }
   */
  app.post('/auth/dev-login', async (request, reply) => {
    if (!config.enableDevLogin) {
      return reply.status(403).send({ error: 'Dev login is disabled' });
    }
    const body = request.body as { account?: string; displayName?: string };
    const account: DevAuthAccount = body?.account === 'dm' ? 'dm' : 'player';
    const preset = DEV_AUTH_ACCOUNTS[account];
    const displayName = body?.displayName?.trim() || preset.displayName;
    const user = await prisma.user.upsert({
      where: { email: preset.email },
      create: { email: preset.email, displayName },
      update: { displayName },
    });
    const token = app.jwt.sign({ sub: user.id }, { expiresIn: '7d' });
    reply.setCookie(config.sessionCookieName, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });
    return {
      user: { id: user.id, displayName: user.displayName, email: preset.email },
      account,
    };
  });

  app.get('/auth/me', { onRequest: [app.authenticate] }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.userId! },
      select: { id: true, displayName: true, avatarUrl: true, discordId: true },
    });
    return { user };
  });

  app.post('/auth/logout', async (_request, reply) => {
    reply.clearCookie(config.sessionCookieName, { path: '/' });
    return { ok: true };
  });

  app.get('/auth/discord', async (_request, reply) => {
    if (!config.discord.clientId) {
      return reply.status(503).send({
        error: 'Discord OAuth not configured',
        hint: 'Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET',
      });
    }
    const state = randomBytes(16).toString('hex');
    reply.setCookie('oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });
    const params = new URLSearchParams({
      client_id: config.discord.clientId,
      redirect_uri: config.discord.redirectUri,
      response_type: 'code',
      scope: 'identify',
      state,
    });
    return reply.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
  });

  app.get('/auth/discord/callback', async (request, reply) => {
    const query = request.query as { code?: string; state?: string };
    const cookieState = request.cookies.oauth_state;
    if (!query.code || !query.state || query.state !== cookieState) {
      return reply.status(400).send({ error: 'Invalid OAuth state' });
    }
    if (!config.discord.clientSecret) {
      return reply.status(503).send({ error: 'Discord OAuth not configured' });
    }

    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.discord.clientId,
        client_secret: config.discord.clientSecret,
        grant_type: 'authorization_code',
        code: query.code,
        redirect_uri: config.discord.redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      return reply.status(502).send({ error: 'Discord token exchange failed' });
    }
    const tokens = (await tokenRes.json()) as { access_token: string };
    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userRes.ok) {
      return reply.status(502).send({ error: 'Discord user fetch failed' });
    }
    const discordUser = (await userRes.json()) as {
      id: string;
      username: string;
      global_name?: string | null;
      avatar?: string | null;
    };
    const displayName = discordUser.global_name ?? discordUser.username;
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;

    const user = await prisma.user.upsert({
      where: { discordId: discordUser.id },
      create: {
        discordId: discordUser.id,
        displayName,
        avatarUrl,
      },
      update: { displayName, avatarUrl },
    });

    const jwt = app.jwt.sign({ sub: user.id }, { expiresIn: '7d' });
    reply.clearCookie('oauth_state', { path: '/' });
    reply.setCookie(config.sessionCookieName, jwt, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });
    return reply.redirect(`${requestOrigin(request)}/`);
  });
}
