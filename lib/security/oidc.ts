import { createHash, createPublicKey, verify as verifySignature } from 'crypto';
import { env } from './env';

type Discovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
  end_session_endpoint?: string;
  issuer: string;
};

type Jwk = { kid?: string; kty: string; alg?: string; use?: string; n?: string; e?: string };
let discoveryCache: Discovery | null = null;
let jwksCache: { keys: Jwk[] } | null = null;

export function randomState(): string {
  return createHash('sha256').update(String(Math.random()) + Date.now()).digest('base64url');
}

export async function getDiscovery(): Promise<Discovery> {
  if (discoveryCache) return discoveryCache;
  const res = await fetch(env.oidcIssuer.replace(/\/$/, '') + '/.well-known/openid-configuration');
  if (!res.ok) throw new Error('oidc-discovery-failed');
  discoveryCache = (await res.json()) as Discovery;
  return discoveryCache;
}

async function getJwks(): Promise<{ keys: Jwk[] }> {
  if (jwksCache) return jwksCache;
  const d = await getDiscovery();
  const res = await fetch(d.jwks_uri);
  if (!res.ok) throw new Error('oidc-jwks-failed');
  jwksCache = (await res.json()) as { keys: Jwk[] };
  return jwksCache;
}

export async function buildWorkspaceOneAuthorizeUrl(state: string): Promise<string> {
  const d = await getDiscovery();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.oidcClientId,
    redirect_uri: env.oidcRedirectUri,
    scope: env.oidcScope,
    state,
  });
  return `${d.authorization_endpoint}?${params.toString()}`;
}

export async function exchangeWorkspaceOneCode(code: string) {
  const d = await getDiscovery();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.oidcRedirectUri,
  });

  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (env.oidcClientAuthentication === 'client_secret_basic') {
    headers.Authorization = 'Basic ' + Buffer.from(`${env.oidcClientId}:${env.oidcClientSecret}`).toString('base64');
  } else {
    body.set('client_id', env.oidcClientId);
    body.set('client_secret', env.oidcClientSecret);
  }

  const res = await fetch(d.token_endpoint, { method: 'POST', headers, body });
  if (!res.ok) throw new Error('oidc-token-' + res.status);
  return (await res.json()) as { access_token: string; id_token?: string; expires_in?: number; token_type?: string };
}

function decodeSegment<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T;
}

export async function verifyJwt(token: string): Promise<Record<string, unknown>> {
  const [headerB64, payloadB64, signatureB64] = token.split('.');
  if (!headerB64 || !payloadB64 || !signatureB64) throw new Error('invalid-jwt');
  const header = decodeSegment<{ alg?: string; kid?: string }>(headerB64);
  const payload = decodeSegment<Record<string, unknown>>(payloadB64);
  if (header.alg !== 'RS256') throw new Error('unsupported-jwt-alg');
  const jwks = await getJwks();
  const jwk = jwks.keys.find((k) => k.kid === header.kid) || jwks.keys[0];
  if (!jwk) throw new Error('jwks-key-not-found');
  const ok = verifySignature(
    'RSA-SHA256',
    Buffer.from(`${headerB64}.${payloadB64}`),
    createPublicKey({ key: jwk, format: 'jwk' }),
    Buffer.from(signatureB64, 'base64url')
  );
  if (!ok) throw new Error('bad-jwt-signature');
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < now) throw new Error('jwt-expired');
  if (payload.iss && payload.iss !== env.oidcIssuer) throw new Error('bad-issuer');
  const aud = payload.aud;
  const validAud = Array.isArray(aud) ? aud.includes(env.oidcClientId) : aud === env.oidcClientId;
  if (aud && !validAud) throw new Error('bad-audience');
  return payload;
}

export async function fetchUserInfo(accessToken: string): Promise<Record<string, unknown>> {
  const d = await getDiscovery();
  if (!d.userinfo_endpoint) return {};
  const res = await fetch(d.userinfo_endpoint, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return {};
  return (await res.json()) as Record<string, unknown>;
}
