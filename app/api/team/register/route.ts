import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import { writeAuditLog } from '@/lib/security/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/team/register
 * Called when the Entity Rep completes team setup (step 2 → "اعتماد").
 * Creates RoleAssignmentRule entries for each team member so they get
 * auto-assigned roles on first login.
 *
 * Body shape:
 * {
 *   entityName: string,       // Arabic entity name
 *   rep: { name, email },     // Entity representative info
 *   owners: { [streamId]: { name, email, self } }  // Stream owners
 * }
 */
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuthUser(req);
  } catch {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }

  const { entityName, rep, owners } = body;
  if (!entityName || !rep || !owners) {
    return NextResponse.json({ error: 'missing-fields' }, { status: 400 });
  }

  try {
    // Resolve the entity by Arabic name
    const entity = await prisma.entity.findUnique({ where: { nameAr: entityName } });
    if (!entity) {
      return NextResponse.json({ error: 'entity-not-found', entityName }, { status: 404 });
    }

    const rulesCreated: string[] = [];

    await prisma.$transaction(async (tx) => {
      // 1. Create rule for the Entity Representative (ممثل الجهة)
      if (rep.email && rep.email.trim()) {
        const repEmail = rep.email.trim().toLowerCase();
        await (tx as any).roleAssignmentRule.upsert({
          where: { email: repEmail },
          update: {
            roleCode: 'entity_representative',
            entityId: entity.id,
            streamId: null,
            displayName: rep.name || null,
          },
          create: {
            email: repEmail,
            roleCode: 'entity_representative',
            entityId: entity.id,
            streamId: null,
            displayName: rep.name || null,
            createdBy: user.id,
          },
        });
        rulesCreated.push(`${repEmail} → entity_representative`);
      }

      // 2. Create rules for each Stream Owner (منسق المسار)
      for (const [streamId, ownerData] of Object.entries(owners)) {
        const owner = ownerData as { name?: string; email?: string; self?: boolean };
        
        // If "self" is checked, the entity rep is also the coordinator for this stream
        // In that case, we update the rep's rule to also include this stream, or skip
        if (owner.self) {
          // The entity rep handles this stream too — no separate rule needed
          // But we should ensure the rep can access this stream
          continue;
        }

        if (!owner.email || !owner.email.trim()) continue;
        const ownerEmail = owner.email.trim().toLowerCase();

        // Skip if same as rep email (they already have entity_representative role)
        if (ownerEmail === (rep.email || '').trim().toLowerCase()) continue;

        await (tx as any).roleAssignmentRule.upsert({
          where: { email: ownerEmail },
          update: {
            roleCode: 'entity_coordinator',
            entityId: entity.id,
            streamId: streamId,
            displayName: owner.name || null,
          },
          create: {
            email: ownerEmail,
            roleCode: 'entity_coordinator',
            entityId: entity.id,
            streamId: streamId,
            displayName: owner.name || null,
            createdBy: user.id,
          },
        });
        rulesCreated.push(`${ownerEmail} → entity_coordinator (${streamId})`);
      }

      // 3. Also upsert the EntityRep and StreamOwner relational records
      await tx.entityRep.upsert({
        where: { entityId: entity.id },
        update: {
          name: rep.name || '',
          email: rep.email || '',
          phone: rep.phone || '',
          position: rep.position || '',
        },
        create: {
          entityId: entity.id,
          name: rep.name || '',
          email: rep.email || '',
          phone: rep.phone || '',
          position: rep.position || '',
        },
      });

      for (const [streamId, ownerData] of Object.entries(owners)) {
        const owner = ownerData as { name?: string; email?: string; phone?: string; position?: string; self?: boolean };
        if (!owner.name && !owner.email) continue;
        await tx.streamOwner.upsert({
          where: { entityId_streamId: { entityId: entity.id, streamId } },
          update: {
            name: owner.name || '',
            email: owner.email || '',
            phone: owner.phone || '',
            position: owner.position || '',
            isSelf: owner.self || false,
          },
          create: {
            entityId: entity.id,
            streamId,
            name: owner.name || '',
            email: owner.email || '',
            phone: owner.phone || '',
            position: owner.position || '',
            isSelf: owner.self || false,
          },
        });
      }

      // Audit log
      await writeAuditLog(
        {
          actorUserId: user.id,
          action: 'team_registered',
          resourceType: 'entity',
          resourceId: entity.id,
          entityId: entity.id,
          metadata: { rulesCreated, entityName },
        },
        tx
      );
    });

    return NextResponse.json({
      ok: true,
      message: 'تم تسجيل فريق العمل وإنشاء صلاحيات الدخول التلقائي',
      rulesCreated,
    });
  } catch (err: any) {
    console.error('[team/register]', err);
    return NextResponse.json({ error: 'internal', detail: err.message }, { status: 500 });
  }
}
