import type { FastifyReply } from 'fastify';
import { config } from './config.js';

export function setSessionCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(config.sessionCookieName, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(config.sessionCookieName, { path: '/' });
}
