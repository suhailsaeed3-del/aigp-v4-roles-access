import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import { canAccessAllEntities } from '@/lib/security/rbac';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Compatibility endpoint for the V3 prototype state blob. This is intentionally
// limited: production workflow APIs should use relational routes under /api/*.
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    // Non-global users must not receive the full cross-entity state blob.
    if (!canAccessAllEntities(user)) return NextResponse.json({ data: null, scoped: true });
    const row = await prisma.appState.findUnique({ where: { id: 'singleton' } });
    return NextResponse.json({ data: row?.data ?? null });
  } catch {
    return NextResponse.json({ data: null, error: 'unauthenticated' }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  const required = process.env.STATE_API_TOKEN;
  if (required && req.headers.get('authorization') !== `Bearer ${required}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const user = await requireAuthUser(req);
    if (!canAccessAllEntities(user)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  } catch {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const len = Number(req.headers.get('content-length') || 0);
  if (len > 2_000_000) return NextResponse.json({ error: 'payload-too-large' }, { status: 413 });

  let data: unknown;
  try { data = await req.json(); } catch { return NextResponse.json({ error: 'bad-request' }, { status: 400 }); }
  if (data === null || typeof data !== 'object') return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  try {
    await prisma.appState.upsert({ where: { id: 'singleton' }, update: { data: data as object }, create: { id: 'singleton', data: data as object } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ ok: false, error: 'db' }, { status: 500 }); }
}
