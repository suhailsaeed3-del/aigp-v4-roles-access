// ============================================================================
// Domain layer — faithful port of `class Component extends DCLogic`
// constants, types, workflow, scoring, program phases. All Arabic strings,
// numbers, colors and formulas are verbatim from the Claude Design prototype.
// ============================================================================

export type RoleKey = 'entity' | 'entity_admin' | 'path' | 'coord' | 'ai' | 'admin';
export type ItemType = 'project' | 'initiative' | 'operation' | 'service';
export type WfState =
  | 'draft'
  | 'ent1'
  | 'pm1'
  | 'pm2'
  | 'ent2'
  | 'budget'
  | 'exec'
  | 'launch'
  | 'done';

// ---- 1.1 PATHS (streams) ---------------------------------------------------
export type Path = {
  id: string;
  name: string;
  desc: string;
  color: string;
  extra: 'operation' | 'service' | null;
};

export const PATHS: Path[] = [
  {
    id: 'ops',
    name: 'العمليات والدعم المؤسسي',
    desc: 'تحويل العمليات التخصصية وعمليات الدعم المؤسسي لتطبيق نماذج وأنظمة الذكاء الاصطناعي المساعد',
    color: '#2563EB',
    extra: 'operation',
  },
  {
    id: 'strategy',
    name: 'العمل الحكومي الاستراتيجي',
    desc: 'تحويل المهام الاستراتيجية لتطبيق نماذج وأنظمة الذكاء الاصطناعي المساعد',
    color: '#2563EB',
    extra: null,
  },
  {
    id: 'services',
    name: 'الخدمات',
    desc: 'تحويل الخدمات وباقات الخدمات لتطبيق نماذج وأنظمة الذكاء الاصطناعي المساعد',
    color: '#2563EB',
    extra: 'service',
  },
  {
    id: 'capacity',
    name: 'بناء القدرات والتدريب',
    desc: 'تطوير وتأهيل الموظفين الحكوميين في مجال الذكاء الاصطناعي المساعد',
    color: '#2563EB',
    extra: null,
  },
  {
    id: 'tech',
    name: 'تقنيات الذكاء الاصطناعي والبيانات',
    desc: 'تطوير المنظومة التقنية والبنية التحتية للذكاء الاصطناعي المساعد',
    color: '#2563EB',
    extra: null,
  },
];

// «للتحديد بعد الدراسة»: execution stage deferred until the study concludes
export const TBD_BATCH = 'للتحديد بعد الدراسة';

export const pathById = (id: string): Path =>
  PATHS.find((p) => p.id === id) || PATHS[0];

// Path icon SVG paths (rail + create-modal cards)
export const PIC: Record<string, string> = {
  capacity: 'M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7',
  tech: 'M3 5h18v14H3zM7 10l2.5 2.5L7 15M13 15h4',
  ops: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 3v2M12 19v2M4.6 4.6 6 6M18 18l1.4 1.4M3 12h2M19 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
  strategy: 'M4 20V10M10 20V4M16 20v-8M21 20H3',
  services: 'M3 5h18v14H3zM3 9h18M6.2 7h.01',
};

// Allowed item types per path — project & initiative are ONE merged type
export type TypeOption = { key: ItemType; label: string };
export function availTypes(path: string): TypeOption[] {
  const base: TypeOption[] = [{ key: 'project', label: 'مشروع / مبادرة' }];
  // operations exist in the operations stream and العمل الحكومي الاستراتيجي only
  if (path === 'ops' || path === 'strategy') base.push({ key: 'operation', label: 'عملية' });
  // services exist in the services stream only
  if (path === 'services') base.push({ key: 'service', label: 'خدمة' });
  return base;
}

// which type columns apply to a stream (drives dashboard breakdowns)
export const streamHasType = (path: string, t: 'operation' | 'service'): boolean =>
  availTypes(path).some((o) => o.key === t);

// ---- 1.2 TYPE map (project/initiative merged for display) ------------------
export const TYPE: Record<ItemType, { label: string; color: string; bg: string }> = {
  project: { label: 'مشروع / مبادرة', color: '#2563EB', bg: '#E5EEFF' },
  initiative: { label: 'مشروع / مبادرة', color: '#2563EB', bg: '#E5EEFF' },
  operation: { label: 'عملية', color: '#2563EB', bg: '#E5EEFF' },
  service: { label: 'خدمة', color: '#2563EB', bg: '#E5EEFF' },
};

export const typeLabel = (t: string): string =>
  ({
    project: 'مشروع / مبادرة',
    initiative: 'مشروع / مبادرة',
    operation: 'عملية',
    service: 'خدمة',
  } as Record<string, string>)[t] || 'عنصر';

// definite form for sentences: «تم إرسال المشروع / المبادرة…»
export const typeLabelDef = (t: string): string =>
  ({
    project: 'المشروع / المبادرة',
    initiative: 'المشروع / المبادرة',
    operation: 'العملية',
    service: 'الخدمة',
  } as Record<string, string>)[t] || 'العنصر';

// project & initiative count as one merged bucket
export const isProjInit = (t: string): boolean => t === 'project' || t === 'initiative';

// ---- 1.3 Roles -------------------------------------------------------------
export const ROLE: Record<
  RoleKey,
  { label: string; sub: string; badge: string; bg: string }
> = {
  // one unified badge colour for every role (brand blue) — no rainbow of chips
  entity: {
    label: 'قيادة الجهة',
    sub: 'متابعة شاملة لمسارات الجهة والممثلين',
    badge: '#1D4ED8',
    bg: '#EAF1FE',
  },
  path: {
    label: 'رئيس المسار',
    sub: 'تعبئة ومتابعة بيانات المسار',
    badge: '#1D4ED8',
    bg: '#EAF1FE',
  },
  coord: {
    label: 'منسق المسار في الجهة',
    sub: 'تنسيق ومتابعة بيانات المسار في الجهة',
    badge: '#1D4ED8',
    bg: '#EAF1FE',
  },
  ai: {
    label: 'اللجنة الوطنية',
    sub: 'مراجعة واعتماد المشاريع والعمليات والخدمات عبر الجهات',
    badge: '#1D4ED8',
    bg: '#EAF1FE',
  },
  admin: {
    label: 'مشرف النظام',
    sub: 'إدارة المستخدمين والأدوار وتعيين رؤساء المسارات واللجنة',
    badge: '#1D4ED8',
    bg: '#EAF1FE',
  },
  entity_admin: {
    label: 'مسؤول الجهة',
    sub: 'إدارة وتنسيق مسارات الجهة',
    badge: '#1D4ED8',
    bg: '#EAF1FE',
  },
};

// Access-role reference (الأدوار والصلاحيات) — mirrors the DB `roles` table.
export const ROLE_INFO: {
  key: RoleKey;
  nameAr: string;
  descAr: string;
  scope: string;
  permissions: string[];
}[] = [
  { key: 'admin', nameAr: 'مشرف النظام', descAr: 'يدير المستخدمين والأدوار، ويعيّن رؤساء المسارات وأعضاء اللجنة الوطنية.', scope: 'النظام بالكامل', permissions: ['users.manage', 'roles.view', 'streamhead.assign', 'committee.assign'] },
  { key: 'ai', nameAr: 'اللجنة الوطنية', descAr: 'إشراف وطني على كل الجهات والمسارات واعتماد التمويل النهائي.', scope: 'وطني', permissions: ['item.view.all', 'nomination.review', 'funding.approve', 'funding.cancel', 'phase.edit', 'budget.set'] },
  { key: 'path', nameAr: 'رئيس المسار', descAr: 'يراجع مدخلات كل الجهات ضمن مساره ويرشّح للتمويل.', scope: 'مسار واحد', permissions: ['item.view.stream', 'item.nominate', 'plan.view'] },
  { key: 'entity', nameAr: 'ممثل الجهة', descAr: 'يتابع كل مسارات جهته ويعتمد المدخلات الجاهزة، ويعيّن منسقي المسارات.', scope: 'جهة واحدة', permissions: ['item.view.entity', 'item.approve', 'item.return', 'team.manage'] },
  { key: 'entity_admin', nameAr: 'مسؤول الجهة', descAr: 'يدير ويتابع كل مسارات جهته بصلاحيات إدارية.', scope: 'جهة واحدة', permissions: ['item.view.entity', 'item.approve', 'item.return', 'team.manage', 'entities.update'] },
  { key: 'coord', nameAr: 'منسق المسار في الجهة', descAr: 'يضيف ويحدّث مدخلات مسار واحد داخل جهته.', scope: 'مسار داخل جهة', permissions: ['item.create', 'item.update', 'item.submit', 'plan.edit'] },
];

// Real stream representatives (رئيس المسار) — one per transformation stream
export const PATH_REPS: Record<string, string> = {
  capacity: 'معالي عهود بنت خلفان الرومي',
  tech: 'معالي عمر سلطان العلماء',
  ops: 'معالي مريم بنت أحمد الحمادي',
  strategy: 'معالي هدى الهاشمي',
  services: 'سعادة محمد راشد بن طليعة',
};

// Role-switcher pill labels (display order in the header)
export const ROLE_PILLS: { key: RoleKey; label: string }[] = [
  { key: 'coord', label: 'منسق المسار في الجهة' },
  { key: 'entity', label: 'ممثل الجهة' },
  { key: 'entity_admin', label: 'مسؤول الجهة' },
  { key: 'ai', label: 'اللجنة الوطنية' },
  { key: 'path', label: 'رئيس المسار' },
  { key: 'admin', label: 'مشرف النظام' },
];

// A managed user account (المستخدمون) as shown/edited in the admin console and,
// in production, stored in the `users` table.
export type UserRec = {
  id: string;
  role: RoleKey;
  name: string;
  title: string;
  email: string;
  phone: string;
  entityName?: string; // entity / coord
  streamId?: string; // coord / path
  active: boolean;
  system?: boolean; // seeded reference account (kept out of the demo delete path)
};

// Starter accounts for the admin console (mirrors prisma/seed.ts): the national
// committee + the five stream heads are set by the admin; the entity rep and
// its coordinators are set by the entity rep (shown here read-only-ish).
export function seedUsers(entityName = DEFAULT_ENTITY): UserRec[] {
  const u: UserRec[] = [
    { id: 'u-admin', role: 'admin', name: 'مشرف النظام', title: 'مسؤول المنصة', email: 'admin@aigp.gov.ae', phone: '', active: true, system: true },
    { id: 'u-committee', role: 'ai', name: 'اللجنة الوطنية للذكاء الاصطناعي', title: 'عضو اللجنة الوطنية', email: 'committee@aigp.gov.ae', phone: '', active: true, system: true },
  ];
  for (const p of PATHS) {
    u.push({ id: `u-head-${p.id}`, role: 'path', name: PATH_REPS[p.id] || `رئيس مسار ${p.name}`, title: `رئيس مسار ${p.name}`, email: `head.${p.id}@aigp.gov.ae`, phone: '', streamId: p.id, active: true, system: true });
  }
  u.push({ id: 'u-rep', role: 'entity', name: 'أحمد محمد العامري', title: 'مدير إدارة التحول الرقمي', email: 'rep@aigp.gov.ae', phone: '', entityName, active: true });
  for (const p of PATHS) {
    u.push({ id: `u-coord-${p.id}`, role: 'coord', name: `منسق ${p.name}`, title: `منسق مسار ${p.name}`, email: `coord.${p.id}@aigp.gov.ae`, phone: '', entityName, streamId: p.id, active: true });
  }
  return u;
}

// ---- 1.4 Status / approval enums ------------------------------------------
export const APPR: Record<string, { bg: string; c: string }> = {
  مسودة: { bg: '#EEF1F6', c: '#64748B' },
  'تم الإرسال': { bg: '#E5EEFF', c: '#2563EB' },
  'قيد المراجعة': { bg: '#FFF3DE', c: '#B45309' },
  معتمد: { bg: '#E3F6EC', c: '#0B8A4B' },
  'بحاجة إلى تحديث': { bg: '#FCEEE6', c: '#C2410C' },
  مرفوض: { bg: '#FCE8E8', c: '#DC2B38' },
};

export const PRIO: Record<string, { bg: string; c: string }> = {
  عالية: { bg: '#FCEEEF', c: '#D23B45' },
  متوسطة: { bg: '#F1F4F9', c: '#54627B' },
  منخفضة: { bg: '#F1F4F9', c: '#54627B' },
};

export const PRI_ORDER = ['عالية', 'متوسطة', 'منخفضة'];
export const CX_ORDER = ['منخفض', 'متوسط', 'عالٍ'];

// Phase / launch / exec-checklist statuses
export const PHASE_STATUS: Record<string, { bg: string; c: string; dot: string }> = {
  مكتملة: { bg: '#E3F6EC', c: '#0B8A4B', dot: '#0B8A4B' },
  'قيد التنفيذ': { bg: '#FFF3DE', c: '#B45309', dot: '#B45309' },
  'لم تبدأ': { bg: '#EEF1F6', c: '#64748B', dot: '#C2CCDC' },
};
export const LAUNCH_STATUS: Record<string, { bg: string; c: string }> = {
  'تم الإطلاق': { bg: '#E3F6EC', c: '#0B8A4B' },
  'قيد الإعداد': { bg: '#FFF3DE', c: '#B45309' },
  مخطط: { bg: '#E5EEFF', c: '#2563EB' },
};
export const SC: Record<string, { bg: string; c: string }> = {
  'لم تبدأ': { bg: '#F1F4F9', c: '#64748B' },
  مكتمل: { bg: '#F1F4F9', c: '#0B8A4B' },
  متأخر: { bg: '#F1F4F9', c: '#C0303B' },
};
export const EXEC_STATUS_OPTS = ['لم تبدأ', 'مكتمل', 'متأخر'];

// Notification kinds + icons
export const NK: Record<string, { bg: string; c: string }> = {
  warn: { bg: '#FFF3DE', c: '#B45309' },
  alert: { bg: '#FCEEEF', c: '#D23B45' },
  ok: { bg: '#E3F6EC', c: '#0B8A4B' },
  info: { bg: '#E5EEFF', c: '#2563EB' },
};
export const NIC: Record<string, string> = {
  clock: 'M12 8v4l2.5 1.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5 5l-3 7v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3-7z',
  wallet: 'M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4z',
  rotate: 'M3 2v6h6M21 12A9 9 0 0 0 6 5.3L3 8M21 22v-6h-6M3 12a9 9 0 0 0 15 6.7l3-2.7',
  check: 'M20 6 9 17l-5-5',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z',
};

// Log action map
export const ALOG: Record<string, { t: string; c: string }> = {
  submit: { t: 'أرسل للاعتماد', c: '#2563EB' },
  approve: { t: 'اعتمد', c: '#0B8A4B' },
  pending: { t: 'قيد الاعتماد', c: '#B45309' },
  reject: { t: 'رفض', c: '#C0303B' },
  info: { t: 'طلب تفاصيل إضافية', c: '#B45309' },
  budget: { t: 'أرسل الميزانية ونطاق العمل', c: '#2563EB' },
  nominate: { t: 'رشّح للتمويل', c: '#0E7C86' },
  fund: { t: 'اعتمد التمويل', c: '#0B8A4B' },
  unfund: { t: 'ألغى التمويل', c: '#C0303B' },
  declineNom: { t: 'رفض الترشيح', c: '#C0303B' },
  cancelFund: { t: 'ألغى التمويل', c: '#C0303B' },
};

// ============================================================================
// Item model
// ============================================================================
export type Phase = {
  name: string;
  start?: string;
  end?: string;
  owner?: string;
  status?: string;
  approval?: string;
  outcome?: string;
  notes?: string;
  period?: string;
  desc?: string;
  fixed?: boolean;
  subs?: { name: string; start?: string; end?: string; date?: string }[];
};
export type Launch = {
  title: string;
  ltype: string;
  date: string;
  desc?: string;
  phase?: string;
  status?: string;
  notes?: string;
  done?: boolean;
  doneAt?: number;
  shared?: boolean;
};
export type ExecItem = {
  key: string;
  label: string;
  status: string;
  newDate?: string;
  reason?: string;
};
export type LogEntry = {
  action: string;
  by: string;
  role: string;
  at: number;
  note?: string;
};
export type Nom = { by: string; role: string; path: string; at: number; direct?: boolean };
export type Funded = { by: string; at: number; direct?: boolean };
export type FundCancel = { by: string; at: number; reason: string };
export type Ret = { type: 'info' | 'reject'; from: string; note: string; gate?: string };

export type Item = {
  id: string;
  wf: WfState;
  type: ItemType;
  title: string;
  desc: string;
  path: string;
  approval: string;
  priority?: string;
  rank?: number;
  complexity?: string;
  impact?: string;
  status?: string;
  entity?: string;
  transformability?: string;
  readiness?: string | number;
  usageIntensity?: string;
  transformPriority?: string;
  automationPct?: number;
  automationLevel?: string;
  automationSystem?: string;
  complexityLevel?: string;
  progress?: number;
  scopeOfWork?: string;
  budget?: string;
  scopeApproval?: string;
  scopeFile?: string;
  expectedOutputs?: string;
  expectedOutcomes?: string;
  expectedImpact?: string;
  aiModels?: number;
  targetPct?: number;
  endDate?: string;
  // operation-specific
  opType?: string;
  subActivities?: string;
  fedEntity?: string;
  sector?: string;
  dept?: string;
  section?: string;
  steps?: Record<string, string>[];
  // service-specific
  serviceOwner?: string;
  targetUsers?: string;
  currentJourney?: string;
  painPoints?: string;
  expectedImprovement?: string;
  // execution batch the coordinator selects for this item (predefined milestone)
  execBatch?: string;
  // managed launch plans this item is attached to — one batch per item, but
  // an item may participate in SEVERAL launches within that batch
  launchPlanIds?: string[];
  // set when the item is moved between مراحل — drives stakeholder notifications
  stageMove?: { from: string; to: string; at: number; by: string } | null;
  /** @deprecated legacy single-plan field, migrated to launchPlanIds on hydrate */
  launchPlanId?: string;
  // nested
  phases?: Phase[];
  milestones?: Record<string, unknown>[];
  launches?: Launch[];
  execChecklist?: ExecItem[];
  links?: string[];
  log?: LogEntry[];
  ret?: Ret | null;
  nom?: Nom | null;
  funded?: Funded | null;
  fundCancel?: FundCancel | null;
  fyi?: { by: string; at: number } | null;
  stage?: string;
};

// ============================================================================
// 3. Workflow
// ============================================================================
export function wfOf(i: Item): WfState {
  if (i.wf === 'pm1' || i.wf === 'pm2') return 'exec'; // legacy coercion
  if (i.wf) return i.wf;
  if ((i.progress || 0) >= 100) return 'done';
  if (i.stage === 'tracking' || i.scopeApproval === 'معتمد') return 'exec';
  if (i.approval === 'معتمد') return 'pm1';
  if (i.approval === 'تم الإرسال' || i.approval === 'قيد المراجعة') return 'ent1';
  return 'draft';
}

export type WfMeta = { step: number; label: string; who: string; chip: string; bg: string };
export const WFMETA: Record<string, WfMeta> = {
  draft: { step: 1, label: 'مسودة', who: 'path', chip: '#64748B', bg: '#EFF2F7' },
  ent1: { step: 1, label: 'بانتظار اعتماد ممثل الجهة', who: 'entity', chip: '#B45309', bg: '#FFF3DE' },
  pm1: { step: 2, label: 'بانتظار اعتماد اللجنة الوطنية', who: 'ai', chip: '#B45309', bg: '#FFF3DE' },
  exec: { step: 3, label: 'قيد التنفيذ', who: 'path', chip: '#2563EB', bg: '#EAF0FE' },
  launch: { step: 3, label: 'قيد الإطلاق', who: 'path', chip: '#2563EB', bg: '#EAF0FE' },
  done: { step: 3, label: 'تم الإطلاق', who: '-', chip: '#0B8A4B', bg: '#E3F6EC' },
};
export const wfMeta = (i: Item): WfMeta => WFMETA[wfOf(i)] || WFMETA.draft;
export const stepIndexOf = (i: Item): number => wfMeta(i).step;

// Funding / nomination is only allowed once the item has passed the entity gate.
export const isEntityApproved = (i: Item): boolean =>
  ['exec', 'launch', 'done'].includes(wfOf(i));

// Stage-weighted completion (for the "نسبة الإنجاز" KPI).
export function stageWeight(i: Item): number {
  return (
    { draft: 0, ent1: 25, exec: 60, launch: 85, done: 100 } as Record<string, number>
  )[wfOf(i)] ?? 0;
}

// A returned item (has `ret`) surfaces a distinct amber status instead of "مسودة".
export const RETURNED_STATUS = 'بحاجة إلى تعديل';

// exec / launch completion gates
export function execAllDone(it: Item): boolean {
  const list = it.execChecklist || [];
  return list.every(
    (x) => x.status === 'مكتمل' || (x.status === 'متأخر' && !!(x.reason || '').trim())
  );
}
export function launchAllDone(it: Item): boolean {
  const list = it.launches || [];
  return list.length > 0 && list.every((l) => !!l.done);
}

// ============================================================================
// 4. Transformation recommendation score
// ============================================================================
export type Score = { v: number; label: string; ar: string; color: string; expl: string };
export function transformScore(i: Item): Score {
  const impact = ({ منخفض: 1, متوسط: 3, مرتفع: 5, 'عالٍ': 5 } as Record<string, number>)[
    i.impact || ''
  ] || 3;
  const feas =
    ({ 'غير قابل للتحول': 1, 'قابل جزئياً': 3, 'قابل كلياً': 5, 'قابل بالكامل': 5 } as Record<
      string,
      number
    >)[i.transformability || ''] || 3;
  const rd = i.readiness;
  let rdScore: number;
  if (typeof rd === 'number') {
    rdScore = rd < 20 ? 1 : rd < 50 ? 2 : rd <= 80 ? 4 : 5;
  } else {
    rdScore =
      ({
        'الجاهزية للتحول بنسبة 30% فأقل': 1,
        'الجاهزية للتحول بنسبة بين 30% إلى 50%': 2,
        'الجاهزية للتحول بنسبة بين 50% إلى 80%': 4,
        'الجاهزية للتحول بنسبة 80% فأكثر': 5,
      } as Record<string, number>)[rd || ''] || 3;
  }
  const usage = ({ منخفضة: 1, متوسطة: 3, عالية: 5 } as Record<string, number>)[
    i.usageIntensity || ''
  ] || 3;
  const prio = ({ منخفضة: 1, متوسطة: 3, عالية: 5 } as Record<string, number>)[
    i.transformPriority || i.priority || ''
  ] || 3;
  const autoOpp = Math.max(1, Math.min(5, 5 - ((i.automationPct || 0) * 4) / 100));
  const cxEase = ({ منخفض: 5, متوسط: 3, مرتفع: 1, 'عالٍ': 1 } as Record<string, number>)[
    i.complexity || ''
  ] || 3;

  let score =
    impact * 0.25 +
    feas * 0.2 +
    rdScore * 0.15 +
    usage * 0.15 +
    prio * 0.1 +
    autoOpp * 0.1 +
    cxEase * 0.05;
  const bonus = ({ 1: 0.2, 2: 0.1, 3: 0.05 } as Record<number, number>)[Number(i.rank)] || 0;
  score = Math.min(5, score + bonus);
  const v = Math.round(score * 10) / 10;

  const top: [string, number][] = [
    ['الأثر', impact],
    ['القابلية', feas],
    ['الجاهزية', rdScore],
    ['الاستخدام', usage],
  ].sort((a, b) => (b[1] as number) - (a[1] as number)) as [string, number][];

  let label: string, ar: string, color: string, expl: string;
  if (v >= 4.2) {
    label = 'Recommended 100%';
    ar = 'موصى به 100%';
    color = '#0B8A4B';
    expl =
      'يُنصح بالتحول — ' +
      top[0][0] +
      ' و' +
      top[1][0] +
      ' مرتفعان؛ يُنصح بالتحول الفوري وفق الطاقة المتاحة';
  } else if (v >= 2.0) {
    label = 'Waitlist';
    ar = 'قائمة الانتظار';
    color = '#B45309';
    expl = 'تبقى في قائمة الانتظار، ويُحدَّد ترتيبها وفق أولوية الجهة والجاهزية والأثر وسهولة التعقيد';
  } else {
    label = 'Not Recommended';
    ar = 'غير موصى به';
    color = '#DC2B38';
    expl = 'درجة منخفضة — ' + top[3][0] + ' و' + top[2][0] + ' منخفضان؛ لا يُنصح بالتحول حالياً';
  }
  return { v, label, ar, color, expl };
}

// ============================================================================
// 5. Program phases & execution milestones
// ============================================================================
export type ProgramPhase = { n: string; d: string; deadline: string };
export const DEFAULT_PROGRAM_PHASES: ProgramPhase[] = [
  {
    n: 'حصر واختيار أولويات التحول الذكي',
    d: 'تحديد العمليات والمشاريع والخدمات ونطاق العمل والميزانية المطلوبة حسب المسارات المعتمدة',
    deadline: '2026-07-15',
  },
  {
    n: 'اعتماد ممثل الجهة لأولويات التحول',
    d: 'مراجعة واعتماد ممثل الجهة للأولويات وفقاً للأثر والجاهزية والقيمة المضافة',
    deadline: '2026-08-10',
  },
  {
    n: 'تنفيذ واختبار التحول والإطلاق',
    d: 'تنفيذ المراحل، إكمال بناء الوكلاء والاختبار وقوائم الإطلاق ومتابعة التقدّم',
    deadline: '2026-12-20',
  },
];

export function execMilestones(): Phase[] {
  return [
    {
      name: 'التقييم والتهيئة',
      period: 'يونيو – أغسطس 2026',
      desc: 'تقييم الوضع الحالي وتحديد الأولويات',
      start: '2026-06-01',
      end: '2026-07-31',
      status: 'لم تبدأ',
      fixed: true,
      subs: [{ name: '', start: '', end: '' }],
    },
    {
      name: 'إطلاق المرحلة الأولى',
      period: 'سبتمبر – نوفمبر 2026',
      desc: 'تطوير وإطلاق أول 3 نماذج',
      start: '2026-07-15',
      end: '2026-11-30',
      status: 'لم تبدأ',
      fixed: true,
      subs: [{ name: '', start: '', end: '' }],
    },
    {
      name: 'إطلاق المرحلة الثانية',
      period: 'ديسمبر 2026 – فبراير 2027',
      desc: 'تطوير 4 نماذج إضافية',
      start: '2026-12-01',
      end: '2027-02-28',
      status: 'لم تبدأ',
      fixed: true,
      subs: [{ name: '', start: '', end: '' }],
    },
    {
      name: 'إطلاق المرحلة الثالثة',
      period: 'مارس – مايو 2027',
      desc: 'توسيع التطبيق ليشمل 5 خدمات جديدة',
      start: '2027-03-01',
      end: '2027-05-31',
      status: 'لم تبدأ',
      fixed: true,
      subs: [{ name: '', start: '', end: '' }],
    },
    {
      name: 'إطلاق المرحلة الرابعة',
      period: 'يونيو – أغسطس 2027',
      desc: 'إطلاق خدمات الذكاء الاصطناعي للمتعاملين',
      start: '2027-06-01',
      end: '2027-08-31',
      status: 'لم تبدأ',
      fixed: true,
      subs: [{ name: '', start: '', end: '' }],
    },
  ];
}

// Launch-eligible batches (المراحل الأربع) — التقييم والتهيئة is excluded
export function launchBatches(): Phase[] {
  return execMilestones().filter((b) => b.name !== 'التقييم والتهيئة');
}

// Centrally managed launch plan (defined per batch via "إدارة خطط الإطلاق")
export type LaunchPlan = {
  id: string;
  batch: string; // batch name (إطلاق المرحلة الأولى…الرابعة)
  title: string;
  ltype: string;
  date: string;
  desc: string;
  // cost can live at the launch level: one scope + estimated budget for the
  // group of operations/services (or projects) transformed together.
  // `budget` is the EXECUTION cost — this is what the committee funds and
  // what all committee totals count. `launchBudget` is the launch/event cost,
  // informational for the entity rep only (never aggregated for funding).
  scope?: string;
  budget?: string;
  launchBudget?: string;
};


// item launches derived from its attached (managed) launch plans
export function launchesFromPlans(ids: string[] | undefined, plans: LaunchPlan[]): Launch[] {
  return (ids || [])
    .map((id) => plans.find((p) => p.id === id))
    .filter((p): p is LaunchPlan => !!p)
    .map((p) => ({
      title: p.title,
      ltype: p.ltype,
      date: p.date,
      desc: p.desc,
      shared: true,
      status: 'مخطط',
      done: false,
    }));
}

// Item execution state set by the coordinator during creation
export const START_STATES = ['لم يبدأ بعد', 'قيد التنفيذ', 'مكتمل'];

export const TWO_STEP_PHASES: ProgramPhase[] = [
  {
    n: 'اعتماد اختيار أولويات التحول الذكي',
    d: 'مراجعة واعتماد أولويات التحول الذكي وفقاً للأثر والجاهزية والقيمة المضافة',
    deadline: '2026-08-10',
  },
  {
    n: 'تنفيذ واختبار التحول والإطلاق',
    d: 'تنفيذ المراحل والاختبار وقوائم الإطلاق ومتابعة التقدّم',
    deadline: '2026-12-20',
  },
];

// launch types
export const LAUNCH_TYPES = [
  'إطلاق منتج / خدمة',
  'إعلان رسمي',
  'مؤتمر / فعالية',
  'شراكة استراتيجية',
  'أخرى',
];

// ============================================================================
// Date / countdown utilities
// ============================================================================
const AR_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];
export function fmtDate(d?: string | number): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return `${dt.getDate()} ${AR_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}
export function daysLeft(d: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(d).getTime() - now) / 86400000));
}
export type Countdown = {
  days: number;
  hours: number;
  mins: number;
  secs: number;
  hh: string;
  mm: string;
  ss: string;
};
export function countdown(deadline: string, now = Date.now()): Countdown {
  const end = new Date(deadline + 'T23:59:59').getTime();
  let diff = Math.max(0, end - now);
  const days = Math.floor(diff / 86400000);
  diff -= days * 86400000;
  const hours = Math.floor(diff / 3600000);
  diff -= hours * 3600000;
  const mins = Math.floor(diff / 60000);
  diff -= mins * 60000;
  const secs = Math.floor(diff / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { days, hours, mins, secs, hh: pad(hours), mm: pad(mins), ss: pad(secs) };
}

// ============================================================================
// Blank item / owner factories
// ============================================================================
export const blankOwner = () => ({
  name: '',
  position: '',
  email: '',
  phone: '',
  self: false,
});

export function blankItem(type: ItemType, path: string): Item {
  const base: Item = {
    id: 'n' + Date.now(),
    wf: 'draft',
    type,
    title: '',
    desc: '',
    path,
    approval: 'مسودة',
    stage: 'build',
    priority: 'متوسطة',
    complexity: 'متوسط',
    impact: 'متوسط',
    progress: 0,
    aiModels: 0,
    targetPct: 0,
    rank: 0,
    execChecklist: [
      { key: 'agents', label: 'بناء النظام الوكيلي', status: 'لم تبدأ', newDate: '', reason: '' },
      { key: 'testing', label: 'الاختبار وضمان الجودة', status: 'لم تبدأ', newDate: '', reason: '' },
      { key: 'pilot', label: 'الإطلاق', status: 'لم تبدأ', newDate: '', reason: '' },
    ],
    phases: execMilestones(),
    milestones: [],
    launches: [],
    links: [],
  };
  if (type === 'operation') {
    Object.assign(base, {
      opType: 'العمليات التخصصية',
      subActivities: '',
      sector: '',
      dept: '',
      section: '',
      automationLevel: 'لا',
      automationPct: 0,
      automationSystem: '',
      usageIntensity: 'متوسطة',
      complexityLevel: 'متوسط',
      readiness: 60,
      transformability: 'قابل جزئياً',
      transformPriority: 'متوسطة',
      steps: [],
    });
  } else if (type === 'service') {
    Object.assign(base, {
      serviceOwner: '',
      targetUsers: '',
      currentJourney: '',
      painPoints: '',
      expectedImprovement: '',
      automationLevel: 'لا',
      automationPct: 0,
      usageIntensity: 'متوسطة',
      transformability: 'قابل جزئياً',
      transformPriority: 'متوسطة',
      readiness: 60,
    });
  } else {
    Object.assign(base, {
      status: 'مشروع جديد',
      expectedOutputs: '',
      expectedOutcomes: '',
      expectedImpact: '',
      transformability: 'قابل جزئياً',
      transformPriority: 'متوسطة',
      readiness: 60,
      usageIntensity: 'متوسطة',
    });
  }
  return base;
}

// Predefined committee funding allocation (approved budget ceiling), in درهم.
export const APPROVED_BUDGET = 100_000_000;

// Parse a free-text budget string ("4,500,000 درهم") into a number.
export function parseBudget(b?: string): number {
  const n = parseInt((b || '').replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

// Format a currency amount for display (abbreviates millions).
export function formatMoney(n: number): string {
  const fmt = (v: number) => {
    const r = Math.round(v * 10) / 10;
    return Number.isInteger(r) ? r.toLocaleString('en-US') : r.toFixed(1);
  };
  if (n >= 1_000_000_000) return fmt(n / 1_000_000_000) + ' مليار درهم';
  if (n >= 1_000_000) return fmt(n / 1_000_000) + ' مليون درهم';
  return n.toLocaleString('en-US') + ' درهم';
}

export const SEED_V = process.env.NEXT_PUBLIC_DEMO_DATA === '1' ? 'demo1' : 'v1';
export const DEFAULT_ENTITY = 'وزارة شؤون مجلس الوزراء';
export const ALT_ENTITY = 'هيئة الإمارات للهوية والجنسية';

// entity resolver — mock items carry `entity` explicitly; default to the
// session entity (the old prototype id-based hack is gone with the new seed)
export function entOf(i: Item, entityName = DEFAULT_ENTITY): string {
  return i.entity || entityName;
}
