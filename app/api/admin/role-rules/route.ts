import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import { assertPermission } from '@/lib/security/rbac';
import { writeAuditLog } from '@/lib/security/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/role-rules
 * List all role assignment rules (consumed and unconsumed).
 */
export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireAuthUser(req);
    assertPermission(user, 'users:view');
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'forbidden' }, { status: 403 });
  }

  const rules = await (prisma as any).roleAssignmentRule.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Enrich with entity/stream names
  const entityIds = [...new Set(rules.filter((r: any) => r.entityId).map((r: any) => r.entityId))];
  const streamIds = [...new Set(rules.filter((r: any) => r.streamId).map((r: any) => r.streamId))];

  const entities = entityIds.length
    ? await prisma.entity.findMany({ where: { id: { in: entityIds as string[] } }, select: { id: true, nameAr: true } })
    : [];
  const streams = streamIds.length
    ? await prisma.stream.findMany({ where: { id: { in: streamIds as string[] } }, select: { id: true, nameAr: true } })
    : [];

  const entityMap = Object.fromEntries(entities.map((e) => [e.id, e.nameAr]));
  const streamMap = Object.fromEntries(streams.map((s) => [s.id, s.nameAr]));

  const enriched = rules.map((r: any) => ({
    ...r,
    entityName: r.entityId ? entityMap[r.entityId] || null : null,
    streamName: r.streamId ? streamMap[r.streamId] || null : null,
  }));

  return NextResponse.json({ rules: enriched });
}

/**
 * POST /api/admin/role-rules
 * Create a new role assignment rule (pre-assign role to an email before they register).
 * Body: { email, roleCode, entityId?, streamId?, displayName? }
 */
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuthUser(req);
    assertPermission(user, 'roles:assign');
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'forbidden' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }

  const { email, roleCode, entityId, streamId, displayName } = body;
  if (!email || !roleCode) {
    return NextResponse.json({ error: 'email and roleCode are required' }, { status: 400 });
  }

  // Validate role code exists
  const role = await prisma.role.findUnique({ where: { code: roleCode } });
  if (!role) {
    return NextResponse.json({ error: `role-not-found: ${roleCode}` }, { status: 400 });
  }

  // Validate entity if provided
  if (entityId) {
    const entity = await prisma.entity.findUnique({ where: { id: entityId } });
    if (!entity) return NextResponse.json({ error: 'entity-not-found' }, { status: 400 });
  }

  // Validate stream if provided
  if (streamId) {
    const stream = await prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) return NextResponse.json({ error: 'stream-not-found' }, { status: 400 });
  }

  try {
    const rule = await (prisma as any).roleAssignmentRule.upsert({
      where: { email: email.trim().toLowerCase() },
      update: {
        roleCode,
        entityId: entityId || null,
        streamId: streamId || null,
        displayName: displayName || null,
        isConsumed: false,
        consumedAt: null,
        consumedBy: null,
      },
      create: {
        email: email.trim().toLowerCase(),
        roleCode,
        entityId: entityId || null,
        streamId: streamId || null,
        displayName: displayName || null,
        createdBy: user.id,
      },
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: 'role_rule_created',
      resourceType: 'role_assignment_rule',
      resourceId: rule.id,
      metadata: { email, roleCode, entityId, streamId },
    });

    return NextResponse.json({ ok: true, rule });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/role-rules
 * Delete a role assignment rule by ID.
 * Body: { id }
 */
export async function DELETE(req: NextRequest) {
  let user;
  try {
    user = await requireAuthUser(req);
    assertPermission(user, 'roles:assign');
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'forbidden' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }

  const { id } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    await (prisma as any).roleAssignmentRule.delete({ where: { id } });
    await writeAuditLog({
      actorUserId: user.id,
      action: 'role_rule_deleted',
      resourceType: 'role_assignment_rule',
      resourceId: id,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }
}
