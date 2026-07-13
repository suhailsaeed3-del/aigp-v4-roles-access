// ============================================================================
// UAE PASS SSO (OpenID Connect) — scaffolding.
//
// The portal is designed to authenticate via UAE PASS. This module implements
// the standard UAE PASS OIDC authorization-code flow, configurable by env.
// For the PRESENTATION build the login button is a MOCK that goes straight to
// the app (NEXT_PUBLIC_UAEPASS_MODE=mock, the default). Set it to `live` and
// supply real client credentials to use the actual UAE PASS IdP.
//
// UAE PASS endpoints (per their integration docs):
//   Staging IdP base:    https://stg-id.uaepass.ae/idshub
//   Production IdP base:  https://id.uaepass.ae/idshub
//   authorize / token / userinfo / logout are under that base.
// Client authentication is HTTP Basic (client_id:client_secret).
// Default profile scope: urn:uae:digitalid:profile:general
// ============================================================================

export type UaePassEnv = 'staging' | 'production';

const BASES: Record<UaePassEnv, string> = {
  staging: 'https://stg-id.uaepass.ae/idshub',
  production: 'https://id.uaepass.ae/idshub',
};

export function uaePassConfig() {
  const env = (process.env.UAEPASS_ENV as UaePassEnv) || 'staging';
  const base = process.env.UAEPASS_BASE_URL || BASES[env];
  return {
    env,
    base,
    authorizeUrl: `${base}/authorize`,
    tokenUrl: `${base}/token`,
    userInfoUrl: `${base}/userinfo`,
    logoutUrl: `${base}/logout`,
    clientId: process.env.UAEPASS_CLIENT_ID || '',
    clientSecret: process.env.UAEPASS_CLIENT_SECRET || '',
    redirectUri:
      process.env.UAEPASS_REDIRECT_URI ||
      'http://localhost:3000/api/auth/uaepass/callback',
    // staging mobile/web ACR; override per environment as needed
    acrValues:
      process.env.UAEPASS_ACR ||
      (env === 'staging'
        ? 'urn:safelayer:tws:policies:authentication:level:low'
        : 'urn:digitalid:authentication:flow:mobileondevice'),
    scope: process.env.UAEPASS_SCOPE || 'urn:uae:digitalid:profile:general',
    configured: !!(process.env.UAEPASS_CLIENT_ID && process.env.UAEPASS_CLIENT_SECRET),
  };
}

/** Build the authorization-request URL the browser is redirected to. */
export function buildAuthorizeUrl(state: string): string {
  const c = uaePassConfig();
  const p = new URLSearchParams({
    response_type: 'code',
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    scope: c.scope,
    state,
    acr_values: c.acrValues,
    ui_locales: 'ar',
  });
  return `${c.authorizeUrl}?${p.toString()}`;
}

/** Exchange the authorization code for tokens. */
export async function exchangeCode(code: string) {
  const c = uaePassConfig();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: c.redirectUri,
  });
  const res = await fetch(c.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' + Buffer.from(`${c.clientId}:${c.clientSecret}`).toString('base64'),
    },
    body,
  });
  if (!res.ok) throw new Error('uaepass-token-' + res.status);
  return (await res.json()) as { access_token: string; id_token?: string; expires_in?: number };
}

/** Fetch the authenticated user's profile. */
export async function fetchUserInfo(accessToken: string) {
  const c = uaePassConfig();
  const res = await fetch(c.userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('uaepass-userinfo-' + res.status);
  // UAE PASS returns fields like sub, fullnameAR/EN, email, mobile, idn, ...
  return (await res.json()) as Record<string, unknown>;
}
