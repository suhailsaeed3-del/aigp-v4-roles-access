import { NextResponse } from 'next/server';
import { buildAuthorizeUrl, uaePassConfig } from '@/lib/uaepass';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Starts the UAE PASS OIDC flow: sets a state cookie and redirects to the IdP.
// Only used when NEXT_PUBLIC_UAEPASS_MODE=live and credentials are configured.
export async function GET() {
  const c = uaePassConfig();
  if (!c.configured) {
    return NextResponse.json(
      { error: 'uaepass-not-configured', hint: 'Set UAEPASS_CLIENT_ID / UAEPASS_CLIENT_SECRET' },
      { status: 503 }
    );
  }
  // opaque anti-CSRF state
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const res = NextResponse.redirect(buildAuthorizeUrl(state));
  res.cookies.set('uaepass_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });
  return res;
}
