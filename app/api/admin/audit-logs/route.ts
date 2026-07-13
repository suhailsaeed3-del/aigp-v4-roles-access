import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import { assertPermission, canAccessAllEntities } from '@/lib/security/rbac';
import { handleApiError } from '@/lib/security/http';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) { try { const u = await requireAuthUser(req); assertPermission(u, 'audit:view'); const url = new URL(req.url); const take = Math.min(Number(url.searchParams.get('limit') || 100), 200); const entityIds = Array.from(new Set([u.entityId, ...u.entityScopes].filter(Boolean))) as string[]; const where = canAccessAllEntities(u) ? {} : { entityId: { in: entityIds.length ? entityIds : ['__no_scope__'] } }; const auditLogs = await prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take }); return NextResponse.json({ auditLogs }); } catch(e) { return handleApiError(e); } }
