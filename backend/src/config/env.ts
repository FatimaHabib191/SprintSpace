import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const isTest = process.env.NODE_ENV === 'test';

function required(name: string, fallbackForTest?: string): string {
  const value = process.env[name] ?? (isTest ? fallbackForTest : undefined);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 5000),
  mongoUri: process.env.MONGODB_URI ?? '',
  jwtSecret: required('JWT_SECRET', 'test-secret-test-secret-test-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  // 'none' is required when the SPA and API are on different sites (needs Secure). Use 'lax' behind a same-site proxy.
  cookieSameSite: (process.env.COOKIE_SAMESITE ?? (process.env.NODE_ENV === 'production' ? 'none' : 'lax')) as 'none' | 'lax' | 'strict',
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

if (env.isProd && env.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}
