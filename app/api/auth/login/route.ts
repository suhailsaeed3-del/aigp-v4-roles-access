import { NextRequest, NextResponse } from 'next/server';
import { env, requireProductionEnv } from '@/lib/security/env';
import { buildWorkspaceOneAuthorizeUrl, randomState } from '@/lib/security/oidc';
import { ensureUserFromIdentity } from '@/lib/security/user-access';
import { setSessionCookie } from '@/lib/security/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    requireProductionEnv();
    if (env.authProvider === 'workspaceone') {
      const state = randomState();
      const res = NextResponse.redirect(await buildWorkspaceOneAuthorizeUrl(state));
      res.cookies.set('oidc_state', state, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.sessionCookieSecure,
        path: '/',
        maxAge: 600,
      });
      return res;
    }

    if (env.authProvider === 'uaepass') {
      const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
      return NextResponse.redirect(new URL(`${base}/api/auth/uaepass/login`, req.url));
    }

    if (env.nodeEnv === 'production') {
      return NextResponse.json({ code: 'MOCK_AUTH_DISABLED', message: 'Mock authentication is disabled in production.' }, { status: 403 });
    }

    const user = await ensureUserFromIdentity({
      provider: 'mock',
      email: process.env.MOCK_USER_EMAIL || 'admin@example.com',
      name: process.env.MOCK_USER_NAME || 'مدير النظام',
      externalSub: 'mock-admin',
    });
    const res = NextResponse.redirect(new URL('/', req.url));
    setSessionCookie(res, { userId: user.id, email: user.email || '', provider: 'mock' });
    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ code: 'LOGIN_FAILED', message: 'تعذر بدء تسجيل الدخول.' }, { status: 500 });
  }
}
