'use client';
// ============================================================================
// View-model — port of renderVals(). Reads the store and produces the derived
// object the components render from (mirrors the prototype's `{{ }}` holes).
// ============================================================================
import { useMemo } from 'react';
import { useStore, logicRole, actorName } from './store';
import {
  PATHS,
  ROLE,
  ROLE_PILLS,
  ROLE_INFO,
  TYPE,
  APPR,
  PRIO,
  PIC,
  NK,
  NIC,
  ALOG,
  pathById,
  typeLabel,
  typeLabelDef,
  availTypes,
  wfOf,
  wfMeta,
  stepIndexOf,
  transformScore,
  stageWeight,
  isEntityApproved,
  isProjInit,
  streamHasType,
  TBD_BATCH,
  execAllDone,
  parseBudget,
  formatMoney,
  APPROVED_BUDGET,
  RETURNED_STATUS,
  PATH_REPS,
  entOf,
  fmtDate,
  daysLeft,
  countdown,
  execMilestones,
  launchBatches,
  START_STATES,
  DEFAULT_PROGRAM_PHASES,
  TWO_STEP_PHASES,
  type Item,
  type RoleKey,
} from './domain';
import { stripHtml } from './richtext';
import { FEDERAL_ENTITIES } from './entities';

export function useViewModel() {
  const s = useStore();
  // subscribe to tick for countdown
  const tick = useStore((st) => st._tick);

  return useMemo(() => build(s), [s, tick]); // eslint-disable-line react-hooks/exhaustive-deps
}

export type VM = ReturnType<typeof build>;

type Store = ReturnType<typeof useStore.getState>;

function build(s: Store) {
  // the admin can flip into the monitoring dashboards: rendered with the
  // committee's all-seeing scope while a header button returns to the console
  const rawRole = s.role === 'admin' && s.ui.adminDash ? 'ai' : s.role;
  const role = logicRole(rawRole);
  const myPath = s.myPath;
  const entityName = s.entityName;
  const ui = s.ui;
  const myName = actorName(s);

  const ent = (i: Item) => entOf(i, entityName);

  // ---- base scoping (§8) ----
  let base: Item[];
  if (rawRole === 'coord') base = s.items.filter((i) => i.path === myPath && ent(i) === entityName);
  else if (role === 'path') base = s.items.filter((i) => i.path === myPath);
  else base = s.items;

  const effActivePath = role === 'path' ? myPath : ui.activePath;
  // stream that scopes the FILTER BAR options: heads/coordinators are locked to
  // their own stream; entity rep + committee follow the streams select.
  const filterStream = role === 'path' ? myPath : ui.navStream || effActivePath;

  // visibility of drafts / ent1 — this is the role's whole universe: KPIs and
  // stats must count from it too, or numbers won't match the visible cards
  let roleBase = base;
  if (rawRole === 'ai' || rawRole === 'path') {
    roleBase = base.filter((i) => {
      const w = wfOf(i);
      return w !== 'draft' && w !== 'ent1';
    });
  } else if ((rawRole === 'entity' || rawRole === 'entity_admin')) {
    roleBase = base.filter((i) => wfOf(i) !== 'draft');
  }
  let visible = roleBase.slice();
  if (effActivePath !== 'all') visible = visible.filter((i) => i.path === effActivePath);
  // sidebar stream selection (entity rep / committee) narrows the list too
  if (ui.navStream) visible = visible.filter((i) => i.path === ui.navStream);
  // a type filter that the selected stream doesn't offer falls back to «all»
  const effTypeFilter =
    ui.filter !== 'all' && ui.filter !== 'projinit' && filterStream !== 'all' && !streamHasType(filterStream, ui.filter as 'operation' | 'service')
      ? 'all'
      : ui.filter;
  if (effTypeFilter !== 'all')
    visible = visible.filter((i) =>
      effTypeFilter === 'projinit' ? isProjInit(i.type) : i.type === effTypeFilter
    );
  // status filter
  if (ui.statusFilter !== 'all') visible = visible.filter((i) => statusMatch(i, ui.statusFilter, rawRole, s));
  // committee-funding filter
  if (ui.fundFilter === 'funded') visible = visible.filter((i) => !!i.funded);
  else if (ui.fundFilter === 'notfunded') visible = visible.filter((i) => !i.funded);
  // free-text search over the title and description
  const q = (ui.search || '').trim();
  if (q) {
    const qq = q.toLowerCase();
    visible = visible.filter(
      (i) =>
        (i.title || '').toLowerCase().includes(qq) ||
        stripHtml(i.desc || '').toLowerCase().includes(qq)
    );
  }
  // entity filter (ai/path)
  if ((rawRole === 'ai' || rawRole === 'path') && ui.entFilter !== 'all')
    visible = visible.filter((i) => ent(i) === ui.entFilter);
  // step filter
  if (ui.stepFilter != null) visible = visible.filter((i) => stepIndexOf(i) === ui.stepFilter);
  // stage filter (المراحل) — including «للتحديد بعد الدراسة»
  if (ui.batchFilter) visible = visible.filter((i) => (i.execBatch || '') === ui.batchFilter);
  // stage order: المرحلة الأولى first, then الثانية … ; no stage / «للتحديد بعد الدراسة» last
  const msOrder = execMilestones().map((b) => b.name);
  const stageOrderOf = (i: Item) => {
    if (!i.execBatch || i.execBatch === TBD_BATCH) return msOrder.length;
    const idx = msOrder.indexOf(i.execBatch);
    return idx === -1 ? msOrder.length : idx;
  };
  visible.sort((a, b) => stageOrderOf(a) - stageOrderOf(b));

  // ---- KPI scope (counts what this role can actually see) ----
  const scope = filterStream === 'all' ? roleBase : roleBase.filter((i) => i.path === filterStream);
  const cnt = (f: (i: Item) => boolean) => scope.filter(f).length;
  const completion = scope.length
    ? Math.round(scope.reduce((a, i) => a + stageWeight(i), 0) / scope.length)
    : 0;
  const avgOf = (vals: number[]) =>
    vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  const completedCount = cnt((i) => wfOf(i) === 'done');
  const kpis = {
    total: scope.length,
    projInit: cnt((i) => isProjInit(i.type)),
    operations: cnt((i) => i.type === 'operation'),
    services: cnt((i) => i.type === 'service'),
    completion,
    // agentification metrics
    avgTargetPct: avgOf(scope.map((i) => i.targetPct).filter((v): v is number => v != null && v > 0)),
    avgAutomationPct: avgOf(scope.map((i) => i.automationPct).filter((v): v is number => v != null)),
    completedCount,
    completedPct: scope.length ? Math.round((completedCount / scope.length) * 100) : 0,
  };

  // ---- per-type delivery breakdown for the overview counts band ----
  const deliveryBreak = (pick: (i: Item) => boolean) => {
    const set = scope.filter(pick);
    return [
      { label: 'غير قابلة للتحويل', v: set.filter((i) => (i.transformability || '') === 'غير قابل').length },
      { label: 'قيد التطوير', v: set.filter((i) => devStatusOfItem(i) === 'underDev').length },
      { label: 'تم التطوير', v: set.filter((i) => devStatusOfItem(i) === 'developed').length },
      { label: 'تم الإطلاق', v: set.filter((i) => devStatusOfItem(i) === 'launched').length },
    ];
  };
  const kpiBreak = {
    total: deliveryBreak(() => true),
    projInit: deliveryBreak((i) => isProjInit(i.type)),
    operations: deliveryBreak((i) => i.type === 'operation'),
    services: deliveryBreak((i) => i.type === 'service'),
  };

  // ---- entity totals breakdown: type × stream ----
  const breakdown = PATHS.map((p) => {
    const inStream = roleBase.filter((i) => i.path === p.id);
    return {
      name: p.name,
      projInit: inStream.filter((i) => isProjInit(i.type)).length,
      operations: inStream.filter((i) => i.type === 'operation').length,
      services: inStream.filter((i) => i.type === 'service').length,
      total: inStream.length,
      hasOps: streamHasType(p.id, 'operation'),
      hasSvc: streamHasType(p.id, 'service'),
    };
  });
  const breakdownTotals = {
    name: 'الإجمالي',
    projInit: roleBase.filter((i) => isProjInit(i.type)).length,
    operations: roleBase.filter((i) => i.type === 'operation').length,
    services: roleBase.filter((i) => i.type === 'service').length,
    total: roleBase.length,
  };
  // total LAUNCH budget across the plans this portfolio participates in —
  // informational for the entity rep only (funding totals use execution cost)
  const entPlanIds = new Set(roleBase.flatMap((i) => i.launchPlanIds || []));
  const launchBudgetTotal = [...entPlanIds].reduce(
    (a, id) => a + parseBudget(s.launchPlans.find((p) => p.id === id)?.launchBudget),
    0
  );
  // matching EXECUTION total for the same portfolio (same no-double-count rule
  // as the committee: own item budgets + distinct plan execution budgets)
  const execBudgetTotal = roleBase.reduce((a, i) => a + parseBudget(i.budget), 0);

  // ---- entity overview cards (redesigned first + second sections) ----
  // Arabic dirham formatter for the dense per-stream cards
  const compactM = (n: number) => (n > 0 ? formatMoney(n) : '—');
  const grandBudget = execBudgetTotal + launchBudgetTotal;
  const eoExecPct = grandBudget ? Math.round((execBudgetTotal / grandBudget) * 100) : 0;
  const money = (n: number) => (n > 0 ? formatMoney(n) : '—');
  const costCard = {
    execLabel: money(execBudgetTotal),
    launchLabel: money(launchBudgetTotal),
    totalLabel: money(grandBudget),
    execPct: eoExecPct,
    launchPct: grandBudget ? 100 - eoExecPct : 0,
    execFrac: grandBudget ? Math.min(0.92, Math.max(0.08, execBudgetTotal / grandBudget)) : 0.67,
  };
  const notCap = roleBase.filter((i) => (i.transformability || '') === 'غير قابل').length;
  const inputsCard = {
    total: roleBase.length,
    capable: roleBase.length - notCap,
    underDev: roleBase.filter((i) => devStatusOfItem(i) === 'underDev').length,
    developed: roleBase.filter((i) => devStatusOfItem(i) === 'developed').length,
    launched: roleBase.filter((i) => devStatusOfItem(i) === 'launched').length,
    notCapable: notCap,
    capFrac: roleBase.length ? Math.min(0.94, Math.max(0.06, (roleBase.length - notCap) / roleBase.length)) : 0.75,
  };
  // nominations summary (stream head view) — what I nominated and its status
  const nomFundedN = roleBase.filter((i) => !!i.funded).length;
  const nomPendingN = roleBase.filter((i) => !!i.nom && !i.funded).length;
  const nomCard = {
    total: roleBase.length,
    nominated: nomFundedN + nomPendingN,
    funded: nomFundedN,
    pending: nomPendingN,
    notNominated: Math.max(0, roleBase.length - nomFundedN - nomPendingN),
  };
  // per-stream cards (نظرة عامة حسب المسارات) — all five streams
  const streamOverviewCards = PATHS.map((p) => {
    const inStream = roleBase.filter((i) => i.path === p.id);
    const execCost = inStream.reduce((a, i) => a + parseBudget(i.budget), 0);
    // attribute each launch plan's launch budget to streams by its items' share
    let launchCost = 0;
    s.launchPlans.forEach((pl) => {
      const planItems = roleBase.filter((i) => (i.launchPlanIds || []).includes(pl.id));
      if (!planItems.length) return;
      const share = planItems.filter((i) => i.path === p.id).length / planItems.length;
      launchCost += parseBudget(pl.launchBudget) * share;
    });
    return {
      id: p.id,
      name: p.name,
      icon: PIC[p.id],
      total: inStream.length,
      stages: launchBatches().map((b) => ({
        label: b.name.replace(/^إطلاق /, ''),
        n: inStream.filter((i) => i.execBatch === b.name).length,
      })),
      execLabel: compactM(execCost),
      launchLabel: compactM(launchCost),
      totalLabel: compactM(execCost + launchCost),
      onOpen: () => {
        s.setNavSection('all');
        s.setNavStream(p.id);
      },
    };
  });

  // per-TYPE cards (coordinator/stream-head view — التوزيع حسب نوع المدخل).
  // Scoped to the types the stream actually has: العمليات stream has no
  // services, so a coordinator there never sees «خدمة».
  const typeGroups = [
    { id: 'projinit', name: 'مشروع / مبادرة', icon: 'M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7', section: 'projects', match: (i: Item) => isProjInit(i.type) },
    ...(streamHasType(myPath, 'operation')
      ? [{ id: 'operation', name: 'عملية', icon: 'M3 6h18M3 12h18M3 18h18', section: 'operations', match: (i: Item) => i.type === 'operation' }]
      : []),
    ...(streamHasType(myPath, 'service')
      ? [{ id: 'service', name: 'خدمة', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z', section: 'services', match: (i: Item) => i.type === 'service' }]
      : []),
  ];
  // type keys available in the current stream (drives the type tabs/filters)
  const streamTypeKeys = ['projinit', ...typeGroups.filter((g) => g.id !== 'projinit').map((g) => g.id)];
  const typeOverviewCards = typeGroups.map((g) => {
    const inType = roleBase.filter(g.match);
    const execCost = inType.reduce((a, i) => a + parseBudget(i.budget), 0);
    let launchCost = 0;
    s.launchPlans.forEach((pl) => {
      const planItems = roleBase.filter((i) => (i.launchPlanIds || []).includes(pl.id));
      if (!planItems.length) return;
      const share = planItems.filter(g.match).length / planItems.length;
      launchCost += parseBudget(pl.launchBudget) * share;
    });
    return {
      id: g.id,
      name: g.name,
      icon: g.icon,
      total: inType.length,
      stages: launchBatches().map((b) => ({ label: b.name.replace(/^إطلاق /, ''), n: inType.filter((i) => i.execBatch === b.name).length })),
      execLabel: compactM(execCost),
      launchLabel: compactM(launchCost),
      totalLabel: compactM(execCost + launchCost),
      onOpen: () => s.setNavSection(g.section),
    };
  });

  // stage distribution (coordinator — التوزيع حسب المرحلة) with per-type tabs
  const stageDistFor = (match: (i: Item) => boolean) => {
    const items = roleBase.filter(match);
    return {
      total: items.length,
      stages: launchBatches().map((b) => {
        const inStage = items.filter((i) => i.execBatch === b.name);
        return {
          label: b.name.replace(/^إطلاق /, ''),
          n: inStage.length,
          typeBreak: [
            { label: 'مشروع / مبادرة', n: inStage.filter((i) => isProjInit(i.type)).length },
            { label: 'عملية', n: inStage.filter((i) => i.type === 'operation').length },
            { label: 'خدمة', n: inStage.filter((i) => i.type === 'service').length },
          ],
          statusBreak: [
            { label: 'قيد التطوير', n: inStage.filter((i) => devStatusOfItem(i) === 'underDev').length },
            { label: 'تم التطوير', n: inStage.filter((i) => devStatusOfItem(i) === 'developed').length },
            { label: 'تم الإطلاق', n: inStage.filter((i) => devStatusOfItem(i) === 'launched').length },
          ],
        };
      }),
    };
  };
  const stageDist = {
    all: stageDistFor(() => true),
    projinit: stageDistFor((i) => isProjInit(i.type)),
    operation: stageDistFor((i) => i.type === 'operation'),
    service: stageDistFor((i) => i.type === 'service'),
  };

  // committee per-stream cards (تفاصيل المسارات) — participation + type mix + cost
  const compactM0 = (n: number) => (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  const committeeStreamCards = PATHS.map((p) => {
    const inStream = roleBase.filter((i) => i.path === p.id);
    const execCost = inStream.reduce((a, i) => a + parseBudget(i.budget), 0);
    let launchCost = 0;
    s.launchPlans.forEach((pl) => {
      const planItems = roleBase.filter((i) => (i.launchPlanIds || []).includes(pl.id));
      if (!planItems.length) return;
      const share = planItems.filter((i) => i.path === p.id).length / planItems.length;
      launchCost += parseBudget(pl.launchBudget) * share;
    });
    const fundedCost = inStream.filter((i) => i.funded).reduce((a, i) => a + parseBudget(i.budget), 0);
    return {
      id: p.id,
      name: p.name,
      icon: PIC[p.id],
      entCount: new Set(inStream.map((i) => ent(i))).size,
      total: inStream.length,
      byType: [
        { label: 'مشروع / مبادرة', n: inStream.filter((i) => isProjInit(i.type)).length },
        { label: 'عملية', n: inStream.filter((i) => i.type === 'operation').length },
        { label: 'خدمة', n: inStream.filter((i) => i.type === 'service').length },
      ],
      totalCostLabel: compactM0(execCost + launchCost),
      fundedLabel: compactM0(fundedCost),
      onOpen: () => {
        s.setNavSection('all');
        s.setNavStream(p.id);
      },
    };
  });

  // per-stream distribution shown INSIDE the type KPI cards (entity view) —
  // every eligible stream is listed, including zeros
  const kpiDist = {
    total: breakdown.map((r) => ({ label: r.name, value: r.total })),
    projInit: breakdown.map((r) => ({ label: r.name, value: r.projInit })),
    operations: breakdown
      .filter((r) => r.hasOps)
      .map((r) => ({ label: r.name, value: r.operations })),
    services: breakdown
      .filter((r) => r.hasSvc)
      .map((r) => ({ label: r.name, value: r.services })),
  };

  // ---- entity ranking (committee dashboard): submissions per entity ----
  const entCountMap = new Map<string, number>();
  roleBase.forEach((i) => entCountMap.set(ent(i), (entCountMap.get(ent(i)) || 0) + 1));
  const entityRank = [...entCountMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // ---- per-batch (مرحلة) summary: items + total execution cost ----
  // short stream names + chip colours for the stage-distribution cards
  // one consistent brand colour for all streams (no rainbow of dots)
  const STREAM_META: Record<string, { short: string; color: string }> = {
    ops: { short: 'العمليات والدعم المؤسسي', color: '#2563EB' },
    strategy: { short: 'العمل الحكومي الاستراتيجي', color: '#2563EB' },
    services: { short: 'الخدمات', color: '#2563EB' },
    capacity: { short: 'بناء القدرات والتدريب', color: '#2563EB' },
    tech: { short: 'تقنيات الذكاء الاصطناعي والبيانات', color: '#2563EB' },
  };
  // مراحل التنفيذ / خطة الإطلاق title-row filters narrow the phase cards + their
  // contents. Role scope is already baked into roleBase; committee (ai)
  // filters by entity AND stream, stream-head (path) by entity only, entity
  // rep by stream only (their entity is fixed).
  let batchBase = roleBase;
  if ((rawRole === 'ai' || rawRole === 'path') && ui.execEnt !== 'all')
    batchBase = batchBase.filter((i) => ent(i) === ui.execEnt);
  if ((rawRole === 'ai' || (rawRole === 'entity' || rawRole === 'entity_admin')) && ui.execStream !== 'all')
    batchBase = batchBase.filter((i) => i.path === ui.execStream);
  const batchSummary = launchBatches().map((b) => {
    const inBatch = batchBase.filter((i) => i.execBatch === b.name);
    const cost = inBatch.reduce((a, i) => a + parseBudget(i.budget), 0);
    const launchTotal = s.launchPlans
      .filter((p) => p.batch === b.name)
      .reduce((a, p) => a + parseBudget(p.launchBudget), 0);
    return {
      name: b.name,
      displayName: b.name.replace(/^إطلاق /, ''),
      period: b.period || '',
      count: inBatch.length,
      opsCount: inBatch.filter((i) => i.type === 'operation').length,
      projCount: inBatch.filter((i) => isProjInit(i.type)).length,
      svcCount: inBatch.filter((i) => i.type === 'service').length,
      // drill-down into the portfolio pages filtered by this مرحلة
      composition: [
        { n: inBatch.filter((i) => isProjInit(i.type)).length, label: 'من المشاريع والمبادرات', section: 'projects' },
        { n: inBatch.filter((i) => i.type === 'operation').length, label: 'من العمليات', section: 'operations' },
        { n: inBatch.filter((i) => i.type === 'service').length, label: 'من الخدمات', section: 'services' },
      ]
        .filter((c) => c.n > 0)
        .map((c) => ({ ...c, onOpen: () => s.openBatchItems(b.name, c.section) })),
      onOpenAll: () => s.openBatchItems(b.name, 'all'),
      // stage-distribution breakdowns (entity rep view)
      typeBreak: [
        { label: 'المشاريع والمبادرات', n: inBatch.filter((i) => isProjInit(i.type)).length },
        { label: 'الخدمات', n: inBatch.filter((i) => i.type === 'service').length },
        { label: 'العمليات', n: inBatch.filter((i) => i.type === 'operation').length },
      ].filter((x) => x.n > 0),
      streamBreak: PATHS.map((p) => ({
        short: STREAM_META[p.id]?.short || p.name,
        name: p.name,
        color: STREAM_META[p.id]?.color || '#2563EB',
        n: inBatch.filter((i) => i.path === p.id).length,
      })).filter((x) => x.n > 0),
      costLabel: cost > 0 ? formatMoney(cost) : '—',
      launchCostLabel: launchTotal > 0 ? formatMoney(launchTotal) : '—',
      // delivery mapping: how far this مرحلة's assignments have progressed
      underDev: inBatch.filter((i) => devStatusOfItem(i) === 'underDev').length,
      developed: inBatch.filter((i) => devStatusOfItem(i) === 'developed').length,
      launched: inBatch.filter((i) => devStatusOfItem(i) === 'launched').length,
      awaiting: inBatch.filter((i) => devStatusOfItem(i) === null).length,
      // each launch in the مرحلة with its costs (entity rep + coordinator)
      launches: s.launchPlans
        .filter((p) => p.batch === b.name)
        .map((p) => {
          // scoped to the viewer: the launch's execution total is the sum of
          // the items THIS role can see, so it always matches the card totals
          const visItems = batchBase.filter((i) => (i.launchPlanIds || []).includes(p.id));
          const visCost = visItems.reduce((a, i) => a + parseBudget(i.budget), 0);
          // scope chips: which streams/entities this launch spans (role-scoped)
          const launchStreams = Array.from(new Set(visItems.map((i) => pathById(i.path).name)));
          const launchEntities = Array.from(new Set(visItems.map((i) => ent(i))));
          return {
            id: p.id,
            title: p.title || 'خطة إطلاق جديدة',
            streams: launchStreams,
            entities: launchEntities,
            execLabel: visCost > 0 ? formatMoney(visCost) : '—',
            launchLabel: parseBudget(p.launchBudget) > 0 ? formatMoney(parseBudget(p.launchBudget)) : '',
            // launch-plan (خطة الإطلاق) display fields
            budgetLabel: parseBudget(p.launchBudget) > 0 ? formatMoney(parseBudget(p.launchBudget)) : '—',
            count: visItems.length,
            // launch-together rule: the whole launch is launched only when every entry is
            launched: visItems.length > 0 && visItems.every((i) => devStatusOfItem(i) === 'launched'),
            items: visItems.map((i) => {
              const ds = devStatusOfItem(i);
              return {
                id: i.id,
                title: i.title,
                typeLabel: typeLabel(i.type),
                streamName: pathById(i.path).name,
                entityName: ent(i),
                budgetLabel: (i.budget || '').trim() || 'لم يتم تحديد الميزانية',
                launched: ds === 'launched',
                status: (ds === 'launched' ? 'done' : ds === 'developed' ? 'launch' : 'dev') as 'dev' | 'launch' | 'done',
                onOpen: () => s.openDetail(i.id),
              };
            }),
          };
        })
        .filter((l) => l.items.length > 0),
    };
  });

  // ---- role flags ----
  const isAiRole = rawRole === 'ai';
  const showRail = (rawRole === 'entity' || rawRole === 'entity_admin');
  const showAddBtn = rawRole === 'coord';
  const showBasket = rawRole === 'ai' || rawRole === 'path';
  const showEntFilter = rawRole === 'ai' || rawRole === 'path';

  // ---- path rail ----
  const railPaths = PATHS.filter((p) => role !== 'path' || p.id === myPath);
  const pathRail = railPaths.map((p) => {
    const count = roleBase.filter((i) => i.path === p.id).length;
    const active = ui.activePath === p.id;
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      icon: PIC[p.id],
      count,
      active,
      onClick: () => s.setActivePath(p.id),
    };
  });
  const totalCount = ui.navStream
    ? roleBase.filter((i) => i.path === ui.navStream).length
    : effActivePath !== 'all'
      ? roleBase.filter((i) => i.path === effActivePath).length
      : roleBase.length;

  // ---- active path title + summary ----
  const activePathName: string =
    effActivePath === 'all'
      ? 'لوحة المتابعة'
      : (role === 'path' ? 'مسار ' : '') + pathById(effActivePath).name;
  const streamSummary = summaryText(effActivePath);
  // scope-aware type enumeration — replaces the generic word "عناصر"
  const typesPhrase =
    filterStream === 'all'
      ? 'المشاريع والمبادرات والعمليات والخدمات'
      : 'المشاريع والمبادرات' +
        (streamHasType(filterStream, 'operation') ? ' والعمليات' : '') +
        (streamHasType(filterStream, 'service') ? ' والخدمات' : '');

  // ---- empty-state copy: nothing entered yet (role-specific) vs filters ----
  const emptyDesc =
    scope.length === 0
      ? (rawRole === 'entity' || rawRole === 'entity_admin')
        ? 'لم يقم منسقو المسارات في جهتكم بإضافة أي من ' + typesPhrase + ' حتى الآن.'
        : rawRole === 'ai' || rawRole === 'path'
          ? 'لم تقم الجهات بإضافة أي من ' + typesPhrase + ' حتى الآن.'
          : 'يمكنكم البدء بالإضافة من زر «إضافة جديدة» أو عبر رفع ملف خطة العمل.'
      : rawRole === 'coord'
        ? 'لا توجد نتائج مطابقة للمرشحات الحالية — يمكنكم تعديل المرشحات أو الإضافة من زر «إضافة جديدة».'
        : 'لا توجد نتائج مطابقة للمرشحات الحالية — يمكنكم تعديل المرشحات أو البحث.';

  // ---- type filter tabs ----
  const tabs = tabDefs(filterStream, scope);

  // status filter options — ai/path (oversight roles) drop the action/pending
  // options they can't act on
  const statusOptions =
    rawRole === 'coord'
      ? [
          { v: 'all', label: 'جميع الحالات' },
          { v: 'draft', label: 'مسودة' },
          { v: 'pending', label: 'قيد الاعتماد' },
          { v: 'review', label: 'للمراجعة' },
          { v: 'inprog', label: 'قيد التنفيذ' },
          { v: 'done', label: 'تم الإطلاق' },
        ]
      : (rawRole === 'entity' || rawRole === 'entity_admin')
        ? [
            { v: 'all', label: 'جميع الحالات' },
            { v: 'approve', label: 'للاعتماد' },
            { v: 'inprog', label: 'قيد التنفيذ' },
            { v: 'done', label: 'تم الإطلاق' },
          ]
        : [
            { v: 'all', label: 'جميع الحالات' },
            { v: 'inprog', label: 'قيد التنفيذ' },
            { v: 'done', label: 'تم الإطلاق' },
          ];

  // committee-funding filter (entity rep)
  const fundOptions = [
    { v: 'all', label: 'حالة التمويل: الكل' },
    { v: 'funded', label: 'معتمد للتمويل من اللجنة' },
    { v: 'notfunded', label: 'غير معتمد للتمويل' },
  ];

  // stage filter (المراحل) — the four launch stages + «للتحديد بعد الدراسة»
  const batchFilterOptions = [
    { v: 'all', label: 'جميع المراحل' },
    ...launchBatches().map((b) => ({ v: b.name, label: b.name.replace(/^إطلاق /, '') })),
    { v: TBD_BATCH, label: TBD_BATCH },
  ];

  // path filter (ai only) + entity filter options
  const pathOptions = [{ v: 'all', label: 'جميع المسارات' }, ...PATHS.map((p) => ({ v: p.id, label: p.name }))];
  const entValues = Array.from(new Set([...s.items.map((i) => ent(i)), entityName]));
  // the filter-bar options follow the selected stream: only entities and input
  // types that actually exist in that stream are offered
  const entScope = filterStream === 'all' ? s.items : s.items.filter((i) => i.path === filterStream);
  const entFilterValues = filterStream === 'all' ? entValues : Array.from(new Set(entScope.map((i) => ent(i))));
  const entOptions = [{ v: 'all', label: 'جميع الجهات' }, ...entFilterValues.map((e) => ({ v: e, label: e }))];
  const typeOptions = [
    { v: 'all', label: 'جميع الأنواع' },
    { v: 'projinit', label: 'مشروع / مبادرة' },
    ...(filterStream === 'all' || streamHasType(filterStream, 'operation') ? [{ v: 'operation', label: 'عملية' }] : []),
    ...(filterStream === 'all' || streamHasType(filterStream, 'service') ? [{ v: 'service', label: 'خدمة' }] : []),
  ];
  // is any filter currently active (drives the reset button + count)
  const anyFilterActive = ui.activePath !== 'all' || ui.filter !== 'all' || ui.statusFilter !== 'all' || ui.fundFilter !== 'all' || (ui.entFilter && ui.entFilter !== 'all') || !!ui.batchFilter || !!(ui.search || '').trim();

  // ---- cards ----
  // ---- sidebar navigation (§redesign v2) ----
  const navSection = ui.navSection || 'overview';
  const navStream = ui.navStream; // selected stream summary card ('all' = null)
  const batchFilter = ui.batchFilter; // drill-down from a مرحلة card
  const devStatusOf = devStatusOfItem;
  const agentifiable = (i: Item) => (i.transformability || '') !== 'غير قابل';
  const bucketOf = (section: string) => (i: Item) =>
    section === 'all'
      ? true
      : section === 'projects'
        ? isProjInit(i.type)
        : section === 'operations'
          ? i.type === 'operation'
          : i.type === 'service';
  const roleStreams =
    rawRole === 'coord' || rawRole === 'path' ? PATHS.filter((p) => p.id === myPath) : PATHS;
  // Icons (mirroring the side-menu design)
  const NAV_HOME = 'M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5';
  const NAV_DOTS = 'M5 6h.01M12 6h.01M19 6h.01M5 12h.01M12 12h.01M19 12h.01M5 18h.01M12 18h.01M19 18h.01';
  const NAV_FOLDER = 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z';
  const NAV_SLIDERS = 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6';
  const NAV_GRID4 = 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z';
  const NAV_CAL = 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z';
  const NAV_ROCKET = 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5';
  const NAV_BUILDING = 'M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01';
  const NAV_PEOPLE = 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75';

  // «الكل» sub-menu: entity rep + committee drill down by STREAM (full names);
  // coordinator + stream head drill down by input TYPE
  const streamSub = (rawRole === 'entity' || rawRole === 'entity_admin') || rawRole === 'ai';
  // entry counts per nav item (role-scoped portfolio)
  const cntStream = (pid: string) => roleBase.filter((i) => i.path === pid).length;
  const cntProjects = roleBase.filter((i) => isProjInit(i.type)).length;
  const cntOperations = roleBase.filter((i) => i.type === 'operation').length;
  const cntServices = roleBase.filter((i) => i.type === 'service').length;
  const subNav = streamSub
    ? roleStreams.map((p) => ({
        key: 'stream:' + p.id,
        label: p.name,
        icon: PIC[p.id],
        sub: true,
        count: cntStream(p.id),
        active: navSection === 'all' && navStream === p.id,
        onClick: () => {
          s.setNavSection('all');
          s.setNavStream(p.id);
        },
      }))
    : [
        { key: 'projects', label: 'المشاريع والمبادرات', icon: NAV_FOLDER, sub: true, count: cntProjects },
        ...(roleStreams.some((p) => streamHasType(p.id, 'operation'))
          ? [{ key: 'operations', label: 'العمليات', icon: NAV_SLIDERS, sub: true, count: cntOperations }]
          : []),
        ...(roleStreams.some((p) => streamHasType(p.id, 'service'))
          ? [{ key: 'services', label: 'الخدمات', icon: NAV_GRID4, sub: true, count: cntServices }]
          : []),
      ];

  const navItems = [
    { key: 'overview', label: 'الرئيسية', icon: NAV_HOME },
    { key: 'all', label: streamSub ? 'جميع المسارات' : 'جميع الأنواع', icon: NAV_DOTS, count: roleBase.length, active: navSection === 'all' && !navStream, onClick: () => s.setNavSection('all') },
    ...subNav,
    { key: 'launchplans', label: 'مراحل التنفيذ', icon: NAV_CAL },
    { key: 'lplan', label: 'خطة الإطلاق', icon: NAV_ROCKET },
    ...(rawRole === 'ai' || rawRole === 'path' ? [{ key: 'entities', label: 'الجهات المشاركة', icon: NAV_BUILDING }] : []),
    ...((rawRole === 'entity' || rawRole === 'entity_admin') ? [{ key: 'team', label: 'فريق العمل', icon: NAV_PEOPLE }] : []),
  ].map((n) => ({
    sub: false,
    count: undefined as number | undefined,
    active: navSection === n.key,
    onClick: n.key === 'team' ? () => s.openTeam() : () => s.setNavSection(n.key),
    ...n,
  }));

  const typeSections: Record<string, string> = {
    all: 'جميع المدخلات',
    projects: 'المشاريع والمبادرات',
    operations: 'العمليات',
    services: 'الخدمات',
  };
  const isTypeSection = navSection in typeSections;
  // committee/stream-head entity filter applies to the whole portfolio page
  const portfolioBase =
    (rawRole === 'ai' || rawRole === 'path') && ui.entFilter !== 'all'
      ? roleBase.filter((i) => ent(i) === ui.entFilter)
      : roleBase;
  // stream summary cards on top of portfolio pages — «الكل» first, clickable filters
  const portfolioStreams = !isTypeSection
    ? []
    : [
        { id: null as string | null, name: 'الكل' },
        ...roleStreams
          .filter((p) =>
            navSection === 'operations'
              ? streamHasType(p.id, 'operation')
              : navSection === 'services'
                ? streamHasType(p.id, 'service')
                : true
          )
          .map((p) => ({ id: p.id as string | null, name: p.name })),
      ].map((st) => {
        const inScope = portfolioBase.filter(
          (i) =>
            bucketOf(navSection)(i) &&
            (st.id ? i.path === st.id : true) &&
            (batchFilter ? i.execBatch === batchFilter : true)
        );
        return {
          ...st,
          total: inScope.length,
          active: (navStream || null) === st.id,
          onClick: () => s.setNavStream(st.id),
        };
      })
      // hide zero-count streams except «الكل» when the coord's own stream (single) —
      // keep all for consistency; multi-stream roles see all five
      ;
  // recap strip for the active selection
  const portfolioScope = !isTypeSection
    ? []
    : portfolioBase.filter(
        (i) =>
          bucketOf(navSection)(i) &&
          (navStream ? i.path === navStream : true) &&
          (batchFilter ? i.execBatch === batchFilter : true)
      );
  const recap = {
    total: portfolioScope.length,
    notCapable: portfolioScope.filter((i) => !agentifiable(i)).length,
    underDev: portfolioScope.filter((i) => devStatusOf(i) === 'underDev').length,
    developed: portfolioScope.filter((i) => devStatusOf(i) === 'developed').length,
    launched: portfolioScope.filter((i) => devStatusOf(i) === 'launched').length,
  };
  // list inside the portfolio page (respects search + status + fund filters)
  const sectionCards = !isTypeSection
    ? []
    : portfolioScope
        .filter((i) => (ui.statusFilter !== 'all' ? statusMatch(i, ui.statusFilter, rawRole, s) : true))
        .filter((i) =>
          ui.fundFilter === 'funded' ? !!i.funded : ui.fundFilter === 'notfunded' ? !i.funded : true
        )
        .filter((i) => {
          const q2 = (ui.search || '').trim().toLowerCase();
          if (!q2) return true;
          return (i.title || '').toLowerCase().includes(q2) || stripHtml(i.desc || '').toLowerCase().includes(q2);
        })
        .sort((a, b) => stageOrderOf(a) - stageOrderOf(b))
        .map((i) => mkCard(i, s, { rawRole, role, myName, ent }));

  // committee «الجهات» page: one card per entity
  const entityCards =
    rawRole !== 'ai' && rawRole !== 'path'
      ? []
      : [...new Set(roleBase.map((i) => ent(i)))].map((e) => {
          const inEnt = roleBase.filter((i) => ent(i) === e);
          const execBudget = inEnt.reduce((a, i) => a + parseBudget(i.budget), 0);
          const fundedItems = inEnt.filter((i) => !!i.funded);
          const approvedCost = fundedItems.reduce((a, i) => a + parseBudget(i.budget), 0);
          // committee: broken down across every stream (full names, fixed order);
          // stream head: by type, only the types his stream carries (items are
          // already scoped to his stream via roleBase)
          const byStream =
            rawRole === 'path'
              ? [
                  { name: 'المشاريع والمبادرات', count: inEnt.filter((i) => isProjInit(i.type)).length },
                  ...(streamHasType(myPath, 'operation')
                    ? [{ name: 'العمليات', count: inEnt.filter((i) => i.type === 'operation').length }]
                    : []),
                  ...(streamHasType(myPath, 'service')
                    ? [{ name: 'الخدمات', count: inEnt.filter((i) => i.type === 'service').length }]
                    : []),
                ]
              : PATHS.map((p) => ({ name: p.name, count: inEnt.filter((i) => i.path === p.id).length }));
          return {
            name: e,
            total: inEnt.length,
            byStreamTitle: rawRole === 'path' ? 'المدخلات حسب النوع' : 'المدخلات حسب المسار',
            byStream,
            // stream head: nominations he made in this entity (pending funding)
            myNominated:
              rawRole === 'path'
                ? inEnt.filter((i) => !!i.nom && !i.funded && i.nom.by === myName).length
                : null,
            funded: fundedItems.length,
            approvedCostLabel: approvedCost > 0 ? formatMoney(approvedCost) : '—',
            execBudgetLabel: execBudget > 0 ? formatMoney(execBudget) : '—',
            onOpen: () => {
              s.setNavSection('all');
              s.setEntFilter(e);
            },
          };
        }).sort((a, b) => b.total - a.total);

  const cards = visible.map((i) => mkCard(i, s, { rawRole, role, myName, ent }));

  // bulk-assign selection state (change vs first assignment)
  const assignSelItems = s.items.filter((i) => ui.assignSel.includes(i.id));
  const assignSelBatches = Array.from(
    new Set(assignSelItems.map((i) => i.execBatch).filter((b): b is string => !!b))
  );
  const assignIsChange = assignSelItems.length > 0 && assignSelItems.every((i) => !!i.execBatch);

  // ---- committee analytics ----
  // Scope to what the committee actually sees (roleBase drops draft + ent1),
  // so the headline «إجمالي المدخلات» reconciles with every list/breakdown below.
  const aiBase = roleBase;
  const withScore = aiBase.filter((i) => wfOf(i) !== 'draft');
  const scores = withScore.map((i) => transformScore(i).v);
  const sumV = scores.reduce((a, b) => a + b, 0);
  const n = scores.length || 1;
  // spent budget = own budgets of committee-funded items + each funded launch
  // plan's group budget counted ONCE (items without an own budget share it)
  // plan budgets are DERIVED from item budgets, so totals sum items directly
  const fundedItems = aiBase.filter((i) => i.funded);
  const spentBudget = fundedItems.reduce((a, i) => a + parseBudget(i.budget), 0);
  const aiNomByCommittee = (i: Item) =>
    !!i.nom && (!!i.nom.direct || i.nom.role === 'اللجنة الوطنية' || i.nom.by === 'اللجنة الوطنية');
  const aiStats = {
    entCount: new Set(aiBase.map((i) => ent(i))).size,
    total: aiBase.length,
    // the committee acts only on stream-head nominations, not on raw submissions
    nominated: aiBase.filter((i) => !!i.nom && !i.funded).length,
    nominatedHeads: aiBase.filter((i) => !!i.nom && !i.funded && !aiNomByCommittee(i)).length,
    nominatedCommittee: aiBase.filter((i) => !!i.nom && !i.funded && aiNomByCommittee(i)).length,
    funded: aiBase.filter((i) => i.funded).length,
    avg: Math.round((sumV / n) * 10) / 10,
    avgPct: Math.round((sumV / n / 5) * 100),
    now: scores.filter((v) => v >= 4.2).length,
    wait: scores.filter((v) => v >= 2 && v < 4.2).length,
    low: scores.filter((v) => v < 2).length,
    // budget cards
    approvedBudget: APPROVED_BUDGET,
    approvedBudgetLabel: formatMoney(APPROVED_BUDGET),
    spentBudget,
    spentBudgetLabel: formatMoney(spentBudget),
    remainingBudgetLabel: formatMoney(Math.max(0, APPROVED_BUDGET - spentBudget)),
    budgetPct: APPROVED_BUDGET ? Math.min(100, Math.round((spentBudget / APPROVED_BUDGET) * 100)) : 0,
  };

  // participating entities — ranked by number of inputs submitted (committee view).
  // entities with zero submissions never appear.
  const entityRanking = (() => {
    const counts = new Map<string, number>();
    roleBase.forEach((i) => {
      const name = ent(i);
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    const rows = [...counts.entries()]
      .map(([name, n]) => ({ name, n }))
      .filter((r) => r.n > 0)
      .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'ar'));
    const max = rows.length ? rows[0].n : 1;
    return rows.map((r, idx) => ({ ...r, frac: r.n / max, top: idx === 0 }));
  })();

  // ---- program steps + countdown ----
  const programSteps = buildProgramSteps(s, base);
  const firstMs = execMilestones()[0];
  const cd = countdown(firstMs.end!);
  const dl = daysLeft(firstMs.end!);
  const banner = {
    title: 'تقدم مشروع الذكاء الاصطناعي المساعد',
    // big page heading shown ABOVE the blue box; the coordinator sees his stream
    pageTitle:
      rawRole === 'coord' || rawRole === 'path'
        ? 'مسار ' + pathById(myPath).name
        : (rawRole === 'entity' || rawRole === 'entity_admin')
          ? 'لوحة متابعة مدخلات الجهة'
          : 'مشروع الذكاء الاصطناعي المساعد',
    // small title inside the blue box
    boxTitle: 'ملخص التقدم',
    subtitle:
      (rawRole === 'entity' || rawRole === 'entity_admin')
        ? 'متابعة مدخلات الجهة حسب المسارات، مراحل التقدم، وحالة الاعتماد.'
        : rawRole === 'coord'
          ? 'متابعة مدخلات المسار حسب النوع، المرحلة، حالة التطوير والتكلفة التقديرية.'
          : rawRole === 'path'
            ? 'مراجعة مدخلات جميع الجهات ضمن المسار وترشيح الأنسب للتمويل.'
            : 'رحلة منظمة من الحصر والاختيار إلى التنفيذ وقياس الأثر لضمان تحول فعّال ومؤثر',
    firstMsName: firstMs.name,
    // top-bar countdown display copy (assessment/review phase closing)
    countdownLabel: 'مرحلة التقييم والمراجعة',
    countdownCaption: 'المتبقي على إغلاق التقييم',
    firstMsPeriod: firstMs.period,
    curPhaseDeadlineFmt: fmtDate(firstMs.end),
    cd,
    daysLeft: dl,
    deadlineColor: dl <= 3 ? '#DC2B38' : dl <= 7 ? '#B45309' : '#0B8A4B',
  };

  // ---- notifications ----
  const notifs = buildNotifs(s, base, { rawRole, role, myName, ent });
  const readSet = new Set(s.readNotifs);
  const notifUnread = notifs.filter((notif) => !readSet.has(notif.id)).length;
  const unreadLabel = notifUnread > 9 ? '9+' : String(notifUnread);

  // ---- role pills (active styles) ----
  const rolePills = ROLE_PILLS.map((p) => ({
    key: p.key,
    label: p.label,
    active: rawRole === p.key,
    onClick: () => s.setRole(p.key),
  }));

  // ---- basket ----
  const basket = buildBasket(s, { rawRole, myName, ent });

  // ---- detail ----
  const detail = ui.detailId ? buildDetail(s, ui.detailId, { rawRole, role, ent }) : null;

  // ---- create modal derived ----
  const modal = buildModal(s);

  // rep display (entity rep — used in the team panel)
  const repName = s.setup.rep.name || 'ممثل الجهة';
  const repPos = s.setup.rep.position || '';
  const repInitials = repName.split(/\s+/).slice(0, 2).map((w) => w[0]).join('') || 'م';

  // header profile identity follows the previewed role
  const profileName =
    rawRole === 'path'
      ? PATH_REPS[myPath] || 'رئيس المسار'
      : rawRole === 'ai'
        ? 'اللجنة الوطنية'
        : rawRole === 'admin'
          ? 'مشرف النظام'
          : rawRole === 'coord'
            ? s.setup.owners[myPath]?.name || 'منسق المسار في الجهة'
            : repName;
  const profilePos =
    rawRole === 'path'
      ? 'رئيس مسار ' + pathById(myPath).name
      : rawRole === 'ai'
        ? ROLE.ai.sub
        : rawRole === 'admin'
          ? ROLE.admin.sub
          : rawRole === 'coord'
            ? 'منسق مسار ' + pathById(myPath).name
            : repPos;
  const profileInitials =
    profileName.split(/\s+/).slice(0, 2).map((w) => w[0]).join('') || 'م';

  // ---- admin console (لوحة المشرف) ----
  const isAdmin = rawRole === 'admin';
  const roleOrder: RoleKey[] = ['admin', 'ai', 'path', 'entity', 'coord'];
  const streamName = (id?: string) => (id ? pathById(id).name : '');
  const adminUsers = [...s.users]
    .sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role) || a.name.localeCompare(b.name, 'ar'))
    .map((u) => ({
      ...u,
      roleLabel: ROLE[u.role]?.label || u.role,
      roleBadge: ROLE[u.role]?.badge || '#64748B',
      roleBg: ROLE[u.role]?.bg || '#EEF2F7',
      streamLabel: streamName(u.streamId),
      scopeLabel: [u.entityName, streamName(u.streamId)].filter(Boolean).join(' · ') || '—',
      initials: u.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('') || 'م',
    }));
  const admin = {
    users: adminUsers,
    roleInfo: ROLE_INFO,
    streams: PATHS.map((p) => ({ id: p.id, name: p.name })),
    entities: Array.from(new Set([entityName, ...FEDERAL_ENTITIES])),
    counts: {
      total: s.users.length,
      active: s.users.filter((u) => u.active).length,
      heads: s.users.filter((u) => u.role === 'path').length,
      committee: s.users.filter((u) => u.role === 'ai').length,
    },
    saveUser: (u: (typeof s.users)[number]) => s.adminSaveUser(u),
    toggleUser: (id: string) => s.adminToggleUser(id),
    removeUser: (id: string) => s.adminRemoveUser(id),
  };

  return {
    isAdmin,
    adminReturn: s.role === 'admin' && !!s.ui.adminDash,
    admin,
    // view
    view: s.view,
    isLogin: s.view === 'login',
    isSetup: s.view === 'setup',
    isDashboard: s.view === 'dashboard',
    lang: s.lang,
    entityName,
    // header
    role: rawRole,
    roleLabel: ROLE[rawRole].label,
    rolePills,
    showRoleSwitcher: process.env.NEXT_PUBLIC_DEMO_MODE === '1',
    // coordinator assigned to several streams: header dropdown to switch the
    // ACTIVE stream (everything on screen is scoped to it)
    streamSwitcher: {
      show: rawRole === 'coord' && (s.myPaths?.length || 0) > 1,
      value: myPath,
      options: (s.myPaths?.length ? s.myPaths : [myPath]).map((id) => ({ v: id, label: pathById(id).name })),
    },
    repName,
    repPos,
    repInitials,
    profileName,
    profilePos,
    profileInitials,
    notifs,
    notifOpen: ui.notifOpen,
    notifUnread,
    unreadLabel,
    hasUnread: notifUnread > 0,
    profileOpen: ui.profileOpen,
    showBasket,
    basketBadge: basket.pendingCount,
    hasBasketBadge: basket.pendingCount > 0,
    basketOpen: ui.basketOpen,
    // banner + steps — the program journey banner is for the working roles
    // (entity/coord); oversight roles (committee, stream rep) don't see it
    showProgramBanner: (rawRole === 'entity' || rawRole === 'entity_admin') || rawRole === 'coord' || rawRole === 'path',
    banner,
    programSteps,
    isAiRole,
    // rail + kpis
    showRail,
    pathRail,
    totalCount,
    shownCount: visible.length,
    activePathAll: ui.activePath === 'all',
    activePathName,
    streamSummary,
    typesPhrase,
    kpis,
    breakdown,
    breakdownTotals,
    kpiDist,
    batchSummary,
    showLaunchCosts: (rawRole === 'entity' || rawRole === 'entity_admin') || rawRole === 'coord' || rawRole === 'ai',
    launchBudgetTotalLabel: formatMoney(launchBudgetTotal),
    showLaunchBudget: launchBudgetTotal > 0,
    execBudgetTotalLabel: formatMoney(execBudgetTotal),
    showExecBudget: execBudgetTotal > 0,
    grandBudgetTotalLabel: formatMoney(execBudgetTotal + launchBudgetTotal),
    execBudgetTotal,
    launchBudgetTotal,
    costCard,
    inputsCard,
    nomCard,
    streamOverviewCards,
    typeOverviewCards,
    streamTypeKeys,
    stageDist,
    committeeStreamCards,
    showOpsKpi: filterStream === 'all' || streamHasType(filterStream, 'operation'),
    showSvcKpi: filterStream === 'all' || streamHasType(filterStream, 'service'),
    notAiRole: !isAiRole,
    // filters
    tabs,
    filterValue: effTypeFilter,
    statusOptions,
    statusFilterValue: ui.statusFilter,
    emptyDesc,
    navItems,
    navSection,
    navStream,
    kpiBreak,
    sectionTitle:
      navSection === 'all' && ui.navStream
        ? 'مدخلات مسار ' + pathById(ui.navStream).name
        : navSection === 'all'
          ? (rawRole === 'entity' || rawRole === 'entity_admin')
            ? 'جميع مدخلات الجهة'
            : rawRole === 'coord'
              ? 'جميع مدخلات المسار'
              : rawRole === 'ai'
                ? 'قائمة الاعتماد والتمويل'
                : (navSection in typeSections ? typeSections[navSection] : '') || ''
          : (navSection in typeSections ? typeSections[navSection] : '') || '',
    portfolioStreams,
    recap,
    sectionCards,
    entityCards,
    // stage items manager: role-visible items that can be assigned to a مرحلة
    stageAssignItems: roleBase
      .filter((i) => agentifiable(i))
      .map((i) => ({
        id: i.id,
        title: i.title,
        typeLabel: typeLabel(i.type),
        // «للتحديد بعد الدراسة» counts as unplanned in the stage-planning modal
        batch: i.execBatch === TBD_BATCH ? '' : i.execBatch || '',
      })),
    // active مرحلة drill-down chip on portfolio pages
    batchChip: batchFilter
      ? { label: batchFilter.replace(/^إطلاق /, ''), onClear: () => s.setBatchFilter(null) }
      : null,
    launchedCount: roleBase.filter((i) => devStatusOfItem(i) === 'launched').length,
    fundOptions,
    fundFilterValue: ui.fundFilter,
    batchFilterOptions,
    batchFilterValue: ui.batchFilter || 'all',
    entityRank,
    // entity rep, all-streams view: type counts expand to per-stream totals
    showStreamDist: (rawRole === 'entity' || rawRole === 'entity_admin') && filterStream === 'all',
    showFundFilter: (rawRole === 'entity' || rawRole === 'entity_admin'),
    searchValue: ui.search,
    pathOptions,
    pathFilterValue: ui.navStream || ui.activePath,
    typeOptions,
    anyFilterActive,
    showEntFilter,
    entOptions,
    entFilterValue: ui.entFilter,
    // مراحل التنفيذ / خطة الإطلاق title-row filters
    execFilter: {
      ent: ui.execEnt,
      stream: ui.execStream,
      entOptions: [{ v: 'all', label: 'كل الجهات' }, ...entValues.map((e) => ({ v: e, label: e }))],
      streamOptions: [{ v: 'all', label: 'كل المسارات' }, ...PATHS.map((p) => ({ v: p.id, label: p.name }))],
      // filters per role: committee = entities + streams, stream head =
      // entities only, entity rep = streams only (their entity is fixed)
      showEnt: rawRole === 'ai' || rawRole === 'path',
      showStream: rawRole === 'ai' || (rawRole === 'entity' || rawRole === 'entity_admin'),
      // scope-info chips on launch cards/entries follow the same logic
      showStreamInfo: rawRole === 'ai' || (rawRole === 'entity' || rawRole === 'entity_admin'),
      showEntInfo: rawRole === 'ai' || rawRole === 'path',
      // «المسار» breakdown row in exec phase cards is only meaningful across streams
      // (committee spans all streams; an entity spans several within itself)
      showStreamBreak: rawRole === 'ai' || (rawRole === 'entity' || rawRole === 'entity_admin'),
      setEnt: (v: string) => s.setExecEnt(v),
      setStream: (v: string) => s.setExecStream(v),
    },
    showAddBtn,
    // committee
    aiStats,
    entityRanking,
    // cards
    cards,
    // basket + fund bar
    basket,
    fundBarShow: (rawRole === 'ai' || rawRole === 'path') && ui.fundSel.length > 0,
    fundSelCount: ui.fundSel.length,
    fundBarActionLabel: 'ترشيح للتمويل',
    // coordinator bulk-assign bar + modal — re-selecting planned items reads as
    // a CHANGE, not a fresh assignment
    assignBar: {
      show: rawRole === 'coord' && ui.assignSel.length > 0,
      count: ui.assignSel.length,
      actionLabel: assignIsChange ? 'تغيير خطة التنفيذ والإطلاق' : 'تعيين خطة التنفيذ والإطلاق',
    },
    assignModal: ui.assign
      ? {
          batch: ui.assign.batch,
          isChange: assignIsChange,
          currentBatches: assignSelBatches,
          batchOptions: launchBatches().map((b) => ({
            name: b.name,
            label: (b.period ? b.name + ' · ' + b.period : b.name).replace(/^إطلاق /, ''),
          })),
        }
      : null,
    // detail
    detail,
    detailOpen: !!ui.detailId,
    // create modal
    modal,
    modalOpen: ui.modalOpen,
    // launch-plan manager (إدارة خطط الإطلاق)
    launchPlansOpen: ui.launchPlansOpen,
    launchPlanMgr: launchBatches().map((b) => ({
      batch: b.name,
      period: b.period || '',
      plans: s.launchPlans
        .filter((p) => p.batch === b.name)
        .map((p) => ({
          ...p,
          // items that can be launched in this plan — non-agentifiable
          // (غير قابل) items carry no launch plan
          items: roleBase
            .filter((i) => (i.transformability || '') !== 'غير قابل')
            .map((i) => ({
            id: i.id,
            title: i.title,
            typeLabel: typeLabel(i.type),
            checked: (i.launchPlanIds || []).includes(p.id),
            otherBatch: !!i.execBatch && i.execBatch !== p.batch,
            launched: devStatusOfItem(i) === 'launched',
            // the item's own EXECUTION cost — editable inline in the manager
            budget: i.budget || '',
            hasBudget: !!(i.budget || '').trim(),
          })),
        })),
    })),
    // team panel
    teamOpen: ui.teamOpen,
    tmRep: s.setup.rep,
    tmOwners: PATHS.map((p) => ({
      color: p.color,
      name: p.name,
      ownerName: s.setup.owners[p.id]?.self ? repName : s.setup.owners[p.id]?.name || 'لم يُعيّن',
      ownerPos: s.setup.owners[p.id]?.self ? repPos : s.setup.owners[p.id]?.position || '—',
    })),
    // deadlines modal
    deadlinesOpen: ui.deadlinesOpen,
    deadlineRows: s.programPhases.map((p, i) => ({
      num: String(i + 1),
      name: p.n,
      deadline: p.deadline,
      onName: (v: string) => s.setPhaseName(i, v),
      onSet: (v: string) => s.setPhaseDeadline(i, v),
    })),
    // rank modal
    rankOpen: ui.rankOpen,
    rankRows: ui.rankRows.map((r, i) => ({
      id: r.id,
      title: r.title,
      num: String(i + 1),
      idx: i,
    })),
    // reject/req modal
    reqModal: ui.reqModal,
    confirmModal: ui.confirmModal,
    // cancel fund modal
    cancelFund: ui.cancelFund,
    cancelFundTitle: ui.cancelFund ? (s.items.find((i) => i.id === ui.cancelFund!.id)?.title || '') : '',
    // sub review (scope)
    subReview: ui.subReview,
    // toast
    toastMsg: ui.toastMsg,
    hasToast: !!ui.toastMsg,
    // setup wizard
    setupStep: ui.setupStep,
    // raw store passthrough for actions
    store: s,
  };
}

// ---------------------------------------------------------------------------
function statusMatch(i: Item, f: string, rawRole: RoleKey, s: Store): boolean {
  const w = wfOf(i);
  const role = logicRole(rawRole);
  if (f === 'mine') {
    const canAct = (rawRole === 'entity' || rawRole === 'entity_admin') && w === 'ent1';
    return canAct || (role === 'path' && (['draft', 'budget', 'exec', 'launch'].includes(w) || !!i.ret));
  }
  if (f === 'pending') return ['ent1', 'pm1', 'ent2', 'pm2'].includes(w);
  if (f === 'planned') return ['exec', 'launch', 'budget'].includes(w);
  // simplified role statuses
  if (f === 'review')
    return rawRole === 'coord' ? !!i.ret : ['pm1', 'pm2', 'ent2'].includes(w) || !!i.ret;
  if (f === 'approve') return w === 'ent1';
  if (f === 'inprog') return ['budget', 'exec', 'launch'].includes(w);
  return w === f;
}

// simplified delivery status; null = not yet in the delivery pipeline.
// «غير قابل للتحول» items never enter the pipeline — they count under
// غير قابل للتحول only, unless their transformability is changed.
function devStatusOfItem(i: Item): 'underDev' | 'developed' | 'launched' | null {
  if ((i.transformability || '') === 'غير قابل') return null;
  const w = wfOf(i);
  if (w === 'done') return 'launched';
  if (w === 'launch') return 'developed';
  if (w === 'budget' || w === 'exec') return 'underDev';
  return null;
}

function summaryText(activePath: string): string {
  if (activePath === 'ops') return 'إجمالي المشاريع والمبادرات والعمليات';
  if (activePath === 'services') return 'إجمالي المشاريع والمبادرات والخدمات';
  if (activePath === 'all') return 'إجمالي المشاريع والمبادرات والعمليات والخدمات';
  return 'إجمالي المشاريع والمبادرات';
}

function tabDefs(activePath: string, _scope: Item[]) {
  // project & initiative are one merged bucket
  const defs: { key: string; label: string; optLabel: string }[] = [
    { key: 'all', label: 'جميع الأنواع', optLabel: 'جميع الأنواع' },
    { key: 'projinit', label: 'المشاريع / المبادرات', optLabel: 'المشاريع / المبادرات' },
  ];
  if (activePath === 'all' || streamHasType(activePath, 'operation'))
    defs.push({ key: 'operation', label: 'العمليات', optLabel: 'العمليات' });
  if (activePath === 'all' || streamHasType(activePath, 'service'))
    defs.push({ key: 'service', label: 'الخدمات', optLabel: 'الخدمات' });
  return defs;
}

// ---- action timestamps (real log times; stable synthesized fallback for seed) ----
function stableHash(id: string): number {
  let h = 0;
  for (let k = 0; k < id.length; k++) h = (h * 31 + id.charCodeAt(k)) | 0;
  return Math.abs(h);
}
const REF_NOW = Date.parse('2026-07-02T09:30:00Z');
function itemTimes(i: Item): { submittedAt: number; approvedAt: number } {
  const log = i.log || [];
  const sub = log.find((e) => e.action === 'submit' || e.action === 'budget');
  const app = log.find((e) => e.action === 'approve');
  if (sub || app) return { submittedAt: sub?.at ?? app?.at ?? REF_NOW, approvedAt: app?.at ?? 0 };
  const h = stableHash(i.id);
  const submittedAt = REF_NOW - ((h % 6) + 2) * 86400000 - (h % 8) * 3600000 - (h % 13) * 60000;
  const approvedAt = submittedAt + 86400000 + (h % 6) * 3600000 + (h % 11) * 60000;
  return { submittedAt, approvedAt };
}
const AR_MONTHS_SHORT = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
function hhmm(ms: number): string {
  const d = new Date(ms);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function fmtDateTime(ms: number): string {
  if (!ms) return '';
  return fmtDate(ms) + ' · ' + hhmm(ms);
}
function fmtStampShort(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  return d.getDate() + ' ' + AR_MONTHS_SHORT[d.getMonth()] + ' · ' + hhmm(ms);
}

type Ctx = { rawRole: RoleKey; role: RoleKey; myName: string; ent: (i: Item) => string };

function mkCard(i: Item, s: Store, ctx: Ctx) {
  const { rawRole, role, myName, ent } = ctx;
  const t = TYPE[i.type];
  const p = pathById(i.path);
  const wm = wfMeta(i);
  const appr = APPR[i.approval] || APPR['مسودة'];
  const prio = PRIO[i.priority || 'متوسطة'] || PRIO['متوسطة'];
  const w = wfOf(i);
  const score = transformScore(i);
  const step = stepIndexOf(i);
  const canApprove = (rawRole === 'entity' || rawRole === 'entity_admin') && w === 'ent1';
  const isFunded = !!i.funded;
  // status chip mirrors the real lifecycle exactly:
  // مسودة → بحاجة إلى تعديل → بانتظار اعتماد ممثل الجهة → مخطط · المرحلة N → مكتمل
  const isReturned = !!i.ret;
  const batchShort = (i.execBatch || '').replace('إطلاق ', '');
  let wfLabel = wm.label;
  let wfChip = wm.chip;
  let wfBg = wm.bg;
  if (isReturned) {
    wfLabel = RETURNED_STATUS;
    wfChip = '#B45309';
    wfBg = '#FFF3DE';
  } else if (w === 'exec' || w === 'launch') {
    wfLabel = batchShort ? 'معتمد · ' + batchShort : 'معتمد';
    wfChip = '#2563EB';
    wfBg = '#EAF0FE';
  }
  const showSelectCheck =
    ['exec', 'launch', 'done'].includes(w) && ((rawRole === 'ai' && !i.funded) || (rawRole === 'path' && !i.nom && !i.funded));
  // every card shows an execution batch + (optional) launch plan
  const msNames = execMilestones();
  // only show the real batch — no synthetic fallback
  const batchLabel = i.execBatch || '';
  const named = (i.launches || []).filter((l) => (l.title || '').trim());
  const launchLabel = named.length
    ? named[0].title + (named.length > 1 ? ' (+' + (named.length - 1) + ')' : '')
    : '';

  const launchNames = (i.launchPlanIds || [])
    .map((pid) => (s.launchPlans.find((p) => p.id === pid)?.title || '').trim())
    .filter(Boolean);

  // ---- design-handover card state: (role, workflow) → status key + caption + action ----
  // status keys: draft|pendEnt|apprEnt|rejEnt|nominated|pendFund|apprFund|launched
  const recoBand: 'reco' | 'wait' = score.color === '#0B8A4B' ? 'reco' : 'wait';
  const recoPct = Math.round((score.v / 5) * 100);
  const isRet = !!i.ret;
  const nomByMe = !!i.nom && i.nom.by === myName;
  // committee-specific overrides (task: committee labels win for rawRole 'ai')
  let pillLabel = ''; // '' → component falls back to the generic status-pill label
  let recoStripLabel = recoBand === 'reco' ? 'موصى به للتمويل · ' + recoPct + '%' : score.ar;
  let cardStatus:
    | 'draft'
    | 'pendEnt'
    | 'apprEnt'
    | 'rejEnt'
    | 'nominated'
    | 'pendFund'
    | 'apprFund'
    | 'launched';
  let cardCaption: string;
  let cardAction:
    | 'edit'
    | 'withdraw'
    | 'editResubmit'
    | 'viewDetails'
    | 'approveInfoReject'
    | 'nominate'
    | 'cancelNom'
    | 'fundTick'
    | 'fundApproveReject'
    | 'funded'
    | 'none';
  if (rawRole === 'coord') {
    if (w === 'draft' && isRet) {
      cardStatus = 'rejEnt';
      cardCaption = 'مرفوض — يتطلب تعديلاً';
      cardAction = 'editResubmit';
    } else if (w === 'draft') {
      cardStatus = 'draft';
      cardCaption = 'مسودة — قيد التعبئة';
      cardAction = 'edit';
    } else if (w === 'ent1') {
      cardStatus = 'pendEnt';
      cardCaption = 'بانتظار اعتماد الجهة';
      cardAction = 'withdraw';
    } else if (isFunded) {
      cardStatus = 'apprFund';
      cardCaption = '';
      cardAction = 'viewDetails';
    } else if (w === 'done') {
      cardStatus = 'launched';
      cardCaption = 'تم الإطلاق';
      cardAction = 'viewDetails';
    } else {
      cardStatus = 'apprEnt';
      cardCaption = 'معتمد من الجهة';
      cardAction = 'viewDetails';
    }
  } else if ((rawRole === 'entity' || rawRole === 'entity_admin')) {
    if (w === 'draft' && isRet) {
      cardStatus = 'rejEnt';
      cardCaption = 'مرفوض من الجهة';
      cardAction = 'viewDetails';
    } else if (w === 'ent1') {
      cardStatus = 'pendEnt';
      cardCaption = 'بانتظار الاعتماد — إجراء مطلوب';
      cardAction = 'approveInfoReject';
    } else if (isFunded) {
      cardStatus = 'apprFund';
      cardCaption = '';
      cardAction = 'viewDetails';
    } else if (w === 'done') {
      cardStatus = 'launched';
      cardCaption = 'تم الإطلاق';
      cardAction = 'viewDetails';
    } else {
      cardStatus = 'apprEnt';
      cardCaption = 'معتمد — رُفع للأعلى';
      cardAction = 'viewDetails';
    }
  } else if (rawRole === 'path') {
    if (w === 'done') {
      cardStatus = 'launched';
      cardCaption = 'تم الإطلاق';
      cardAction = 'viewDetails';
    } else if (isFunded) {
      cardStatus = 'apprFund';
      cardCaption = '';
      cardAction = 'viewDetails';
    } else if (i.nom) {
      cardStatus = 'nominated';
      cardCaption = nomByMe ? 'مُرشَّح بواسطتي' : 'مُرشَّح للتمويل';
      cardAction = nomByMe ? 'cancelNom' : 'viewDetails';
    } else {
      cardStatus = 'apprEnt';
      cardCaption = 'معتمد من الجهة — متاح للترشيح';
      cardAction = 'nominate';
    }
  } else {
    // rawRole === 'ai' (اللجنة الوطنية / committee)
    if (w === 'done') {
      cardStatus = 'launched';
      cardCaption = 'تم الإطلاق';
      cardAction = 'viewDetails';
    } else if (isFunded) {
      cardStatus = 'apprFund';
      cardCaption = '';
      cardAction = 'funded';
      pillLabel = 'معتمد للتمويل';
    } else {
      cardStatus = 'pendFund';
      cardCaption = '';
      cardAction = 'fundApproveReject';
      pillLabel = 'قيد مراجعة التمويل';
    }
  }

  return {
    id: i.id,
    // design-handover card state
    cardStatus,
    cardCaption,
    cardAction,
    // committee: item already past funding approval (funded or launched) →
    // its selection box is a locked, gray, checked, non-clickable mark
    fundLocked: rawRole === 'ai' && (!!i.funded || w === 'done'),
    recoBand,
    pillLabel,
    recoStripLabel,
    title: i.title,
    desc: stripHtml(i.desc || ''),
    launchNames,
    stageMoved: !!i.stageMove,
    typeLabel: t.label,
    typeColor: t.color,
    typeBg: t.bg,
    pathName: p.name,
    pathColor: p.color,
    // stream is already shown once in the footer dot-row — no separate «المسار: …» line
    showPathLine: false,
    approval: i.approval,
    apprBg: appr.bg,
    apprColor: appr.c,
    wfLabel,
    wfChip,
    wfBg,
    isReturned: rawRole === 'coord' && !!i.ret,
    retBannerLabel: 'ملاحظات ممثل الجهة',
    retNote: i.ret ? i.ret.note || (i.ret.type === 'info' ? 'طُلبت تفاصيل إضافية' : 'تمت الإعادة للتعديل') : '',
    retFrom: i.ret?.from || '',
    stepBadge: 'المرحلة ' + step,
    priority: i.priority,
    prioBg: prio.bg,
    prioColor: prio.c,
    complexity: i.complexity,
    impact: i.impact,
    progress: i.progress || 0,
    endDateFmt: fmtDate(i.endDate),
    isOp: i.type === 'operation',
    transformability: i.transformability,
    automationTxt: 'أتمتة ' + (i.automationPct || 0) + '%',
    canApprove,
    menuOpen: s.ui.menuOpenId === i.id,
    entityName: ent(i),
    showEntity: rawRole === 'ai',
    footLabel: rawRole === 'ai' ? ent(i) : p.name,
    scoreV: score.v,
    scoreLabel: score.ar,
    scoreColor: score.color,
    scoreExpl: score.expl,
    showPathCta: rawRole === 'coord' && ['draft', 'exec', 'launch'].includes(w),
    pathCtaLabel: pathCta(w, !!i.ret),
    // basket flags — nomination is visible only to the committee (to act) and
    // the stream rep (their own); coord/entity never see a pending nomination,
    // only the committee's funding decision.
    isNominated: !!i.nom && !i.funded && (rawRole === 'ai' || rawRole === 'path'),
    canWithdrawNom: rawRole === 'path' && !!i.nom && !i.funded && i.nom?.by === myName,
    isFunded,
    isFundedCommittee: rawRole === 'ai' && isFunded,
    isFundedOther: rawRole !== 'ai' && isFunded,
    canDeclineNom: rawRole === 'ai' && !!i.nom && !i.funded && !i.nom?.direct,
    // committee can approve a pending nomination straight from the card
    canFundNom: rawRole === 'ai' && !!i.nom && !i.funded,
    onFundNom: () => s.fundItem(i.id, !!i.nom?.direct),
    showSelectCheck,
    fundChecked: s.ui.fundSel.includes(i.id),
    fundCheckBorder: s.ui.fundSel.includes(i.id) ? '#2563EB' : '#C7D1E2',
    fundCheckBg: s.ui.fundSel.includes(i.id) ? '#2563EB' : '#fff',
    // execution batch + launch plan meta (shown on every card)
    batchLabel,
    launchLabel,
    // coordinator bulk-assign checkbox
    showAssignCheck: rawRole === 'coord',
    assignChecked: s.ui.assignSel.includes(i.id),
    onToggleAssignSel: () => s.toggleAssignSel(i.id),
    nomBy: i.nom?.by || '',
    nomStream: i.nom ? pathById(i.nom.path || i.path).name : '',
    // unified nomination badge — drop person names; show the FULL stream name.
    // (committee spec: «مرشحة للجنة الوطنية · [اسم المسار الكامل]»)
    nomLabel:
      rawRole === 'path'
        ? 'مُرشّح للتمويل'
        : 'مرشحة للجنة الوطنية · ' + pathById(i.nom?.path || i.path).name,
    // time of the last status change (shown next to the status chip)
    statusStamp:
      w === 'ent1'
        ? fmtStampShort(itemTimes(i).submittedAt)
        : ['exec', 'launch', 'done'].includes(w)
          ? fmtStampShort(itemTimes(i).approvedAt)
          : '',
    // handlers
    onOpen: () => s.openDetail(i.id),
    onApprove: () => s.approveItem(i.id),
    onMenu: () => s.toggleMenu(i.id),
    canDelete: rawRole === 'coord' && ((w === 'draft' && !i.ret) || w === 'ent1'),
    onDelete: () => s.deleteItem(i.id),
    onWithdrawToDraft: () => s.withdrawToDraft(i.id),
    onReqInfo: () => s.reqInfoItem(i.id),
    onReject: () => s.rejectItem(i.id),
    onPathCta: () => s.openDetail(i.id),
    onToggleFundSel: () => s.toggleFundSel(i.id),
    onNominate: () => s.nominateItem(i.id),
    onWithdrawNom: () => s.withdrawNom(i.id),
    onDeclineNom: () => s.declineNom(i.id),
    onCancelFund: () => s.openCancelFund(i.id),
  };
}

function pathCta(w: string, ret: boolean): string {
  if (w === 'draft') return ret ? 'تعديل المدخل وإعادة إرساله' : 'إكمال وإرسال';
  if (w === 'exec') return 'تحديث حالة التطوير';
  return 'تحديث خطة الإطلاق';
}

function buildProgramSteps(s: Store, base: Item[]) {
  const rawRole = s.role;
  const twoStep = rawRole === 'ai' || rawRole === 'path';
  const phases = twoStep ? TWO_STEP_PHASES : s.programPhases;
  const cur = twoStep ? (s.programStep >= 3 ? 2 : 1) : s.programStep || 1;
  const respFor = (num: number): string => {
    // two-step stepper (ai / path): the committee interfaces with the entity
    // rep for both approval and execution, so both steps show ممثل الجهة.
    if (twoStep) return 'ممثل الجهة';
    return ({ 1: 'منسق المسار في الجهة', 2: 'ممثل الجهة', 3: 'منسق المسار في الجهة' } as Record<number, string>)[num] || '';
  };
  const fnum = (num: number) => (twoStep ? (num === 2 ? 3 : 1) : num);
  const countFor = (num: number): number => {
    if (twoStep) return base.filter((i) => (num === 2 ? stepIndexOf(i) >= 3 : stepIndexOf(i) < 3)).length;
    return base.filter((i) => stepIndexOf(i) === num).length;
  };
  return phases.map((ph, idx) => {
    const num = idx + 1;
    const state = num < cur ? 'done' : num === cur ? 'active' : 'todo';
    return {
      num: String(num),
      label: ph.n,
      resp: respFor(num),
      stepCount: countFor(num),
      state,
      isDone: state === 'done',
      statusLabel: state === 'done' ? 'مكتملة' : state === 'active' ? 'جارية الآن' : 'قادمة',
      deadlineFmt: fmtDate(ph.deadline),
      onStepFilter: () => s.toggleStepFilter(fnum(num)),
      active: s.ui.stepFilter === fnum(num),
    };
  });
}

function buildNotifs(s: Store, base: Item[], ctx: Ctx) {
  const { rawRole, role, myName, ent } = ctx;
  const rows: {
    id: string;
    kind: string;
    iconBg: string;
    iconColor: string;
    icon: string;
    title: string;
    sub: string;
    act?: boolean;
    onOpen: () => void;
  }[] = [];
  const push = (id: string, kind: string, icon: string, title: string, sub: string, itemId?: string, act?: boolean) => {
    const k = NK[kind] || NK.info;
    rows.push({ id, kind, iconBg: k.bg, iconColor: k.c, icon: NIC[icon], title, sub, act, onOpen: () => (itemId ? s.openNotifItem(itemId) : s.toggleNotifs()) });
  };
  const dleft = daysLeft(s.phase.deadline);
  push(
    'deadline',
    dleft <= 7 ? 'warn' : 'info',
    'clock',
    dleft <= 7 ? 'تبقّى ' + dleft + ' يوم فقط على مهلة المرحلة' : 'المهلة النهائية للمرحلة بعد ' + dleft + ' يوم',
    'المرحلة الأولى — تسجيل وتجميع البيانات · ' + fmtDate(s.phase.deadline)
  );
  base.forEach((i) => {
    const w = wfOf(i);
    const tl = typeLabel(i.type);
    if (rawRole === 'ai') {
      if (i.nom && !i.funded) push('n-' + i.id, 'info', 'inbox', 'ترشيح جديد في السلة من ' + (i.nom.by || ''), tl + ' · ' + i.title + ' · ' + ent(i), i.id);
    } else if ((rawRole === 'entity' || rawRole === 'entity_admin')) {
      if (w === 'ent1') push('ent1-' + i.id, 'info', 'send', typeLabel(i.type) + ' بانتظار اعتماد ممثل الجهة', tl + ' · ' + i.title + ' · ' + pathById(i.path).name, i.id, true);
      if (w === 'ent2') push('ent2-' + i.id, 'info', 'wallet', 'ميزانية ونطاق عمل بانتظار اعتماد ممثل الجهة', tl + ' · ' + i.title + ' · ' + pathById(i.path).name, i.id, true);
      if (i.funded && ent(i) === s.entityName) push('f-' + i.id, 'ok', 'wallet', 'ستتكفّل اللجنة الوطنية بتكلفة تحويل ' + typeLabelDef(i.type), tl + ' · ' + i.title + ' · يبقى التنفيذ من مسؤولية الجهة', i.id);
      if (i.fundCancel && !i.funded && ent(i) === s.entityName) push('fc-' + i.id, 'alert', 'wallet', 'أُلغي تمويل ' + typeLabelDef(i.type) + ' من اللجنة الوطنية', tl + ' · ' + i.title + ' · السبب: ' + i.fundCancel.reason, i.id);
    } else {
      if (i.funded && i.nom && i.nom.by === myName) push('mf-' + i.id, 'ok', 'wallet', 'اعتمدت اللجنة الوطنية تمويل ترشيحك', tl + ' · ' + i.title, i.id);
      if (i.fyi) push('fy-' + i.id, 'info', 'inbox', 'للعلم: تعديل من ممثل الجهة — بانتظار اعتماد اللجنة الوطنية', tl + ' · ' + i.title, i.id);
      if (i.ret) push('r-' + i.id, 'alert', 'rotate', (i.ret.type === 'info' ? 'طلب تفاصيل إضافية من ' : 'تمت الإعادة من ') + (i.ret.from || ''), tl + ' · ' + i.title + (i.ret.note ? ' · ' + i.ret.note : ''), i.id);
      if (i.stageMove)
        push(
          'sm-' + i.id,
          'info',
          'rotate',
          'نُقل بين المراحل: من ' + i.stageMove.from + ' إلى ' + i.stageMove.to,
          tl + ' · ' + i.title + ' · بواسطة ' + i.stageMove.by,
          i.id
        );
      if (w === 'budget' && !i.ret) push('bud-' + i.id, 'info', 'wallet', 'اعتُمدت الأولوية — أدخل الميزانية ونطاق العمل', tl + ' · ' + i.title, i.id);
      if (w === 'exec') push('x-' + i.id, 'ok', 'check', typeLabelDef(i.type) + ' في مرحلة التنفيذ — حدّث الحالة', tl + ' · ' + i.title, i.id);
      if (w === 'launch') push('l-' + i.id, 'info', 'send', typeLabelDef(i.type) + ' في مرحلة الإطلاق — أكمل خطة الإطلاق', tl + ' · ' + i.title, i.id);
    }
  });
  const readSet = new Set(s.readNotifs);
  const itemIdFromNotif = (id: string) => id.slice(id.indexOf('-') + 1);
  return rows.map((r) => {
    const iid = itemIdFromNotif(r.id);
    return {
      ...r,
      unread: !readSet.has(r.id),
      onApprove: () => s.approveItem(iid),
      onReject: () => s.rejectItem(iid),
      onReqInfo: () => s.reqInfoItem(iid),
    };
  });
}

function buildBasket(s: Store, ctx: { rawRole: RoleKey; myName: string; ent: (i: Item) => string }) {
  const { rawRole, myName, ent } = ctx;
  const isCom = rawRole === 'ai';
  const parseB = (b?: string) => {
    const n = parseInt((b || '').replace(/[^\d]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  };
  // a nomination raised by the committee itself (vs by a stream head)
  const isComNom = (i: Item) =>
    !!i.nom && (!!i.nom.direct || i.nom.role === 'اللجنة الوطنية' || i.nom.by === 'اللجنة الوطنية');

  const mk = (i: Item) => {
    const cost = parseB(i.budget);
    const nomName = i.nom?.by || i.funded?.by || '';
    const byCommittee = nomName === 'اللجنة الوطنية' || isComNom(i) || !!i.funded?.direct;
    return {
      id: i.id,
      title: i.title,
      typeLabel: typeLabel(i.type),
      entity: ent(i),
      pathName: pathById(i.path).name,
      costLabel: cost > 0 ? formatMoney(cost) : '—',
      nomName,
      // unified badge — no person names (names live in the item detail only)
      nomByLine: byCommittee
        ? 'مرشحة للجنة الوطنية · ' + pathById(i.path).name
        : 'مرشحة من رئيس المسار · ' + pathById(i.path).name,
      approved: !!i.funded,
      onOpen: () => s.openDetail(i.id),
      onApprove: () => s.fundItem(i.id, isComNom(i)),
      onDecline: () => s.declineNom(i.id),
      onWithdraw: () => s.withdrawNom(i.id),
    };
  };

  const headsSrc = s.items.filter((i) => i.nom && !i.funded && !isComNom(i));
  const comSrc = s.items.filter((i) => i.nom && !i.funded && isComNom(i));
  const appSrc = s.items.filter((i) => i.funded);
  const myNomsSrc = s.items.filter((i) => i.nom && !i.funded && i.nom.by === myName);
  const myAppSrc = s.items.filter((i) => i.funded && i.nom && i.nom.by === myName);

  const active = s.ui.basketTab;
  const tabs = isCom
    ? [
        { id: 'heads' as const, label: 'مرشح من قبل رؤساء المسارات', count: headsSrc.length },
        { id: 'committee' as const, label: 'مرشح من قبل اللجنة الوطنية', count: comSrc.length },
        { id: 'approved' as const, label: 'معتمد للتمويل', count: appSrc.length },
      ]
    : [
        { id: 'heads' as const, label: 'ترشيحاتي', count: myNomsSrc.length },
        { id: 'approved' as const, label: 'المعتمدة للتمويل', count: myAppSrc.length },
      ];
  const srcMap: Record<string, Item[]> = isCom
    ? { heads: headsSrc, committee: comSrc, approved: appSrc }
    : { heads: myNomsSrc, committee: [], approved: myAppSrc };
  const items = (srcMap[active] || srcMap.heads).map(mk);

  // budget block — spent = committee-approved funding cost, live from data
  const fundedTotal = appSrc.reduce((a, i) => a + parseB(i.budget), 0);
  const remaining = Math.max(0, APPROVED_BUDGET - fundedTotal);
  const pct = APPROVED_BUDGET ? Math.min(100, Math.round((fundedTotal / APPROVED_BUDGET) * 100)) : 0;

  return {
    isCommittee: isCom,
    title: isCom ? 'سلة اللجنة الوطنية' : 'سلة الترشيحات',
    subtitle: isCom
      ? 'الترشيحات الواردة من رؤساء المسارات واللجنة وما تم اعتماده للتمويل'
      : 'ما رشّحته لتمويل اللجنة الوطنية',
    tabs,
    tab: active,
    items,
    activeIsApproved: active === 'approved',
    showBudget: isCom,
    budget: {
      approvedLabel: formatMoney(APPROVED_BUDGET),
      remainingLabel: formatMoney(remaining),
      pct,
    },
    pendingCount: isCom ? headsSrc.length + comSrc.length : myNomsSrc.length,
    fundedTotalLabel: fundedTotal.toLocaleString('en-US') + ' درهم',
  };
}

function buildDetail(s: Store, id: string, ctx: { rawRole: RoleKey; role: RoleKey; ent: (i: Item) => string }) {
  const { rawRole } = ctx;
  const i = s.items.find((x) => x.id === id);
  if (!i) return null;
  const t = TYPE[i.type];
  const wm = wfMeta(i);
  const w = wfOf(i);
  const step = wm.step;
  const score = transformScore(i);
  const canApproveGate = (rawRole === 'entity' || rawRole === 'entity_admin') && w === 'ent1';
  // detail view is VIEW-ONLY for item data; scope/budget are never edited here
  const canEditScope = false;
  // group-level cost carried by the item's launch plan
  const planCost = (i.launchPlanIds || [])
    .map((pid) => s.launchPlans.find((p) => p.id === pid))
    .find((p) => p && ((p.budget || '').trim() || (p.scope || '').trim()));
  const isDraftForCoord = rawRole === 'coord' && w === 'draft';
  // ---- footer / menu gating (mirrors the design's derived flags) ----
  const vStep = Math.min(s.ui.dViewStep || step, step);
  const canApproveGateView = canApproveGate && vStep === step;
  const onApprovalStep = vStep === 2;
  const editLocked = step >= 3;
  const execEditable = rawRole === 'coord' && w === 'exec';
  const launchEditable = rawRole === 'coord' && w === 'launch';
  const fillActive = canEditScope || execEditable || launchEditable;
  // the "تعديل البيانات" menu item hides once approval/tracking has begun
  const showMenuEdit = !onApprovalStep && !editLocked;
  // fallback edit button: shown when there's no gate action and editing isn't
  // locked — but the read-only path role never gets an edit button
  const canEdit = !canApproveGateView && !onApprovalStep && !editLocked && !fillActive && rawRole !== 'path';
  const twoStep = rawRole === 'ai' || rawRole === 'path';
  const cur = twoStep ? (step >= 3 ? 2 : 1) : step;
  const stepLabels = twoStep
    ? [{ n: 'اعتماد اختيار أولويات التحول الذكي' }, { n: 'تنفيذ واختبار التحول والإطلاق' }]
    : DEFAULT_PROGRAM_PHASES.map((p) => ({ n: p.n }));
  const dSteps = stepLabels.map((sl, idx) => {
    const num = idx + 1;
    const st = num < cur ? 'done' : num === cur ? 'active' : 'todo';
    return { num: String(num), label: sl.n, isDone: st === 'done', state: st };
  });

  const execRows = (i.execChecklist || []).map((x) => ({
    key: x.key,
    label: x.label,
    status: x.status,
    isDelayed: x.status === 'متأخر',
    newDate: x.newDate || '',
    newDateFmt: fmtDate(x.newDate),
    reason: x.reason || '',
    onStatus: (v: string) => s.setExecItem(i.id, x.key, { status: v }),
    onNewDate: (v: string) => s.setExecItem(i.id, x.key, { newDate: v }),
    onReason: (v: string) => s.setExecItem(i.id, x.key, { reason: v }),
  }));
  const launchChk = (i.launches || []).map((l, idx) => ({
    idx,
    title: l.title,
    ltype: l.ltype,
    dateFmt: fmtDate(l.date),
    done: !!l.done,
    actualFmt: fmtDate(l.doneAt),
    onToggle: () => s.toggleLaunchDone(i.id, idx),
  }));

  return {
    id: i.id,
    item: i,
    title: i.title,
    desc: i.desc,
    typeLabel: t.label,
    typeColor: t.color,
    typeBg: t.bg,
    wfLabel: wm.label,
    wfChip: wm.chip,
    wfBg: wm.bg,
    priority: i.priority,
    rankLabel: i.rank ? String(i.rank) : '',
    complexity: i.complexity,
    endDateFmt: fmtDate(i.endDate),
    isReturned: rawRole === 'coord' && !!i.ret,
    retBannerLabel: 'ملاحظات ممثل الجهة',
    retFrom: i.ret?.from || '',
    retNote: i.ret?.note || '',
    // funded banner (shown inside the detail body)
    dFunded: !!i.funded,
    dFundedText: i.funded
      ? (i.funded.direct
          ? 'مموّل مباشرة من اللجنة الوطنية'
          : 'مموّل من اللجنة الوطنية · بترشيح من ' + (i.nom?.by || 'رئيس المسار')) +
        ' · يبقى التنفيذ من مسؤولية الجهة'
      : '',
    isProj: i.type === 'project' || i.type === 'initiative',
    isOp: i.type === 'operation',
    isSvc: i.type === 'service',
    // project fields
    expectedOutputs: i.expectedOutputs,
    expectedOutcomes: i.expectedOutcomes,
    expectedImpact: i.expectedImpact,
    aiModels: i.aiModels,
    targetPct: i.targetPct,
    transformability: i.transformability,
    transformPriority: i.transformPriority,
    readiness: i.readiness,
    // op fields
    opType: i.opType,
    usageIntensity: i.usageIntensity,
    subActivities: i.subActivities,
    automationLevel: i.automationLevel,
    automationPct: i.automationPct,
    automationSystem: i.automationSystem,
    complexityLevel: i.complexityLevel,
    sector: i.sector,
    dept: i.dept,
    section: i.section,
    itemEntityName: entOf(i, s.entityName),
    // svc fields
    serviceOwner: i.serviceOwner,
    targetUsers: i.targetUsers,
    currentJourney: i.currentJourney,
    painPoints: i.painPoints,
    expectedImprovement: i.expectedImprovement,
    // score
    showReco: rawRole === 'ai',
    scoreV: score.v,
    scoreLabel: score.ar,
    scoreColor: score.color,
    scoreExpl: score.expl,
    // steps
    dSteps,
    // scope — falls back to the launch plan's group-level cost when the item
    // has none of its own (cost defined per launch, not per item)
    scopeOfWork: i.scopeOfWork || (planCost?.scope ? planCost.scope + ' (على مستوى خطة الإطلاق)' : ''),
    budget: i.budget || (planCost?.budget ? planCost.budget + ' (على مستوى خطة الإطلاق)' : ''),
    scopeApproval: i.scopeApproval,
    canEditScope,
    scopeReadOnly: !canEditScope && !!(i.scopeOfWork || i.budget || planCost?.budget || planCost?.scope),
    scopePendingInput: !canEditScope && !i.scopeOfWork && !i.budget && !planCost?.budget && !planCost?.scope,
    showBudgetSubmit: false, // scope is submitted via the wizard, not the detail
    hasScopeFile: !!i.scopeFile,
    scopeFile: i.scopeFile || '',
    scopeFileLabel: i.scopeFile ? 'المرفق: ' + i.scopeFile : 'اسحب الملف هنا أو اضغط للإرفاق',
    // exec / launch
    execRows,
    execEditable: rawRole === 'coord' && w === 'exec',
    // executed tasks stay visible (read-only) through launch and completion
    showExecView: ['exec', 'launch', 'done'].includes(w),
    showGoLaunch: rawRole === 'coord' && w === 'exec',
    execBlocked: !execAllDone(i),
    execOpacity: execAllDone(i) ? 1 : 0.55,
    launchChk,
    launchEditable: rawRole === 'coord' && w === 'launch',
    showLaunchView: ['launch', 'done'].includes(w),
    showFinishLaunch: rawRole === 'coord' && w === 'launch',
    hasLaunchChk: (i.launches || []).length > 0,
    // execution plan as entered by the coordinator (visible before approval)
    execBatchName: i.execBatch || '',
    execBatchPeriod:
      execMilestones().find((b) => b.name === i.execBatch)?.period || '',
    subMilestones: (i.phases || [])
      .filter((p) => !i.execBatch || p.name === i.execBatch)
      .flatMap((p) => p.subs || [])
      .filter((sub) => (sub.name || '').trim())
      .map((sub) => ({
        name: sub.name,
        startFmt: fmtDate(sub.start),
        endFmt: fmtDate(sub.end),
      })),
    // planned launch plan — read-only, shown in the pre-launch stages so the
    // approver sees everything before approving
    plannedLaunches: (i.launches || [])
      .filter((l) => (l.title || '').trim())
      .map((l) => ({
        title: l.title,
        ltype: l.ltype,
        dateFmt: fmtDate(l.date),
        desc: l.desc || '',
        shared: !!l.shared,
      })),
    // approval log
    logRows: buildLogRows(i),
    // gate actions
    canApproveGate,
    gateActor: w === 'ent1' ? 'ممثل الجهة' : 'اللجنة الوطنية',
    dActionMenuOpen: s.ui.dActionMenuOpen,
    canApproveGateView,
    canEdit,
    showMenuEdit,
    editLabel: isDraftForCoord ? 'استكمال البيانات وإعادة الإرسال' : 'تعديل',
    // handlers
    onClose: () => s.closeDetail(),
    onApprove: () => s.approveItem(i.id),
    onReqInfo: () => s.reqInfoItem(i.id),
    onReject: () => s.rejectItem(i.id),
    onEdit: () => s.editItem(i.id),
    onToggleMenu: () => s.toggleDActionMenu(),
    onScopeWork: (v: string) => s.detailField(i.id, 'scopeOfWork', v),
    onBudget: (v: string) => s.detailField(i.id, 'budget', v),
    onSubmitScope: () => s.submitScope(i.id),
    onDownloadScope: () => s.toast('جاري تحميل المرفق…'),
    onGoLaunch: () => s.goToLaunch(i.id),
    onFinishLaunch: () => s.finishLaunch(i.id),
    // simplified 3-state delivery status
    isAgentifiable: (i.transformability || '') !== 'غير قابل',
    devStage: w === 'done' ? 'launched' : w === 'launch' ? 'developed' : 'underDev',
    canEditStage: rawRole === 'coord' && ['exec', 'launch', 'done'].includes(w),
    onSetStage: (stage: string) => s.setDevStage(i.id, stage),
  };
}

function buildLogRows(i: Item) {
  // Displayed action text (mirrors the design's actLabel()).
  const actLabel = (e: { action: string; role?: string }): string => {
    if (e.action === 'submit') return 'تم إرسال المدخل للاعتماد';
    if (e.action === 'approve') return 'تم الاعتماد من ' + (e.role || '');
    if (e.action === 'pending') return 'قيد الاعتماد لدى ' + (e.role || '');
    if (e.action === 'reject') return 'رفض';
    if (e.action === 'info') return 'طلب تفاصيل إضافية';
    // fund / nominate / unfund / declineNom / cancelFund / budget … → Arabic
    return ALOG[e.action]?.t || e.action;
  };
  // newest action first (latest entry at the top of the log)
  const rawLog = i.log && i.log.length ? [...i.log].reverse() : [];
  const rows = rawLog.map((e) => {
    const a = ALOG[e.action] || { t: e.action, c: '#64748B' };
    const dt = new Date(e.at);
    const when = isNaN(dt.getTime())
      ? ''
      : fmtDate(e.at) + ' · ' + String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
    const namedInLabel = e.action === 'approve' || e.action === 'pending';
    const sub = namedInLabel ? when : (e.by ? e.by + ' · ' : '') + when;
    return { action: actLabel(e), color: a.c, sub, note: e.note || '', hasNote: !!e.note };
  });
  // synthesize minimal history when no real log rows exist — with timestamps
  if (!rows.length) {
    const t = itemTimes(i);
    const w = wfOf(i);
    // newest first: approval/pending above submission
    if (['exec', 'launch', 'done'].includes(w))
      rows.push({ action: actLabel({ action: 'approve', role: 'ممثل الجهة' }), color: ALOG.approve.c, sub: fmtDateTime(t.approvedAt), note: '', hasNote: false });
    else if (w === 'ent1')
      rows.push({ action: actLabel({ action: 'pending', role: 'ممثل الجهة' }), color: ALOG.pending.c, sub: fmtDateTime(t.submittedAt), note: '', hasNote: false });
    rows.push({ action: actLabel({ action: 'submit' }), color: ALOG.submit.c, sub: 'منسق المسار في الجهة · ' + fmtDateTime(t.submittedAt), note: '', hasNote: false });
  }
  return rows;
}

// add-panel title lists the types the chosen stream actually offers
function addTitleFor(p: string): string {
  const keys = availTypes(p).map((t) => t.key);
  let title = 'إضافة مشاريع / مبادرات';
  if (keys.includes('operation')) title += ' أو عمليات';
  if (keys.includes('service')) title += ' أو خدمات';
  return title;
}

function buildModal(s: Store) {
  const ui = s.ui;
  const draft = ui.draft;
  const type = draft?.type || 'project';
  const mTypeLabel = typeLabel(type);
  const path = draft?.path || s.myPath;
  // path name is only shown once a path has actually been chosen for the draft
  const mPathName = draft?.path ? pathById(draft.path).name : '';
  // per-type step 1 / step 2 titles (verbatim from design)
  const step1Title =
    ({ project: 'بيانات المشروع', initiative: 'بيانات المبادرة', operation: 'بيانات العملية', service: 'بيانات الخدمة' } as Record<string, string>)[type] ||
    'البيانات العامة';
  const step2Title =
    ({ project: 'تقييم المشروع', initiative: 'تقييم المبادرة', operation: 'تقييم العملية', service: 'تقييم الخدمة' } as Record<string, string>)[type] ||
    'التقييم والأولوية';
  // per-type stepper labels (fallback to generic when no type yet)
  const step1Label =
    ({ project: 'بيانات المشروع', initiative: 'بيانات المبادرة', operation: 'بيانات العملية', service: 'بيانات الخدمة' } as Record<string, string>)[type] ||
    'البيانات';
  const step2Label =
    ({ project: 'تقييم المشروع', initiative: 'تقييم المبادرة', operation: 'تقييم العملية', service: 'تقييم الخدمة' } as Record<string, string>)[type] ||
    'التقييم';
  const fLabels = [step1Label, step2Label, 'النتائج المتوقعة', 'نطاق العمل والتكلفة المتوقعة', 'خطة التنفيذ والإطلاق'];
  const fTitles = [step1Title, step2Title, 'النتائج المتوقعة', 'نطاق العمل والتكلفة المتوقعة', 'خطة التنفيذ والإطلاق'];
  const fHints = [
    'ابدأ بالمعلومات الأساسية',
    'حدّد الأولوية وقابلية التحول',
    'النتائج والأثر المستهدف',
    'نطاق العمل والتكلفة المتوقعة والمرفقات',
    'اختر مرحلة التنفيذ والإطلاق',
  ];
  return {
    mStep: ui.mStep,
    createTitle: ui.editingId ? 'تعديل ' + typeLabelDef(type) : mPathName ? addTitleFor(draft?.path || path) : 'إضافة جديدة',
    mPathName,
    rankBtnLabel: draft?.rank ? 'الأولوية رقم ' + draft.rank : 'اضغط لترتيب الأولوية بالسحب والإفلات',
    // path step
    pathCards: availTypesCards(s),
    // type step
    typeCards: availTypes(path).map((t) => ({
      key: t.key,
      label: t.label,
      onClick: () => s.mSetType(t.key),
    })),
    // form
    draft,
    fStep: ui.fStep,
    mIsOp: type === 'operation',
    mIsService: type === 'service',
    mIsProjectish: type === 'project' || type === 'initiative',
    mTypeLabel,
    fLabels,
    fHints,
    fStepTitle: fTitles[ui.fStep - 1] || '',
    fStepHint: fHints[ui.fStep - 1] || '',
    fNextLabel: ui.fStep >= 5 ? 'إرسال للاعتماد' : 'التالي',
    // execution batches (خطة التنفيذ والإطلاق) + centrally-managed launch plans
    batchOptions: [
      ...launchBatches().map((b) => ({
        name: b.name,
        label: (b.period ? b.name + ' · ' + b.period : b.name).replace(/^إطلاق /, ''),
      })),
      { name: TBD_BATCH, label: TBD_BATCH },
    ],
    startStates: START_STATES,
    // ai review
    aiLoading: ui.aiLoading,
    aiResult: ui.aiResult,
    aiReadyCount: ui.aiResult?.ready.length || 0,
    aiImproveCount: ui.aiResult?.improve.length || 0,
    aiNotesCount: ui.aiResult?.notes.length || 0,
    // bulk
    bulkTemplateTypes: availTypes(path),
    bulkRows: ui.bulkRows,
    bulkLoading: ui.bulkLoading,
    bulkLoaded: ui.bulkLoaded,
    bulkReadyCount: ui.bulkRows.filter((r) => r._v === 'جاهز').length,
    bulkReviewCount: ui.bulkRows.filter((r) => r._v === 'بحاجة إلى مراجعة').length,
    bulkErrorCount: ui.bulkRows.filter((r) => r._v === 'يوجد خطأ').length,
  };
}

function availTypesCards(s: Store) {
  return PATHS.map((p) => ({
    id: p.id,
    name: p.name,
    desc: p.desc,
    color: p.color,
    icon: PIC[p.id],
    onClick: () => s.mSetPath(p.id),
  }));
}
