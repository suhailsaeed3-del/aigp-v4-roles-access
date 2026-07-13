import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import { assertPermission, canAccessAllEntities } from '@/lib/security/rbac';
import { handleApiError } from '@/lib/security/http';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) { try { const u = await requireAuthUser(req); assertPermission(u, 'streams:view'); const ids = Array.from(new Set([u.streamId, ...u.streamScopes].filter(Boolean))) as string[]; const where = canAccessAllEntities(u) ? {} : ids.length ? { id: { in: ids } } : {}; const streams = await prisma.stream.findMany({ where, orderBy: { sortOrder: 'asc' } }); return NextResponse.json({ streams }); } catch(e) { return handleApiError(e); } }
