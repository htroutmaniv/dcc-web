import { createHash, randomBytes } from 'node:crypto';
import type { AuthTokenType } from '@prisma/client';
import { prisma } from './prisma.js';

const VERIFY_EMAIL_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function issueAuthToken(
  userId: string,
  type: AuthTokenType,
): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const ttl = type === 'verify_email' ? VERIFY_EMAIL_TTL_MS : VERIFY_EMAIL_TTL_MS;

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
