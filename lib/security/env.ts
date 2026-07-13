export type AuthProvider = 'mock' | 'uaepass' | 'workspaceone';

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v == null || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

function int(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  authProvider: (process.env.AUTH_PROVIDER || process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'mock') as AuthProvider,
  appBaseUrl: (process.env.APP_BASE_URL || '').replace(/\/$/, ''),
  sessionSecret: process.env.SESSION_SECRET || '',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'aigp_session',
  sessionCookieSecure: bool('SESSION_COOKIE_SECURE', process.env.NODE_ENV === 'production'),
  sessionCookieSameSite: (process.env.SESSION_COOKIE_SAME_SITE || 'lax') as 'lax' | 'strict' | 'none',
  // SESSION_TTL_SECONDS wins; falls back to this repo's SESSION_TTL_HOURS.
  sessionTtlSeconds: int('SESSION_TTL_SECONDS', int('SESSION_TTL_HOURS', 8) * 60 * 60),
  bootstrapAdminEmails: (process.env.BOOTSTRAP_ADMIN_EMAILS || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean),
  oidcIssuer: process.env.OIDC_ISSUER || '',
  oidcClientId: process.env.OIDC_CLIENT_ID || '',
  oidcClientSecret: process.env.OIDC_CLIENT_SECRET || '',
  oidcRedirectUri: process.env.OIDC_REDIRECT_URI || '',
  oidcScope: process.env.OIDC_SCOPE || 'openid profile email',
  oidcClientAuthentication: process.env.OIDC_CLIENT_AUTHENTICATION || 'client_secret_post',
  rateLimitEnabled: bool('RATE_LIMIT_ENABLED', true),
  rateLimitWindowMs: int('RATE_LIMIT_WINDOW_MS', 900000),
  rateLimitMax: int('RATE_LIMIT_MAX', 1000),
  aiReviewEnabled: bool('AI_REVIEW_ENABLED', true),
};

export function requireProductionEnv(): void {
  if (env.nodeEnv !== 'production') return;
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!env.sessionSecret || env.sessionSecret.length < 32) missing.push('SESSION_SECRET (min 32 chars)');
  if (env.authProvider === 'workspaceone') {
    for (const [key, value] of Object.entries({
      OIDC_ISSUER: env.oidcIssuer,
      OIDC_CLIENT_ID: env.oidcClientId,
      OIDC_CLIENT_SECRET: env.oidcClientSecret,
      OIDC_REDIRECT_URI: env.oidcRedirectUri,
    })) {
      if (!value) missing.push(key);
    }
  }
  if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
}
