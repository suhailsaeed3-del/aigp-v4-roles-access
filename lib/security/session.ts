import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { env } from './env';

export type SessionPayload = {
  userId: string;
  email: string;
  provider: string;
  iat: number;
  exp: number;
};

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string): string {
  return createHmac('sha256', env.sessionSecret || 'dev-insecure-secret').update(data).digest('base64url');
}

export function createSessionToken(payload: Omit<SessionPayload, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000);
  const body: SessionPayload = { ...payload, iat: now, exp: now + env.sessionTtlSeconds };
  const data = b64url(JSON.stringify(body));
  return `${data}.${sign(data)}`;
}

export function verifySessionToken(token?: string): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [data, mac] = token.split('.', 2);
  const expected = sign(data);
  try {
    if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSession(req: NextRequest): SessionPayload | null {
  return verifySessionToken(req.cookies.get(env.sessionCookieName)?.value);
}

export function setSessionCookie(res: NextResponse, payload: Omit<SessionPayload, 'iat' | 'exp'>): void {
  res.cookies.set(env.sessionCookieName, createSessionToken(payload), {
    httpOnly: true,
    secure: env.sessionCookieSecure,
    sameSite: env.sessionCookieSameSite,
    path: '/',
    maxAge: env.sessionTtlSeconds,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(env.sessionCookieName, '', {
    httpOnly: true,
    secure: env.sessionCookieSecure,
    sameSite: env.sessionCookieSameSite,
    path: '/',
    maxAge: 0,
  });
}
