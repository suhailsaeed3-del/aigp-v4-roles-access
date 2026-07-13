import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import { assertPermission, canAccessAllEntities } from '@/lib/security/rbac';
import { handleApiError } from '@/lib/security/http';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) { try { const u = await requireAuthUser(req); assertPermission(u, 'entities:view'); const ids = Array.from(new Set([u.entityId, ...u.entityScopes].filter(Boolean))) as string[]; const where = canAccessAllEntities(u) ? {} : { id: { in: ids.length ? ids : ['__no_scope__'] } }; const entities = await prisma.entity.findMany({ where, orderBy: { nameAr: 'asc' } }); return NextResponse.json({ entities }); } catch(e) { return handleApiError(e); } }
