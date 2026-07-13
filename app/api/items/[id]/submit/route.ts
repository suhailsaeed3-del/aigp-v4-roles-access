import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import { assertPermission, assertItemAccess } from '@/lib/security/rbac';
import { handleApiError, getIp } from '@/lib/security/http';
import { writeAuditLog } from '@/lib/security/audit';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTION = 'submit';
const PERMISSION = 'items:submit';
const NEXT_WF = 'ent1';
const APPROVAL = 'تم الإرسال';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser(req);
    assertPermission(user, PERMISSION);
    const body = (await req.json().catch(() => ({}))) as { note?: string };
    const existing = await prisma.item.findUnique({ where: { id: params.id } });
    if (!existing) throw Object.assign(new Error('not-found'), { status: 404 });
    // Coordinator submits items in their entity + stream
    assertItemAccess(user, existing.entityId, existing.streamId);
    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.item.update({
        where: { id: params.id },
        data: { wf: NEXT_WF as never, approval: APPROVAL },
      });
      await tx.logEntry.create({
        data: {
          itemId: params.id,
          action: ACTION,
          byName: user.name,
          roleName: user.roles[0] || user.role,
          note: body.note || '',
        },
      });
      await writeAuditLog(
        {
          actorUserId: user.id,
          action: `item_${ACTION}`,
          resourceType: 'item',
          resourceId: params.id,
          entityId: existing.entityId,
          streamId: existing.streamId,
          metadata: { note: body.note || '' },
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
