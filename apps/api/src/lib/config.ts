export const config = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-in-production',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost',
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID ?? '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
    redirectUri:
      process.env.DISCORD_REDIRECT_URI ??
      'http://localhost/api/auth/discord/callback',
  },
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'dcc_session',
  storagePath: process.env.STORAGE_PATH ?? './uploads',
};
