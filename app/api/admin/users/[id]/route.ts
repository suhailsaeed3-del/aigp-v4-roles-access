import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import { assertEntity, assertPermission, canAccessAllEntities } from '@/lib/security/rbac';
import { handleApiError, getIp } from '@/lib/security/http';
import { writeAuditLog } from '@/lib/security/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireAuthUser(req); assertPermission(actor, 'users:view');
    const u = await prisma.user.findUnique({ where: { id: params.id }, include: { roles: { include: { role: true } }, entityScopes: true, streamScopes: true } });
    if (!u) throw Object.assign(new Error('not-found'), { status: 404 });
    if (!canAccessAllEntities(actor)) assertEntity(actor, u.entityId);
    return NextResponse.json({ user: u });
  } catch (e) { return handleApiError(e); }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireAuthUser(req); assertPermission(actor, 'users:update');
    const existing = await prisma.user.findUnique({ where: { id: params.id } });
    if (!existing) throw Object.assign(new Error('not-found'), { status: 404 });
    if (!canAccessAllEntities(actor)) assertEntity(actor, existing.entityId);
    const body = await req.json().catch(() => ({})) as { name?: string; title?: string; phone?: string; entityId?: string; streamId?: string; role?: string; status?: string };
    if (!canAccessAllEntities(actor) && body.entityId && body.entityId !== existing.entityId) throw Object.assign(new Error('forbidden-scope'), { status: 403 });
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({ where: { id: params.id }, data: { name: body.name, title: body.title, phone: body.phone, entityId: body.entityId, streamId: body.streamId, role: body.role, status: body.status } });
      await writeAuditLog({ actorUserId: actor.id, action: 'user_updated', resourceType: 'user', resourceId: u.id, entityId: u.entityId, ipAddress: getIp(req), userAgent: req.headers.get('user-agent') }, tx);
      return u;
    });
    return NextResponse.json({ user: updated });
  } catch (e) { return handleApiError(e); }
}
