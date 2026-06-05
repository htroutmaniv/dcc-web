function parseCorsOrigins(): string[] | true {
  const raw = process.env.CORS_ORIGIN ?? 'http://localhost,http://localhost:5173';
  if (raw === '*') return true;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  port: Number(process.env.PORT ?? 3003),
  host: process.env.HOST ?? '0.0.0.0',
  isProduction,
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-in-production',
  corsOrigins: parseCorsOrigins(),
  publicUrl: process.env.PUBLIC_URL ?? 'http://localhost:8080',
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
    from: process.env.MAIL_FROM ?? '',
  },
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'dcc_session',
  storagePath: process.env.STORAGE_PATH ?? './uploads',
  /** Separate DM/player dev accounts; disabled in production unless ENABLE_DEV_LOGIN=true */
  enableDevLogin:
    !isProduction || process.env.ENABLE_DEV_LOGIN === 'true',
};
