import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import { assertEntity, assertPermission, canAccessAllEntities } from '@/lib/security/rbac';
import { handleApiError, getIp } from '@/lib/security/http';
import { writeAuditLog } from '@/lib/security/audit';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function DELETE(req: NextRequest, { params }: { params: { id: string; roleId: string } }) {
  try { const actor = await requireAuthUser(req); assertPermission(actor, 'roles:assign');
    const target = await prisma.user.findUnique({ where: { id: params.id } }); if (!target) throw Object.assign(new Error('not-found'), { status: 404 });
    if (!canAccessAllEntities(actor)) assertEntity(actor, target.entityId);
    const role = await prisma.role.findUnique({ where: { id: params.roleId } }); if (!role) throw Object.assign(new Error('not-found'), { status: 404 });
    await prisma.$transaction(async (tx) => { await tx.userRole.deleteMany({ where: { userId: params.id, roleId: params.roleId } }); await writeAuditLog({ actorUserId: actor.id, action: 'role_removed', resourceType: 'user', resourceId: params.id, entityId: target.entityId, metadata: { roleCode: role.code }, ipAddress: getIp(req), userAgent: req.headers.get('user-agent') }, tx); });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleApiError(e); }
}
