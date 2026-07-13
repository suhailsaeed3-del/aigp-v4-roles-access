import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import { assertPermission, assertItemAccess } from '@/lib/security/rbac';
import { handleApiError, getIp } from '@/lib/security/http';
import { writeAuditLog } from '@/lib/security/audit';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireAuthUser(req);
    assertPermission(user, 'items:view');
    const item = await prisma.item.findUnique({
      where: { id: params.id },
      include: { logs: true, subMilestones: true, checklist: true },
    });
    if (!item) throw Object.assign(new Error('not-found'), { status: 404 });
    assertItemAccess(user, item.entityId, item.streamId);
    return NextResponse.json({ item });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireAuthUser(req);
    assertPermission(user, 'items:update');
    const existing = await prisma.item.findUnique({ where: { id: params.id } });
    if (!existing) throw Object.assign(new Error('not-found'), { status: 404 });
    assertItemAccess(user, existing.entityId, existing.streamId);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    delete body.entityId;
    delete body.streamId;
    delete body.id;
    const allowed = [
      'title', 'desc', 'priority', 'complexity', 'impact', 'status', 'progress',
      'budget', 'scopeOfWork', 'expectedOutputs', 'expectedOutcomes',
      'expectedImpact', 'endDate',
    ];
    const data = Object.fromEntries(
      Object.entries(body).filter(([k]) => allowed.includes(k))
    );
    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.item.update({ where: { id: params.id }, data });
      await writeAuditLog(
        {
          actorUserId: user.id,
          action: 'item_updated',
          resourceType: 'item',
          resourceId: updated.id,
          entityId: updated.entityId,
          streamId: updated.streamId,
          ipAddress: getIp(req),
          userAgent: req.headers.get('user-agent'),
        },
        tx
      );
      return updated;
    });
    return NextResponse.json({ item });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireAuthUser(req);
    assertPermission(user, 'items:update');
    const existing = await prisma.item.findUnique({ where: { id: params.id } });
    if (!existing) throw Object.assign(new Error('not-found'), { status: 404 });
    assertItemAccess(user, existing.entityId, existing.streamId);
    await prisma.$transaction(async (tx) => {
      await tx.item.delete({ where: { id: params.id } });
      await writeAuditLog(
        {
          actorUserId: user.id,
          action: 'item_deleted',
          resourceType: 'item',
          resourceId: existing.id,
          entityId: existing.entityId,
          streamId: existing.streamId,
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
