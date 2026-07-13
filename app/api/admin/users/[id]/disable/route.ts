import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import { assertEntity, assertPermission, canAccessAllEntities } from '@/lib/security/rbac';
import { handleApiError, getIp } from '@/lib/security/http';
import { writeAuditLog } from '@/lib/security/audit';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try { const actor = await requireAuthUser(req); assertPermission(actor, 'users:disable');
    const target = await prisma.user.findUnique({ where: { id: params.id } }); if (!target) throw Object.assign(new Error('not-found'), { status: 404 });
    if (!canAccessAllEntities(actor)) assertEntity(actor, target.entityId);
    const user = await prisma.$transaction(async (tx) => { const u = await tx.user.update({ where: { id: params.id }, data: { status: 'disabled', accessEnabled: false, isActive: false } }); await writeAuditLog({ actorUserId: actor.id, action: 'user_disabled', resourceType: 'user', resourceId: u.id, entityId: u.entityId, ipAddress: getIp(req), userAgent: req.headers.get('user-agent') }, tx); return u; });
    return NextResponse.json({ user });
  } catch (e) { return handleApiError(e); }
}
