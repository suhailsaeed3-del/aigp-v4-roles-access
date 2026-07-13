import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/security/env';
import { exchangeWorkspaceOneCode, fetchUserInfo, verifyJwt } from '@/lib/security/oidc';
import { ensureUserFromIdentity } from '@/lib/security/user-access';
import { setSessionCookie } from '@/lib/security/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const appUrl = new URL('/', env.appBaseUrl || url.origin);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const err = url.searchParams.get('error');
  const cookieState = req.cookies.get('oidc_state')?.value;

  if (err) {
    appUrl.searchParams.set('login', 'cancelled');
    return NextResponse.redirect(appUrl);
  }
  if (!code || !state || state !== cookieState) {
    appUrl.searchParams.set('login', 'invalid');
    return NextResponse.redirect(appUrl);
  }

  try {
    const tokens = await exchangeWorkspaceOneCode(code);
    const idClaims = tokens.id_token ? await verifyJwt(tokens.id_token) : {};
    const userInfo = tokens.access_token ? await fetchUserInfo(tokens.access_token) : {};
    const profile = { ...idClaims, ...userInfo };
    const email = String(profile.email || profile.upn || profile.preferred_username || '').trim();
    const sub = String(profile.sub || profile.oid || profile.user_name || email || '');
    const name = String(profile.name || profile.fullnameAR || profile.fullnameEN || profile.given_name || email || '');
    const user = await ensureUserFromIdentity({ provider: env.authProvider, externalSub: sub, email, name });

    if (user.status !== 'active' || !user.accessEnabled || !user.isActive) {
      appUrl.searchParams.set('access', 'pending');
      const res = NextResponse.redirect(appUrl);
      res.cookies.delete('oidc_state');
      return res;
    }

    const res = NextResponse.redirect(appUrl);
    setSessionCookie(res, { userId: user.id, email: user.email || '', provider: env.authProvider });
    res.cookies.delete('oidc_state');
    return res;
  } catch (error) {
    console.error(error);
    appUrl.searchParams.set('login', 'error');
    return NextResponse.redirect(appUrl);
  }
}
