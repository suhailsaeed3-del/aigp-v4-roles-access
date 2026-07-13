import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import {
  assertPermission,
  assertItemAccess,
  isGlobalRole,
  buildItemScopeWhere,
} from '@/lib/security/rbac';
import { handleApiError, getIp } from '@/lib/security/http';
import { jsonError, messages } from '@/lib/security/errors';
import { writeAuditLog } from '@/lib/security/audit';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    assertPermission(user, 'items:view');
    const url = new URL(req.url);
    const requestedEntity = url.searchParams.get('entityId');
    const requestedStream = url.searchParams.get('streamId');

    // buildItemScopeWhere now handles workflow visibility per role automatically
    const scopeWhere = buildItemScopeWhere(user);
    const where = {
      AND: [
        scopeWhere,
        requestedEntity ? { entityId: requestedEntity } : {},
        requestedStream ? { streamId: requestedStream } : {},
      ],
    };
    const items = await prisma.item.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
    return NextResponse.json({ items });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    assertPermission(user, 'items:create');
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (
      !body ||
      typeof body.title !== 'string' ||
      typeof body.streamId !== 'string' ||
      typeof body.type !== 'string'
    )
      return jsonError('VALIDATION_ERROR', messages.validation, 400);

    const entityId = isGlobalRole(user)
      ? String(body.entityId || user.entityId || '')
      : user.entityId || user.entityScopes[0];
    // Coordinator creates items in their entity + stream
    assertItemAccess(user, entityId, body.streamId as string);

    const created = await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          id: typeof body.id === 'string' ? body.id : randomUUID(),
          title: body.title as string,
          desc: typeof body.desc === 'string' ? body.desc : '',
          type: body.type as never,
          streamId: body.streamId as string,
          entityId,
        },
      });
      await writeAuditLog(
        {
          actorUserId: user.id,
          action: 'item_created',
          resourceType: 'item',
          resourceId: item.id,
          entityId: item.entityId,
          streamId: item.streamId,
          ipAddress: getIp(req),
          userAgent: req.headers.get('user-agent'),
        },
        tx
      );
      return item;
    });
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
