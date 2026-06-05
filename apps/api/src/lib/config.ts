function parseCorsOrigins(): string[] | true {
  const raw = process.env.CORS_ORIGIN ?? 'http://localhost,http://localhost:5173';
  if (raw === '*') return true;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-in-production',
  corsOrigins: parseCorsOrigins(),
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID ?? '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
    redirectUri:
      process.env.DISCORD_REDIRECT_URI ??
      'http://localhost/api/auth/discord/callback',
  },
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'dcc_session',
  storagePath: process.env.STORAGE_PATH ?? './uploads',
  /** Separate DM/player dev accounts; disabled in production unless ENABLE_DEV_LOGIN=true */
  enableDevLogin:
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_DEV_LOGIN === 'true',
};
