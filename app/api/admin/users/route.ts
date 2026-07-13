import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import { assertEntity, assertPermission, canAccessAllEntities } from '@/lib/security/rbac';
import { handleApiError, getIp } from '@/lib/security/http';
import { jsonError, messages } from '@/lib/security/errors';
import { writeAuditLog } from '@/lib/security/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    assertPermission(user, 'users:view');
    const where = canAccessAllEntities(user) ? {} : { OR: [{ entityId: user.entityId }, { entityScopes: { some: { entityId: { in: user.entityScopes } } } }] };
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { roles: { include: { role: true } }, entityScopes: true, streamScopes: true, entity: true, stream: true },
    });
    return NextResponse.json({ users: users.map((u) => ({
      id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, accessEnabled: u.accessEnabled,
      entityId: u.entityId, streamId: u.streamId, entity: u.entity?.nameAr, stream: u.stream?.nameAr,
      roles: u.roles.map((r) => ({ id: r.role.id, code: r.role.code, nameAr: r.role.nameAr })),
      entityScopes: u.entityScopes.map((s) => s.entityId), streamScopes: u.streamScopes.map((s) => s.streamId),
      lastLoginAt: u.lastLogin, createdAt: u.createdAt,
    })) });
  } catch (e) { return handleApiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAuthUser(req);
    assertPermission(actor, 'users:create');
    const body = await req.json().catch(() => null) as { name?: string; email?: string; role?: string; entityId?: string; streamId?: string } | null;
    if (!body?.email || !body?.name) return jsonError('VALIDATION_ERROR', messages.validation, 400);
    const entityId = body.entityId || actor.entityId || undefined;
    if (!canAccessAllEntities(actor)) assertEntity(actor, entityId);
    const created = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { name: body.name!, email: body.email!.toLowerCase(), role: body.role || 'entity', entityId, streamId: body.streamId || null, status: 'pending', accessEnabled: false } });
      await writeAuditLog({ actorUserId: actor.id, action: 'user_created', resourceType: 'user', resourceId: u.id, entityId, ipAddress: getIp(req), userAgent: req.headers.get('user-agent') }, tx);
      return u;
    });
    return NextResponse.json({ user: created }, { status: 201 });
  } catch (e) { return handleApiError(e); }
}
