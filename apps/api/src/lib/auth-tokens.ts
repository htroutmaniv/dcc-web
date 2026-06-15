import { createHash, randomBytes } from 'node:crypto';
import type { AuthTokenType } from '@prisma/client';
import { prisma } from './prisma.js';

const VERIFY_EMAIL_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function tokenTtlMs(type: AuthTokenType): number {
  return type === 'password_reset' ? PASSWORD_RESET_TTL_MS : VERIFY_EMAIL_TTL_MS;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function issueAuthToken(
  userId: string,
  type: AuthTokenType,
): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const ttl = tokenTtlMs(type);

  await prisma.authToken.deleteMany({ where: { userId, type } });
  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttl),
    },
  });

  return token;
}

export async function consumeAuthToken(
  token: string,
  type: AuthTokenType,
): Promise<{ userId: string } | null> {
  const row = await prisma.authToken.findFirst({
    where: {
      type,
      tokenHash: hashToken(token),
      expiresAt: { gt: new Date() },
    },
  });
  if (!row) return null;

  await prisma.authToken.delete({ where: { id: row.id } });
  return { userId: row.userId };
}

/** Check whether a token is valid without consuming it. */
export async function isAuthTokenValid(token: string, type: AuthTokenType): Promise<boolean> {
  const row = await prisma.authToken.findFirst({
    where: {
      type,
      tokenHash: hashToken(token),
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  return Boolean(row);
}
