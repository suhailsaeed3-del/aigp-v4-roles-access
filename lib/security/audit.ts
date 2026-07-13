import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type AuditInput = {
  actorUserId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  entityId?: string | null;
  streamId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function writeAuditLog(input: AuditInput, tx: PrismaClient | Prisma.TransactionClient = prisma) {
  await tx.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      entityId: input.entityId ?? null,
      streamId: input.streamId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? {},
    },
  });
}
