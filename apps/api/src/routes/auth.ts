import { loginSchema, registerSchema, resendVerificationSchema } from '@dcc-web/shared';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { config } from '../lib/config.js';
import { consumeAuthToken, issueAuthToken } from '../lib/auth-tokens.js';
import { sendMail, verificationEmailHtml } from '../lib/mail.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import { clearSessionCookie, setSessionCookie } from '../lib/session-cookie.js';

export const DEV_AUTH_ACCOUNTS = {
  dm: { email: 'dev-dm@localhost', displayName: 'Dev DM' },
  player: { email: 'dev-player@localhost', displayName: 'Dev Player' },
} as const;

export type DevAuthAccount = keyof typeof DEV_AUTH_ACCOUNTS;

function emailAuthEnabled(): boolean {
  return Boolean(config.resend.apiKey && config.resend.from);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function defaultDisplayName(email: string, displayName?: string): string {
  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  return email.split('@')[0] ?? 'Player';
}

function appOrigin(): string {
  return config.publicUrl.replace(/\/$/, '');
}

function authRedirect(reply: FastifyReply, path: string): FastifyReply {
  return reply.redirect(`${appOrigin()}${path}`);
}

function sessionForUser(app: FastifyInstance, reply: FastifyReply, userId: string): void {
  const token = app.jwt.sign({ sub: userId }, { expiresIn: '7d' });
  setSessionCookie(reply, token);
}

async function sendVerificationEmail(userId: string, email: string): Promise<void> {
  const token = await issueAuthToken(userId, 'verify_email');
  const verifyUrl = `${appOrigin()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: email,
    subject: 'Verify your DCC Web account',
    html: verificationEmailHtml(verifyUrl),
  });
}

export async function authRoutes(app: FastifyInstance) {
  app.get('/auth/config', async () => ({
    devLogin: config.enableDevLogin,
    emailAuth: emailAuthEnabled(),
    publicUrl: config.publicUrl,
  }));

  app.post('/auth/register', async (request, reply) => {
    if (!emailAuthEnabled()) {
      return reply.status(503).send({ error: 'Email sign-up is not configured' });
    }

    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten().fieldErrors });
    }

    const email = normalizeEmail(parsed.data.email);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.emailVerifiedAt) {
      return reply.status(409).send({ error: 'An account with this email already exists' });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const displayName = defaultDisplayName(email, parsed.data.displayName);

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash, displayName },
        })
      : await prisma.user.create({
          data: { email, passwordHash, displayName },
        });

    try {
      await sendVerificationEmail(user.id, email);
    } catch (err) {
      request.log.error({ err }, 'Failed to send verification email');
      return reply.status(502).send({ error: 'Could not send verification email. Try again later.' });
    }

    return {
      ok: true,
      message: 'Check your email for a verification link.',
    };
  });

  app.post('/auth/login', async (request, reply) => {
    if (!emailAuthEnabled()) {
      return reply.status(503).send({ error: 'Email sign-in is not configured' });
    }

    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten().fieldErrors });
    }

    const email = normalizeEmail(parsed.data.email);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    if (!user.emailVerifiedAt) {
      return reply.status(403).send({
        error: 'Email not verified',
        code: 'email_not_verified',
      });
    }

    sessionForUser(app, reply, user.id);
    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        emailVerified: true,
      },
    };
  });

  app.post('/auth/resend-verification', async (request, reply) => {
    if (!emailAuthEnabled()) {
      return reply.status(503).send({ error: 'Email sign-up is not configured' });
    }

    const parsed = resendVerificationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten().fieldErrors });
    }

    const email = normalizeEmail(parsed.data.email);
    const user = await prisma.user.findUnique({ where: { email } });

    // Avoid leaking whether an account exists
    if (!user || user.emailVerifiedAt || !user.passwordHash) {
      return { ok: true, message: 'If that account is pending verification, we sent a new link.' };
    }

    try {
      await sendVerificationEmail(user.id, email);
    } catch (err) {
      request.log.error({ err }, 'Failed to resend verification email');
      return reply.status(502).send({ error: 'Could not send verification email. Try again later.' });
    }

    return { ok: true, message: 'If that account is pending verification, we sent a new link.' };
  });

  app.get('/auth/verify-email', async (request, reply) => {
    const token = (request.query as { token?: string }).token;
    if (!token) {
      return authRedirect(reply, '/?auth_error=invalid_token');
    }

    const result = await consumeAuthToken(token, 'verify_email');
    if (!result) {
      return authRedirect(reply, '/?auth_error=invalid_token');
    }

    await prisma.user.update({
      where: { id: result.userId },
      data: { emailVerifiedAt: new Date() },
    });

    sessionForUser(app, reply, result.userId);
    return authRedirect(reply, '/?auth_success=1');
  });

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
      create: {
        email: preset.email,
        displayName,
        emailVerifiedAt: new Date(),
      },
      update: { displayName },
    });
    sessionForUser(app, reply, user.id);
    return {
      user: { id: user.id, displayName: user.displayName, email: preset.email },
      account,
    };
  });

  app.get('/auth/me', { onRequest: [app.authenticate] }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.userId! },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        email: true,
        emailVerifiedAt: true,
      },
    });
    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        email: user.email,
        emailVerified: Boolean(user.emailVerifiedAt),
      },
    };
  });

  app.post('/auth/logout', async (_request, reply) => {
    clearSessionCookie(reply);
    return { ok: true };
  });
}
