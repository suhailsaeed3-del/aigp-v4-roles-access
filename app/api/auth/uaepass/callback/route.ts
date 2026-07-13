import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, fetchUserInfo } from '@/lib/uaepass';
import { ensureUserFromIdentity } from '@/lib/security/user-access';
import { setSessionCookie } from '@/lib/security/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// UAE PASS redirect target: validates state, exchanges the code, loads the
// profile, maps the user to the local access-control database, sets a signed
// HttpOnly session cookie, and returns to the app.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const err = url.searchParams.get('error');
  const cookieState = req.cookies.get('uaepass_state')?.value;

  const appUrl = new URL('/', url.origin);

  if (err) {
    appUrl.searchParams.set('login', 'cancelled');
    return NextResponse.redirect(appUrl);
  }
  if (!code || !state || state !== cookieState) {
    appUrl.searchParams.set('login', 'invalid');
    return NextResponse.redirect(appUrl);
  }

  try {
    const tokens = await exchangeCode(code);
    const profile = await fetchUserInfo(tokens.access_token);
    const email = String(profile.email || '').trim();
    const name = String(profile.fullnameAR || profile.fullnameEN || profile.name || email || '');
    const sub = String(profile.sub || profile.idn || email || '');
    const user = await ensureUserFromIdentity({ provider: 'uaepass', externalSub: sub, email, name });

    const res = NextResponse.redirect(appUrl);
    res.cookies.delete('uaepass_state');
    if (user.status !== 'active' || !user.accessEnabled || !user.isActive) {
      appUrl.searchParams.set('access', 'pending');
      return NextResponse.redirect(appUrl);
    }
    setSessionCookie(res, { userId: user.id, email: user.email || '', provider: 'uaepass' });
    appUrl.searchParams.set('login', 'ok');
    return res;
  } catch (error) {
    console.error(error);
    appUrl.searchParams.set('login', 'error');
    return NextResponse.redirect(appUrl);
  }
}
