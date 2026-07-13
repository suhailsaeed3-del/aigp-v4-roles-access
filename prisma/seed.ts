// ============================================================================
// Seeds Postgres for the server (Docker) deployment — fully relational:
// streams (+heads), entities (34 federal + session entity), exec batches,
// program phases, settings, team setup, and the mock items decomposed into
// items / checklists / sub-milestones / shared launches / logs / funding.
// Idempotent: existing rows are left untouched (upsert / create-if-missing).
// ============================================================================
import { PrismaClient, Prisma } from '@prisma/client';
import { seedItems, seedLaunchPlans } from '../lib/seed';
import {
  PATHS,
  PATH_REPS,
  execMilestones,
  DEFAULT_PROGRAM_PHASES,
  DEFAULT_ENTITY,
  APPROVED_BUDGET,
  parseBudget,
  entOf,
  type Item as MockItem,
} from '../lib/domain';
import { FEDERAL_ENTITIES } from '../lib/entities';

const prisma = new PrismaClient();

// Production RBAC roles (code-based, mirrors migration 0009). UI labels stay
// Arabic while the server APIs enforce the stable permission codes.
const RBAC_ROLES = [
  ['system_admin', 'مدير النظام'],
  ['program_admin', 'مدير البرنامج'],
  ['entity_representative', 'ممثل الجهة'],
  ['entity_admin', 'مسؤول الجهة'],
  ['entity_coordinator', 'منسق المسار في الجهة'],
  ['stream_owner', 'رئيس المسار'],
  ['ai_committee', 'اللجنة الوطنية'],
  ['viewer', 'مستعرض'],
  ['auditor', 'مدقق'],
] as const;

const PERMISSIONS = [
  'users:view','users:create','users:update','users:disable','roles:view','roles:assign',
  'entities:view','entities:update','streams:view','streams:update',
  'items:view','items:create','items:update','items:submit','items:approve','items:reject','items:export',
  'launch_plans:view','launch_plans:create','launch_plans:update','launch_plans:approve',
  'funding:view','funding:create','funding:approve','funding:reject','funding:cancel',
  'nominations:view','nominations:create','nominations:update','nominations:approve','nominations:reject',
  'reports:view','reports:export','ai_review:run','audit:view','settings:view','settings:update',
];

// Role → permission matrix.
// NOTE: deliberate deviation from the reference seed — entity_representative
// also gets items:approve / items:reject: our confirmed business flow has the
// entity rep as the sole ent1 approver.
const ROLE_PERMISSION_MATRIX: Record<string, string[]> = {
  system_admin: PERMISSIONS,
  program_admin: PERMISSIONS.filter((p) => !p.startsWith('settings:')),
  entity_representative: ['entities:view','streams:view','items:view','items:create','items:update','items:submit','items:approve','items:reject','items:export','launch_plans:view','funding:view','nominations:view','reports:view','reports:export'],
  entity_admin: ['entities:view','entities:update','streams:view','items:view','items:create','items:update','items:submit','items:export','launch_plans:view','funding:view','nominations:view','reports:view','reports:export'],
  entity_coordinator: ['entities:view','streams:view','items:view','items:create','items:update','items:submit','items:export','launch_plans:view','funding:view','nominations:view','reports:view'],
  stream_owner: ['entities:view','streams:view','items:view','items:approve','items:reject','items:export','launch_plans:view','launch_plans:approve','funding:view','nominations:view','nominations:approve','nominations:reject','reports:view'],
  ai_committee: ['entities:view','streams:view','items:view','items:approve','items:reject','items:export','launch_plans:view','funding:view','funding:approve','funding:reject','funding:cancel','nominations:view','reports:view','reports:export','ai_review:run'],
  viewer: ['entities:view','streams:view','items:view','launch_plans:view','funding:view','nominations:view','reports:view'],
  auditor: ['entities:view','streams:view','items:view','items:export','launch_plans:view','funding:view','nominations:view','reports:view','reports:export','audit:view'],
};

// Legacy UI role key (users.role) → backend RBAC role code.
const LEGACY_TO_RBAC: Record<string, string> = {
  admin: 'system_admin',
  ai: 'ai_committee',
  entity: 'entity_representative',
  entity_admin: 'entity_admin',
  coord: 'entity_coordinator',
  path: 'stream_owner',
};

async function main() {
  // 0) RBAC roles, permissions and the role→permission matrix
  for (const [code, nameAr] of RBAC_ROLES) {
    await prisma.role.upsert({ where: { code }, update: { nameAr }, create: { code, nameAr } });
  }
  for (const code of PERMISSIONS) {
    await prisma.permission.upsert({ where: { code }, update: {}, create: { code } });
  }
  for (const [roleCode, permissionCodes] of Object.entries(ROLE_PERMISSION_MATRIX)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    for (const permissionCode of permissionCodes) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code: permissionCode } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  // 1) Streams (المسارات) + heads (رؤساء المسارات)
  for (const [i, p] of PATHS.entries()) {
    await prisma.stream.upsert({
      where: { id: p.id },
      update: { headName: PATH_REPS[p.id] || null },
      create: {
        id: p.id,
        nameAr: p.name,
        descAr: p.desc,
        headName: PATH_REPS[p.id] || null,
        sortOrder: i,
      },
    });
  }

  // 2) Entities (الجهات): session entity + the 34 federal entities
  const entityNames = Array.from(new Set([DEFAULT_ENTITY, ...FEDERAL_ENTITIES]));
  const entityIdByName = new Map<string, string>();
  for (const nameAr of entityNames) {
    const e = await prisma.entity.upsert({ where: { nameAr }, update: {}, create: { nameAr } });
    entityIdByName.set(nameAr, e.id);
  }

  // 3) Execution batches (المراحل الربعية الخمس)
  for (const [i, b] of execMilestones().entries()) {
    await prisma.execBatch.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        id: i + 1,
        nameAr: b.name,
        periodAr: b.period || '',
        descAr: b.desc || '',
        startsOn: b.start || '',
        endsOn: b.end || '',
      },
    });
  }

  // 4) Program phases (مراحل البرنامج)
  for (const [i, ph] of DEFAULT_PROGRAM_PHASES.entries()) {
    await prisma.programPhase.upsert({
      where: { idx: i + 1 },
      update: {},
      create: { idx: i + 1, nameAr: ph.n, descAr: ph.d, deadline: ph.deadline },
    });
  }

  // 5) Settings
  await prisma.setting.upsert({
    where: { key: 'approved_budget' },
    update: {},
    create: { key: 'approved_budget', value: String(APPROVED_BUDGET) },
  });

  // 6) Team setup for the session entity (ممثل الجهة الافتراضي)
  const sessionEntityId = entityIdByName.get(DEFAULT_ENTITY)!;
  await prisma.entityRep.upsert({
    where: { entityId: sessionEntityId },
    update: {},
    create: {
      entityId: sessionEntityId,
      name: 'أحمد محمد العامري',
      position: 'مدير إدارة التحول الرقمي',
      email: 'a.alameri@entity.gov.ae',
      phone: '+971 50 123 4567',
    },
  });
  for (const p of PATHS) {
    await prisma.streamOwner.upsert({
      where: { entityId_streamId: { entityId: sessionEntityId, streamId: p.id } },
      update: {},
      create: { entityId: sessionEntityId, streamId: p.id },
    });
  }

  // 6b) Users (المستخدمون) — realistic starter accounts keyed by email so IT
  // only re-points the email to the verified UAE PASS identity (or deactivates
  // and re-creates). Placeholder emails use the @aigp.gov.ae domain.
  // Each account keeps its legacy UI role key (users.role) AND is assigned the
  // matching backend RBAC role (user_roles) plus entity/stream scopes, active
  // and access-enabled so the enforced APIs accept them out of the box.
  const upsertUser = async (email: string, data: { role: string; name: string; title?: string; streamId?: string | null; entityId?: string | null }) => {
    const user = await prisma.user.upsert({
      where: { email },
      update: { status: 'active', accessEnabled: true, isActive: true },
      create: {
        email,
        role: data.role,
        name: data.name,
        title: data.title || '',
        streamId: data.streamId ?? null,
        entityId: data.entityId ?? null,
        status: 'active',
        accessEnabled: true,
      },
    });
    const roleCode = LEGACY_TO_RBAC[data.role];
    if (roleCode) {
      const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }
    if (data.entityId) {
      await prisma.userEntityScope.upsert({
        where: { userId_entityId: { userId: user.id, entityId: data.entityId } },
        update: {},
        create: { userId: user.id, entityId: data.entityId },
      });
    }
    if (data.streamId) {
      await prisma.userStreamScope.upsert({
        where: { userId_streamId: { userId: user.id, streamId: data.streamId } },
        update: {},
        create: { userId: user.id, streamId: data.streamId },
      });
    }
    return user;
  };

  // System administrator (مشرف النظام) — provisions stream heads & committee
  await upsertUser('admin@aigp.gov.ae', { role: 'admin', name: 'مشرف النظام', title: 'مسؤول المنصة' });

  // National committee (اللجنة الوطنية)
  await upsertUser('committee@aigp.gov.ae', { role: 'ai', name: 'اللجنة الوطنية للذكاء الاصطناعي', title: 'عضو اللجنة الوطنية' });

  // The five stream heads (رؤساء المسارات) — official names from PATH_REPS
  for (const p of PATHS) {
    await upsertUser(`head.${p.id}@aigp.gov.ae`, {
      role: 'path',
      name: PATH_REPS[p.id] || `رئيس مسار ${p.name}`,
      title: `رئيس مسار ${p.name}`,
      streamId: p.id,
    });
  }

  // Default entity: representative (ممثل الجهة) + one coordinator per stream
  await upsertUser('rep@aigp.gov.ae', {
    role: 'entity',
    name: 'أحمد محمد العامري',
    title: 'مدير إدارة التحول الرقمي',
    entityId: sessionEntityId,
  });
  for (const p of PATHS) {
    await upsertUser(`coord.${p.id}@aigp.gov.ae`, {
      role: 'coord',
      name: `منسق ${p.name}`,
      title: `منسق مسار ${p.name} في الجهة`,
      entityId: sessionEntityId,
      streamId: p.id,
    });
  }

  // 7+8) DEMO PORTFOLIO — sample launch plans + items. OFF by default:
  // production starts with an EMPTY portfolio (reference data + accounts
  // only). Set SEED_DEMO_ITEMS=1 for a demo/staging database.
  let created = 0;
  if (process.env.SEED_DEMO_ITEMS === '1') {
  // 7) Centrally managed launch plans (إدارة خطط الإطلاق)
  for (const lp of seedLaunchPlans()) {
    await prisma.launchPlan.upsert({
      where: { id: lp.id },
      update: {},
      create: {
        id: lp.id,
        batch: lp.batch,
        title: lp.title,
        ltype: lp.ltype,
        date: lp.date,
        desc: lp.desc,
        scope: lp.scope || '',
        budget: lp.budget || '',
        budgetAmount: lp.budget ? BigInt(parseBudget(lp.budget)) : null,
        launchBudget: lp.launchBudget || '',
      },
    });
  }

  // 8) Items — decomposed into relational rows
  for (const m of seedItems()) {
    const exists = await prisma.item.findUnique({ where: { id: m.id } });
    if (exists) continue;

    const entityName = entOf(m, DEFAULT_ENTITY);
    const entityId = entityIdByName.get(entityName) || sessionEntityId;
    const budgetAmount = m.budget ? BigInt(parseBudget(m.budget)) : null;

    await prisma.item.create({
      data: {
        id: m.id,
        type: m.type,
        streamId: m.path,
        entityId,
        title: m.title,
        desc: m.desc || '',
        wf: m.wf as never,
        approval: m.approval || 'مسودة',
        priority: m.priority,
        rank: m.rank ?? null,
        complexity: m.complexity,
        impact: m.impact,
        status: m.status,
        transformability: m.transformability,
        readiness: typeof m.readiness === 'number' ? String(m.readiness) : m.readiness,
        usageIntensity: m.usageIntensity,
        transformPriority: m.transformPriority,
        automationPct: m.automationPct ?? null,
        automationLevel: m.automationLevel,
        automationSystem: m.automationSystem,
        complexityLevel: m.complexityLevel,
        progress: m.progress ?? 0,
        scopeOfWork: m.scopeOfWork,
        budget: m.budget,
        budgetAmount,
        scopeApproval: m.scopeApproval,
        expectedOutputs: m.expectedOutputs,
        expectedOutcomes: m.expectedOutcomes,
        expectedImpact: m.expectedImpact,
        aiModels: m.aiModels ?? null,
        targetPct: m.targetPct ?? null,
        endDate: m.endDate,
        opType: m.opType,
        subActivities: m.subActivities,
        sector: m.sector,
        dept: m.dept,
        section: m.section,
        serviceOwner: m.serviceOwner,
        targetUsers: m.targetUsers,
        currentJourney: m.currentJourney,
        painPoints: m.painPoints,
        expectedImprovement: m.expectedImprovement,
        execBatch: m.execBatch,
        retType: m.ret?.type,
        retFrom: m.ret?.from,
        retNote: m.ret?.note,
        checklist: {
          create: (m.execChecklist || []).map((c, i) => ({
            key: c.key,
            label: c.label,
            status: c.status,
            newDate: c.newDate || null,
            reason: c.reason || null,
            sortOrder: i,
          })),
        },
        subMilestones: {
          create: (m.phases || [])
            .flatMap((ph) =>
              (ph.subs || [])
                .filter((sub) => (sub.name || '').trim())
                .map((sub) => ({
                  batchName: ph.name,
                  name: sub.name,
                  startsOn: sub.start || null,
                  endsOn: sub.end || null,
                }))
            ),
        },
        nomination: m.nom
          ? {
              create: {
                byName: m.nom.by,
                roleName: m.nom.role,
                streamId: m.nom.path || m.path,
                at: new Date(m.nom.at),
                direct: !!m.nom.direct,
              },
            }
          : undefined,
        funding: m.funded
          ? {
              create: {
                byName: m.funded.by,
                at: new Date(m.funded.at),
                direct: !!m.funded.direct,
              },
            }
          : undefined,
      },
    });

    // managed launch-plan memberships (one batch, possibly several launches)
    for (const lpId of m.launchPlanIds || []) {
      await prisma.itemLaunchPlan.upsert({
        where: { itemId_launchPlanId: { itemId: m.id, launchPlanId: lpId } },
        update: {},
        create: { itemId: m.id, launchPlanId: lpId },
      });
    }

    // launches: shared across items → upsert by (title, date), then join row
    for (const l of m.launches || []) {
      if (!(l.title || '').trim()) continue;
      const launch = await prisma.launch.upsert({
        where: { title_date: { title: l.title, date: l.date || '' } },
        update: {},
        create: {
          title: l.title,
          ltype: l.ltype,
          date: l.date || '',
          desc: l.desc || '',
          status: l.status || 'مخطط',
          done: !!l.done,
          doneAt: l.doneAt ? new Date(l.doneAt) : null,
        },
      });
      await prisma.itemLaunch.upsert({
        where: { itemId_launchId: { itemId: m.id, launchId: launch.id } },
        update: {},
        create: { itemId: m.id, launchId: launch.id, shared: !!l.shared },
      });
    }
    created++;
  }
  } // end SEED_DEMO_ITEMS

  // 9) General backfill: activate ALL existing users with valid legacy roles
  // and ensure they have matching user_roles + entity/stream scopes.
  const allUsers = await prisma.user.findMany({ where: { role: { not: '' } } });
  let backfilled = 0;
  for (const u of allUsers) {
    const roleCode = LEGACY_TO_RBAC[u.role];
    if (!roleCode) continue;
    // Activate the user
    await prisma.user.update({
      where: { id: u.id },
      data: { status: 'active', accessEnabled: true, isActive: true },
    });
    // Assign RBAC role
    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: u.id, roleId: role.id } },
        update: {},
        create: { userId: u.id, roleId: role.id },
      });
    }
    // Entity scope
    if (u.entityId) {
      await prisma.userEntityScope.upsert({
        where: { userId_entityId: { userId: u.id, entityId: u.entityId } },
        update: {},
        create: { userId: u.id, entityId: u.entityId },
      });
    }
    // Stream scope
    if (u.streamId) {
      await prisma.userStreamScope.upsert({
        where: { userId_streamId: { userId: u.id, streamId: u.streamId } },
        update: {},
        create: { userId: u.id, streamId: u.streamId },
      });
    }
    backfilled++;
  }
  console.log(`Backfilled ${backfilled} existing users with RBAC roles.`);

  const counts = {
    roles: await prisma.role.count(),
    permissions: await prisma.permission.count(),
    rolePermissions: await prisma.rolePermission.count(),
    users: await prisma.user.count(),
    userRoles: await prisma.userRole.count(),
    streams: await prisma.stream.count(),
    entities: await prisma.entity.count(),
    batches: await prisma.execBatch.count(),
    items: await prisma.item.count(),
    launches: await prisma.launch.count(),
    itemLaunches: await prisma.itemLaunch.count(),
    checklist: await prisma.execChecklistItem.count(),
    nominations: await prisma.nomination.count(),
    fundings: await prisma.funding.count(),
  };
  console.log(`Seeded (${created} new items):`, counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
