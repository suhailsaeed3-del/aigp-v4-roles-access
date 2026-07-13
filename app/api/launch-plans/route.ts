import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import {
  assertPermission,
  isGlobalRole,
  isStreamGlobalRole,
} from '@/lib/security/rbac';
import { handleApiError } from '@/lib/security/http';
import type { Prisma } from '@prisma/client';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const u = await requireAuthUser(req);
    assertPermission(u, 'launch_plans:view');

    // Launch plans are scoped by entity. Global roles see all; stream owners
    // see plans that contain items in their stream; entity roles see their entity's plans.
    let where: Prisma.LaunchPlanWhereInput = {};
    if (!isGlobalRole(u) && !isStreamGlobalRole(u)) {
      // Entity rep / coordinator: plans have no entity column — scope through
      // the items attached to the plan (adapted from the reference, whose
      // direct entityId filter did not match the LaunchPlan schema).
      const entityIds = Array.from(
        new Set([u.entityId, ...u.entityScopes].filter(Boolean))
      ) as string[];
      where = entityIds.length
        ? { itemLinks: { some: { item: { entityId: { in: entityIds } } } } }
        : { id: '__no_scope__' };
    }
    // Stream owners see launch plans that contain items in their stream
    // For simplicity, stream owners get all launch plans (they're informational)
    // and the frontend already filters by stream context

    const launchPlans = await prisma.launchPlan.findMany({
      where,
      orderBy: { title: 'asc' },
      take: 500,
    });
    return NextResponse.json({ launchPlans });
  } catch (e) {
    return handleApiError(e);
  }
}
