import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import { assertEntity, assertPermission, isGlobalRole } from '@/lib/security/rbac';
import { handleApiError, getIp } from '@/lib/security/http';
import { writeAuditLog } from '@/lib/security/audit';
import { jsonError, messages } from '@/lib/security/errors';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/:id/roles
 * Assigns exactly ONE role to a user (replaces any existing roles).
 * Per the UX spec: "Every user belongs to exactly ONE role."
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAuthUser(req);
    assertPermission(actor, 'roles:assign');

    const body = (await req.json().catch(() => null)) as {
      roleCode?: string;
      roleId?: string;
    } | null;
    if (!body?.roleCode && !body?.roleId)
      return jsonError('VALIDATION_ERROR', messages.validation, 400);

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) throw Object.assign(new Error('not-found'), { status: 404 });

    // Non-global actors can only assign roles within their entity scope
    if (!isGlobalRole(actor)) {
      assertEntity(actor, target.entityId);
      // Only global admins can assign admin roles
      if (['system_admin', 'program_admin'].includes(body.roleCode || ''))
        throw Object.assign(new Error('forbidden-role'), { status: 403 });
    }

    const role = body.roleId
      ? await prisma.role.findUnique({ where: { id: body.roleId } })
      : await prisma.role.findUnique({ where: { code: body.roleCode! } });
    if (!role) throw Object.assign(new Error('not-found'), { status: 404 });

    await prisma.$transaction(async (tx) => {
      // Remove ALL existing roles first (enforce single-role rule)
      await tx.userRole.deleteMany({ where: { userId: params.id } });
      // Assign the new role
      await tx.userRole.create({
        data: { userId: params.id, roleId: role.id },
      });
      // Update the legacy role field to match
      const legacyMap: Record<string, string> = {
        entity_coordinator: 'coord',
        entity_representative: 'entity',
        stream_owner: 'path',
        ai_committee: 'ai',
        system_admin: 'ai',
        program_admin: 'ai',
        viewer: 'entity',
        auditor: 'entity',
      };
      await tx.user.update({
        where: { id: params.id },
        data: { role: legacyMap[role.code] || 'entity' },
      });
      await writeAuditLog(
        {
          actorUserId: actor.id,
          action: 'role_assigned',
          resourceType: 'user',
          resourceId: params.id,
          entityId: target.entityId,
          metadata: { roleCode: role.code, replacedAll: true },
          ipAddress: getIp(req),
          userAgent: req.headers.get('user-agent'),
        },
        tx
      );
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
