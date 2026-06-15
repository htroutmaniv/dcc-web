function parseCorsOrigins(isProduction: boolean): string[] {
  const raw = process.env.CORS_ORIGIN ?? 'http://localhost,http://localhost:5173';
  if (raw.trim() === '*') {
    throw new Error(
      'CORS_ORIGIN cannot be "*" when credentials are enabled; use a comma-separated allowlist',
    );
  }
  const origins = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (isProduction && origins.length === 0) {
    throw new Error('CORS_ORIGIN must list at least one origin in production');
  }
  return origins;
}

const isProduction = process.env.NODE_ENV === 'production';

function emailAuthConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim());
}

/** Exit non-zero when production env is missing required secrets or uses unsafe defaults. */
export function validateProductionConfig(): void {
  if (!isProduction) return;

  const errors: string[] = [];

  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret || jwtSecret === 'dev-only-change-in-production') {
    errors.push('JWT_SECRET must be set to a strong, non-default value in production');
  }

  const corsRaw = process.env.CORS_ORIGIN?.trim() ?? '';
  if (!corsRaw || corsRaw === '*') {
    errors.push(
      'CORS_ORIGIN must be a comma-separated allowlist in production (wildcard not allowed)',
    );
  }

  const databaseUrl = process.env.DATABASE_URL?.trim() ?? '';
  if (!databaseUrl || /localhost|127\.0\.0\.1/i.test(databaseUrl)) {
    errors.push('DATABASE_URL must be set and must not use localhost in production');
  }

  if (emailAuthConfigured()) {
    if (!process.env.RESEND_API_KEY?.trim()) {
      errors.push('RESEND_API_KEY is required when email auth is enabled');
    }
    if (!process.env.MAIL_FROM?.trim()) {
      errors.push('MAIL_FROM is required when email auth is enabled');
    }
    const publicUrl = process.env.PUBLIC_URL?.trim() ?? '';
    if (!publicUrl || /localhost|127\.0\.0\.1/i.test(publicUrl)) {
      errors.push('PUBLIC_URL must be set to the public app URL when email auth is enabled');
    }
  }

  if (errors.length > 0) {
    console.error('Production configuration error:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
}

export const config = {
  port: Number(process.env.PORT ?? 3003),
  host: process.env.HOST ?? '0.0.0.0',
  isProduction,
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-in-production',
  corsOrigins: parseCorsOrigins(isProduction),
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

validateProductionConfig();
