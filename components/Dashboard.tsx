'use client';
import { Fragment, useState, type CSSProperties, type ReactNode } from 'react';
import type { VM } from '@/lib/viewModel';
import { Icon } from './Icon';
import { Tour, TOUR_EVENT, type TourStep } from './Tour';
import { LAUNCH_TYPES, TBD_BATCH } from '@/lib/domain';

// first-login walkthrough: sections are matched by [data-tour] anchors and
// steps whose anchor is not rendered for the current role are skipped
const TOUR_STEPS: TourStep[] = [
  {
    sel: '[data-tour="profile"]',
    title: 'الملف الشخصي وفريق العمل',
    desc: 'من الصورة الرمزية تُفتح قائمة الملف الشخصي، ومنها الوصول إلى «فريق العمل» لتشكيل فريق جهتكم ودعوة منسّقي المسارات لكل مسار من مسارات التحول.',
  },
  {
    sel: '[data-tour="banner"]',
    title: 'المرحلة الحالية والعدّ التنازلي',
    desc: 'يوضّح هذا الشريط المرحلة الحالية من المشروع وموعدها النهائي مع عدّ تنازلي — تابعوه لاستكمال إدخال جميع المدخلات قبل انتهاء المرحلة.',
  },
  {
    sel: '[data-tour="kpis"]',
    title: 'لوحة المتابعة',
    desc: 'نقطة انطلاقكم: لوحة تلخّص أعداد المدخلات وحالاتها، والتكاليف التقديرية، وتوزيعها على المسارات — نظرة عامة سريعة على الوضع الحالي.',
  },
  {
    sel: '[data-tour="nav-all"]',
    title: 'استعراض جميع المدخلات',
    desc: 'من القائمة الجانبية تفتح «جميع المسارات / جميع الأنواع» قائمة بكل المدخلات (المشاريع والمبادرات والعمليات والخدمات) في مكان واحد، مع تصفية حسب النوع والحالة والمسار والبحث بالاسم للوصول السريع إلى أي مدخل.',
  },
  {
    sel: '[data-tour="nav-exec"]',
    title: 'مراحل التنفيذ',
    desc: 'ومنها «مراحل التنفيذ»: توزيع المدخلات على المراحل الزمنية الأربع وحالة تطويرها والتكلفة التقديرية للتنفيذ لكل مرحلة.',
  },
  {
    sel: '[data-tour="nav-launch"]',
    title: 'خطة الإطلاق',
    desc: 'وتعرض «خطة الإطلاق» الإطلاقات المجدولة عبر المراحل، وما يندرج تحت كل إطلاق من مدخلات تُطلق معاً.',
  },
  {
    sel: '[data-tour="notifs"]',
    title: 'الإشعارات',
    desc: 'يصلكم عبر جرس الإشعارات كل ما يخصّكم أولاً بأول: طلبات الاعتماد، والملاحظات المُعادة، وقرارات الترشيح والتمويل، وأي تغيّر في المراحل.',
  },
  {
    sel: '[data-tour="add"]',
    title: 'إضافة مدخل جديد',
    desc: 'من هنا تتم إضافة مشروع أو مبادرة أو عملية أو خدمة جديدة إلى محفظة جهتكم.',
  },
  {
    sel: '[data-tour="basket"]',
    title: 'السلة',
    desc: 'تجمع المدخلات الجاهزة للاعتماد أو الترشيح في مكان واحد قبل إرسالها، وتظهر عليها إشارة عند وجود ما ينتظركم.',
  },
  {
    sel: '[data-tour="cards"]',
    title: 'بطاقات المدخلات',
    desc: 'كل بطاقة تمثّل مدخلاً مع حالته ونسبة إنجازه. اضغطوا على أي بطاقة لاستعراض التفاصيل واستكمال البيانات.',
  },
];

// Coordinator (منسق المسار في الجهة) onboarding — one specific stream inside the
// entity. Short, grouped tour: no per-page or per-card steps, no role switching.
const COORD_TOUR_STEPS: TourStep[] = [
  { sel: '[data-tour="profile"]', title: 'الملف الشخصي وفريق العمل', desc: 'من هنا يمكنك الوصول إلى ملفك الشخصي ومراجعة دورك وصلاحياتك، والاطلاع على فريق العمل المرتبط بالمسار عند توفره.' },
  { sel: '[data-tour="kpis"]', title: 'لوحة متابعة المسار', desc: 'تعرض هذه اللوحة ملخصًا شاملًا لمدخلات المسار، حالتها الحالية، مراحل التقدم، والتكلفة التقديرية.' },
  { sel: '[data-tour="add"]', title: 'إضافة مدخل جديد', desc: 'من هنا يمكنك إضافة مشروع، مبادرة، عملية، أو خدمة ضمن المسار، مع استكمال البيانات المطلوبة قبل الإرسال.' },
  { sel: '[data-tour="nav-all"]', title: 'صفحات المدخلات', desc: 'تتيح لك هذه الصفحات استعراض مدخلات المسار حسب النوع، مثل المشاريع والمبادرات، العمليات، والخدمات، لمتابعتها وتحديث بياناتها.' },
  { sel: '[data-tour="nav-exec"]', title: 'مراحل التنفيذ وخطة الإطلاق', desc: 'يمكنك من هنا متابعة تقدم المدخلات، ومعرفة ما تم إنجازه وما يحتاج إلى تحديث قبل الوصول إلى مرحلة الإطلاق.' },
  { sel: '[data-tour="notifs"]', title: 'الإشعارات', desc: 'يعرض هذا القسم التنبيهات المرتبطة بمهامك، مثل طلبات التحديث، الملاحظات، الاعتمادات، ومراحل التقدم.' },
  { sel: '', title: 'تم الانتهاء من الجولة', desc: 'يمكنك الآن البدء بإضافة ومتابعة مدخلات المسار، والتأكد من تحديث البيانات بشكل دوري.' },
];

// Entity representative (ممثل الجهة) onboarding — follows ALL streams under the
// entity, reviews submissions, and approves the ready ones for the next stage.
const ENTITY_TOUR_STEPS: TourStep[] = [
  { sel: '[data-tour="profile"]', title: 'الملف الشخصي وفريق العمل', desc: 'من هنا يمكنك الوصول إلى ملفك الشخصي ومراجعة دورك وصلاحياتك، والاطلاع على منسقي المسارات المرتبطين بجهتك عند توفرهم.' },
  { sel: '[data-tour="kpis"]', title: 'لوحة متابعة مدخلات الجهة', desc: 'تعرض هذه اللوحة نظرة شاملة على مدخلات الجهة حسب المسارات، مع حالة التقدم، التكلفة التقديرية، وحالة الاعتماد.' },
  { sel: '[data-tour="nav-all"]', title: 'صفحات المسارات', desc: 'تتيح لك هذه الصفحات متابعة مدخلات الجهة حسب المسارات المختلفة، ومراجعة مستوى التقدم والجاهزية قبل الاعتماد.' },
  { sel: '[data-tour="nav-exec"]', title: 'مراحل التنفيذ وخطة الإطلاق', desc: 'يمكنك من هنا متابعة تقدم مدخلات الجهة عبر مراحل التنفيذ، ومعرفة المدخلات الجاهزة أو القريبة من الإطلاق.' },
  { sel: '[data-tour="nav-team"]', title: 'فريق العمل', desc: 'يعرض هذا القسم منسقي المسارات التابعين لجهتك، لمتابعة الأدوار والتأكد من استكمال المدخلات المطلوبة.' },
  { sel: '[data-tour="notifs"]', title: 'الإشعارات', desc: 'يعرض هذا القسم التنبيهات المرتبطة بمدخلات الجهة، مثل طلبات التحديث، الملاحظات، الاعتمادات، ومراحل التقدم.' },
  { sel: '', title: 'تم الانتهاء من الجولة', desc: 'يمكنك الآن متابعة جميع مسارات الجهة، مراجعة المدخلات، واعتماد الجاهز منها للرفع إلى المراحل التالية.' },
];

// National committee (اللجنة الوطنية) onboarding — national oversight across all
// entities/streams, reviews nominations, holds final approval authority.
const AI_TOUR_STEPS: TourStep[] = [
  { sel: '[data-tour="profile"]', title: 'الملف الشخصي وفريق العمل', desc: 'من هنا يمكنك الوصول إلى ملفك الشخصي ومراجعة صلاحياتك، والاطلاع على أعضاء فريق العمل المرتبطين بمتابعة الترشيحات والاعتماد.' },
  { sel: '[data-tour="ai-heading"]', title: 'لوحة اللجنة الوطنية', desc: 'تعرض هذه اللوحة نظرة وطنية شاملة على مدخلات الجهات، توزيعها حسب المسارات، وحالة الترشيحات والاعتماد.' },
  { sel: '[data-tour="nav-all"]', title: 'صفحات المسارات', desc: 'تتيح لك هذه الصفحات متابعة المدخلات على مستوى جميع المسارات والجهات، لمراجعة حجم المشاركة وحالة الترشيح.' },
  { sel: '[data-tour="nav-exec"]', title: 'مراحل التنفيذ وخطة الإطلاق', desc: 'يمكنك من هنا متابعة جاهزية المدخلات على المستوى الوطني، ومعرفة ما هو جاهز أو قريب من الإطلاق.' },
  { sel: '[data-tour="nav-entities"]', title: 'الجهات المشاركة', desc: 'يعرض هذا القسم قائمة الجهات المشاركة وعدد المدخلات المقدمة من كل جهة، لمتابعة مستوى المشاركة والالتزام.' },
  { sel: '[data-tour="basket"]', title: 'قائمة الاعتماد والتمويل', desc: 'تجمع هذه القائمة المدخلات المرشحة للتمويل، لمراجعتها واتخاذ القرار النهائي بشأن اعتمادها.' },
  { sel: '[data-tour="notifs"]', title: 'الإشعارات', desc: 'يعرض هذا القسم التنبيهات المرتبطة بالترشيحات، طلبات المراجعة، الاعتمادات، والتحديثات المهمة على مستوى المنصة.' },
  { sel: '', title: 'تم الانتهاء من الجولة', desc: 'يمكنك الآن متابعة المدخلات على المستوى الوطني، مراجعة الترشيحات، واتخاذ قرارات الاعتماد النهائي للتمويل.' },
];

// Stream head (رئيس المسار) onboarding — reviews all entities' entries within one
// stream, tracks readiness/cost, and nominates entries for funding (NOT final
// approval — that belongs to the national committee).
const PATH_TOUR_STEPS: TourStep[] = [
  { sel: '[data-tour="profile"]', title: 'الملف الشخصي وفريق العمل', desc: 'من هنا يمكنك الوصول إلى ملفك الشخصي ومراجعة صلاحياتك، والاطلاع على فريق العمل المرتبط بالمسار عند توفره.' },
  { sel: '[data-tour="kpis"]', title: 'لوحة رئيس المسار', desc: 'تعرض هذه اللوحة نظرة شاملة على مدخلات جميع الجهات ضمن المسار، مع حالة التقدم، الترشيحات، والتكلفة التقديرية.' },
  { sel: '[data-tour="nav-all"]', title: 'صفحات المدخلات', desc: 'تتيح لك هذه الصفحات استعراض مدخلات المسار حسب النوع، لمراجعة التفاصيل وتحديد المدخلات المناسبة للترشيح.' },
  { sel: '[data-tour="nav-exec"]', title: 'مراحل التنفيذ وخطة الإطلاق', desc: 'يمكنك من هنا متابعة جاهزية المدخلات وتقييم تقدمها قبل اختيار المناسب منها للترشيح.' },
  { sel: '[data-tour="basket"]', title: 'سلة التمويل', desc: 'تجمع هذه السلة المدخلات التي اخترتها للترشيح، ليتم رفعها إلى اللجنة الوطنية للمراجعة واتخاذ القرار النهائي.' },
  { sel: '[data-tour="notifs"]', title: 'الإشعارات', desc: 'يعرض هذا القسم التنبيهات المرتبطة بمدخلات المسار، مثل التحديثات، الملاحظات، الترشيحات، وحالة المراجعة.' },
  { sel: '', title: 'ملاحظة مهمة', desc: 'ترشيح المدخلات من رئيس المسار لا يعني الاعتماد النهائي. يتم الاعتماد النهائي من قبل اللجنة الوطنية.' },
  { sel: '', title: 'تم الانتهاء من الجولة', desc: 'يمكنك الآن متابعة مدخلات الجهات ضمن المسار، مراجعتها، وترشيح المناسب منها للتمويل.' },
];

// ---------------------------------------------------------------------------
// Small hover-aware wrappers (the prototype used `style-hover`).
// ---------------------------------------------------------------------------
function HoverDiv({
  base,
  hover,
  children,
  onClick,
  ...rest
}: {
  base: CSSProperties;
  hover?: CSSProperties;
  children?: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  [k: string]: unknown;
}) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ ...base, ...(h ? hover : null) }}
      {...(rest as object)}
    >
      {children}
    </div>
  );
}

function HoverButton({
  base,
  hover,
  children,
  onClick,
  title,
}: {
  base: CSSProperties;
  hover?: CSSProperties;
  children?: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}) {
  const [h, setH] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ ...base, ...(h ? hover : null) }}
    >
      {children}
    </button>
  );
}

const stop = (e: React.MouseEvent) => e.stopPropagation();

// shared brand gradient: deep navy (right, RTL reading start) → vivid blue
const BLUE_GRAD = 'linear-gradient(270deg,#0B1B3A 0%,#16408F 100%)';

// small heading naming each line/section of a page
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="hd" style={{ fontSize: 13, fontWeight: 800, color: '#33415C', marginBottom: -4 }}>
      {children}
    </div>
  );
}

// ---- entity overview: cost + inputs donut cards, then per-stream cards ----
const EO_ARROW = 'M17 17 7 7M13 7H7v6';
const EO_WALLET = 'M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4z';
const EO_GRID = 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z';

function EoDonut({ frac, dark, light, top, center, sub, arcMeta }: { frac: number; dark: string; light: string; top?: string; center: string; sub: string; arcMeta?: { exec: { center: string; sub: string; top?: string }; launch: { center: string; sub: string; top?: string } } }) {
  const R = 42;
  const C = 2 * Math.PI * R;
  // arc-level hover: hovering either arc dims the other and (when arcMeta is
  // supplied) updates the centre to that arc's figure.
  const [arcHov, setArcHov] = useState<null | 'exec' | 'launch'>(null);
  const meta = arcHov && arcMeta ? arcMeta[arcHov] : null;
  const cCenter = meta ? meta.center : center;
  const cSub = meta ? meta.sub : sub;
  const cTop = meta ? meta.top : top;
  const canHover = !!arcMeta;
  return (
    <div style={{ position: 'relative', flex: 'none', width: 150, height: 150 }}>
      <svg viewBox="0 0 110 110" width={150} height={150}>
        <circle cx="55" cy="55" r={R} fill="none" stroke="#EDF1F8" strokeWidth="13" />
        <circle cx="55" cy="55" r={R} fill="none" stroke={light} strokeWidth="13"
          strokeDasharray={`${(1 - frac) * C} ${C}`} strokeDashoffset={-(frac * C)} transform="rotate(-90 55 55)"
          onMouseOver={canHover ? () => setArcHov('launch') : undefined}
          onMouseOut={canHover ? () => setArcHov(null) : undefined}
          style={{ opacity: arcHov === 'exec' ? 0.28 : 1, transition: 'opacity .12s', cursor: canHover ? 'pointer' : 'default' }} />
        <circle cx="55" cy="55" r={R} fill="none" stroke={dark} strokeWidth="13"
          strokeDasharray={`${frac * C} ${C}`} transform="rotate(-90 55 55)" strokeLinecap="butt"
          onMouseOver={canHover ? () => setArcHov('exec') : undefined}
          onMouseOut={canHover ? () => setArcHov(null) : undefined}
          style={{ opacity: arcHov === 'launch' ? 0.28 : 1, transition: 'opacity .12s', cursor: canHover ? 'pointer' : 'default' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 22px', pointerEvents: 'none' }}>
        {cTop && <span style={{ fontSize: 9.5, color: '#9AA6BC', fontWeight: 400, lineHeight: 1.3 }}>{cTop}</span>}
        <span style={{ fontSize: 22, fontWeight: 800, color: '#13213C', lineHeight: 1.15 }}>{cCenter}</span>
        <span style={{ fontSize: 9.5, color: '#9AA6BC', fontWeight: 400, marginTop: 2, lineHeight: 1.3 }}>{cSub}</span>
      </div>
    </div>
  );
}

// Multi-segment donut: each status is its own arc, coloured to match the
// legend so the chart and the list read as one system.
function EoDonutSeg({ segs, dim, top, center, sub }: { segs: { frac: number; color: string; key: string; label?: string; value?: string | number }[]; dim?: string | null; top?: string; center: string; sub: string }) {
  const R = 42;
  const C = 2 * Math.PI * R;
  const GAP = 2.2; // small white gap between segments (viewBox units)
  // arc-level hover: hovering a segment directly on the ring dims the others and
  // (when the segment carries a label/value) updates the centre — so the donut
  // is interactive on its own, even with no legend beside it. Takes precedence
  // over any legend-driven `dim` coming from the parent.
  const [arcHov, setArcHov] = useState<string | null>(null);
  const effDim = arcHov ?? dim ?? null;
  const aSeg = arcHov ? segs.find((sg) => sg.key === arcHov) : undefined;
  const cCenter = aSeg && aSeg.value !== undefined ? String(aSeg.value) : center;
  const cSub = aSeg && aSeg.label !== undefined ? aSeg.label : sub;
  let acc = 0;
  return (
    <div style={{ position: 'relative', flex: 'none', width: 150, height: 150 }}>
      <svg viewBox="0 0 110 110" width={150} height={150}>
        <circle cx="55" cy="55" r={R} fill="none" stroke="#EDF1F8" strokeWidth="13" />
        {segs.map((sgm) => {
          const off = acc;
          acc += sgm.frac;
          const len = Math.max(0, sgm.frac * C - GAP);
          return (
            <circle
              key={sgm.key}
              cx="55"
              cy="55"
              r={R}
              fill="none"
              stroke={sgm.color}
              strokeWidth="13"
              strokeLinecap="butt"
              strokeDasharray={`${len} ${C}`}
              strokeDashoffset={-(off * C)}
              transform="rotate(-90 55 55)"
              onMouseOver={() => setArcHov(sgm.key)}
              onMouseOut={() => setArcHov(null)}
              style={{ opacity: effDim && effDim !== sgm.key ? 0.28 : 1, transition: 'opacity .12s', cursor: 'pointer' }}
            />
          );
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 22px', pointerEvents: 'none' }}>
        {top && <span style={{ fontSize: 9.5, color: '#9AA6BC', fontWeight: 400, lineHeight: 1.3 }}>{top}</span>}
        <span style={{ fontSize: 22, fontWeight: 800, color: '#13213C', lineHeight: 1.15 }}>{cCenter}</span>
        <span style={{ fontSize: 9.5, color: '#9AA6BC', fontWeight: 400, marginTop: 2, lineHeight: 1.3 }}>{cSub}</span>
      </div>
    </div>
  );
}

function EoCardHead({ title, iconD, onArrow, info }: { title: string; iconD: string; onArrow?: () => void; info?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 36, height: 36, borderRadius: 11, background: '#EAF1FE', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Icon d={iconD} size={18} color="#2563EB" />
        </span>
        <span className="hd" style={{ fontSize: 15, fontWeight: 800, color: '#13213C' }}>{title}</span>
        {info && <InfoTip text={info} keep />}
      </div>
      <button
        onClick={onArrow}
        aria-label="عرض التفاصيل"
        style={{ width: 34, height: 34, borderRadius: 10, background: '#EAF1FE', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}
      >
        <Icon d={EO_ARROW} size={15} color="#2563EB" />
      </button>
    </div>
  );
}

function EntityOverview({ vm }: { vm: VM }) {
  const s = vm.store;
  const cc = vm.costCard;
  const ic = vm.inputsCard;
  const [hovIn, setHovIn] = useState<string | null>(null);
  const [hovCost, setHovCost] = useState<string | null>(null);
  const isCoord = vm.role === 'coord';
  const isPath = vm.role === 'path';
  const useTypes = isCoord || isPath;
  const [hovNom, setHovNom] = useState<string | null>(null);
  const nc = vm.nomCard;
  const sec2Cards = useTypes ? vm.typeOverviewCards : vm.streamOverviewCards;
  const sec2Title = useTypes ? 'توزيع المدخلات حسب النوع' : 'توزيع مدخلات الجهة حسب المسارات';
  const sec2Sub = useTypes ? 'تصنيف مدخلات المسار حسب النوع، مراحل التقدم، والتكلفة التقديرية.' : 'عرض مدخلات الجهة في كل مسار حسب مراحل التقدم والتكلفة التقديرية.';
  const cardStyle: CSSProperties = { background: '#fff', border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', borderRadius: 18, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 };
  const money = (label: string) => {
    const p = label.split(' ');
    return { num: p[0], unit: p.slice(1).join(' ') };
  };
  const costTot = money(cc.totalLabel);
  const clampFrac = (n: number) => Math.min(0.95, Math.max(0.05, n));

  // inputs legend items (hoverable)
  const inItems = [
    { key: 'capable', label: 'جاهزة للتحويل', v: ic.capable, dot: '#2563EB', square: true, bold: true },
    { key: 'underDev', label: 'قيد التطوير', v: ic.underDev, dot: '#3B82F6', square: false, bold: false, sub: true },
    { key: 'developed', label: 'تم التطوير', v: ic.developed, dot: '#60A5FA', square: false, bold: false, sub: true },
    { key: 'launched', label: 'تم الإطلاق', v: ic.launched, dot: '#93C5FD', square: false, bold: false, sub: true },
    { key: 'notCapable', label: 'غير قابلة للتحويل', v: ic.notCapable, dot: '#C7D9F5', square: true, bold: true, divider: true },
  ];
  const inHov = inItems.find((x) => x.key === hovIn);
  const inDonut = inHov
    ? { center: String(inHov.v), sub: inHov.label }
    : { center: String(ic.total), sub: 'إجمالي المدخلات' };
  // multi-colour segments — each status coloured to match its legend marker
  const inSegs = (() => {
    const t = ic.total || 1;
    const captured = Math.max(0, ic.capable - ic.underDev - ic.developed - ic.launched);
    return [
      { key: 'capable', frac: captured / t, color: '#2563EB', label: 'جاهزة للتحويل', value: ic.capable },
      { key: 'underDev', frac: ic.underDev / t, color: '#3B82F6', label: 'قيد التطوير', value: ic.underDev },
      { key: 'developed', frac: ic.developed / t, color: '#60A5FA', label: 'تم التطوير', value: ic.developed },
      { key: 'launched', frac: ic.launched / t, color: '#93C5FD', label: 'تم الإطلاق', value: ic.launched },
      { key: 'notCapable', frac: ic.notCapable / t, color: '#C7D9F5', label: 'غير قابلة للتحويل', value: ic.notCapable },
    ].filter((x) => x.frac > 0.0001);
  })();

  // cost legend items (hoverable)
  const costItems = [
    { key: 'exec', label: 'تكلفة التحويل', short: 'تكلفة التحويل', val: cc.execLabel, pct: cc.execPct, frac: cc.execFrac, c: '#2563EB' },
    { key: 'launch', label: 'تكلفة الإطلاق', short: 'تكلفة الإطلاق', val: cc.launchLabel, pct: cc.launchPct, frac: 1 - cc.execFrac, c: '#16408F' },
  ];
  const costHov = costItems.find((x) => x.key === hovCost);
  const costM = costHov ? money(costHov.val) : costTot;
  const costDonut = costHov
    ? { frac: clampFrac(costHov.frac), light: '#EDF1F8', top: costHov.short, center: costM.num, sub: costM.unit }
    : { frac: cc.execFrac, light: '#16408F', top: 'إجمالي التكلفة', center: costTot.num, sub: costTot.unit };
  // arc-level hover figures for the cost donut (exec = dark arc, launch = light arc)
  const execM = money(cc.execLabel);
  const launchM = money(cc.launchLabel);
  const costArcMeta = {
    exec: { center: execM.num, sub: execM.unit, top: 'تكلفة التحويل' },
    launch: { center: launchM.num, sub: launchM.unit, top: 'تكلفة الإطلاق' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* ===== Section 1: التكلفة الإجمالية + إجمالي المدخلات ===== */}
      <div data-r="dash-top" data-tour="kpis" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* --- إجمالي المدخلات (right) --- */}
        <div data-tour="inputs-card" style={cardStyle}>
          <EoCardHead title={isPath ? 'إجمالي المدخلات' : isCoord ? 'ملخص مدخلات المسار' : 'ملخص مدخلات الجهة'} iconD={EO_GRID} onArrow={() => s.setNavSection('all')} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <EoDonutSeg segs={inSegs} dim={hovIn} center={inDonut.center} sub={inDonut.sub} />
            <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {inItems.map((r) => (
                <Fragment key={r.key}>
                  {r.divider && <div style={{ height: 1, background: '#EEF1F6', margin: '5px 0' }} />}
                  <div
                    onMouseEnter={() => setHovIn(r.key)}
                    onMouseLeave={() => setHovIn(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '6px 10px',
                      marginRight: r.sub ? 12 : 0,
                      borderRadius: 9,
                      background: hovIn === r.key ? '#EEF3FC' : 'transparent',
                      cursor: 'default',
                      transition: 'background .12s',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: r.square ? 3 : '50%', background: r.dot, flex: 'none' }} />
                      <span className={r.bold ? 'hd' : undefined} style={{ fontSize: r.bold ? 13.5 : 12.5, fontWeight: r.bold ? 800 : 400, color: r.bold ? '#13213C' : '#6B7A93' }}>{r.label}</span>
                    </span>
                    <span style={{ fontSize: r.bold ? 15 : 13, fontWeight: 800, color: '#13213C' }}>{r.v}</span>
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* --- left card: nominations summary (path) OR cost (entity/coord) --- */}
        {isPath ? (() => {
          const nomItems = [
            { key: 'nominated', label: 'المدخلات المرشحة من قبلي', v: nc.nominated, dot: '#2563EB', square: true, bold: true, numColor: '#2563EB', labelColor: '#13213C' },
            { key: 'funded', label: 'المدخلات المعتمدة للتمويل', v: nc.funded, dot: '#2563EB', square: true, bold: false, sub: true, numColor: '#13213C', labelColor: '#6B7A93' },
            { key: 'pending', label: 'المدخلات قيد مراجعة اللجنة', v: nc.pending, dot: '#93B4F5', square: true, bold: false, sub: true, numColor: '#13213C', labelColor: '#6B7A93' },
            { key: 'notNominated', label: 'المدخلات غير المرشّحة', v: nc.notNominated, dot: '#C7D9F5', square: true, bold: true, divider: true, numColor: '#9AA6BC', labelColor: '#9AA6BC' },
          ];
          const nomHov = nomItems.find((x) => x.key === hovNom);
          const nomCenter = nomHov ? { center: String(nomHov.v), sub: nomHov.label } : { center: String(nc.total), sub: 'إجمالي المدخلات' };
          const t = nc.total || 1;
          const nomSegs = [
            { key: 'funded', frac: nc.funded / t, color: '#2563EB', label: 'المدخلات المعتمدة للتمويل', value: nc.funded },
            { key: 'pending', frac: nc.pending / t, color: '#93B4F5', label: 'المدخلات قيد مراجعة اللجنة', value: nc.pending },
            { key: 'notNominated', frac: nc.notNominated / t, color: '#C7D9F5', label: 'المدخلات غير المرشّحة', value: nc.notNominated },
          ].filter((x) => x.frac > 0.0001);
          return (
            <div data-tour="nom-card" style={cardStyle}>
              <EoCardHead title="ملخّص الترشيحات" iconD={EO_WALLET} onArrow={() => s.setNavSection('all')} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <EoDonutSeg segs={nomSegs} dim={hovNom === 'nominated' ? null : hovNom} center={nomCenter.center} sub={nomCenter.sub} />
                <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {nomItems.map((r) => (
                    <Fragment key={r.key}>
                      {r.divider && <div style={{ height: 1, background: '#EEF1F6', margin: '5px 0' }} />}
                      <div
                        onMouseEnter={() => setHovNom(r.key)}
                        onMouseLeave={() => setHovNom(null)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          padding: '6px 10px',
                          marginRight: r.sub ? 12 : 0,
                          borderRadius: 9,
                          background: hovNom === r.key ? '#EEF3FC' : 'transparent',
                          cursor: 'default',
                          transition: 'background .12s',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: r.square ? 3 : '50%', background: r.dot, flex: 'none' }} />
                          <span className={r.bold ? 'hd' : undefined} style={{ fontSize: r.bold ? 13.5 : 12.5, fontWeight: r.bold ? 800 : 400, color: r.labelColor }}>{r.label}</span>
                        </span>
                        <span style={{ fontSize: r.bold ? 15 : 13, fontWeight: 800, color: r.numColor }}>{r.v}</span>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          );
        })() : (
        <div data-tour="cost-card" style={cardStyle}>
          <EoCardHead title="ملخص التكلفة التقديرية" iconD={EO_WALLET} onArrow={() => s.setNavSection('launchplans')} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <EoDonut frac={costDonut.frac} dark={costHov ? costHov.c : '#2563EB'} light={costDonut.light} top={costDonut.top} center={costDonut.center} sub={costDonut.sub} arcMeta={costArcMeta} />
            <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {costItems.map((r) => (
                <div
                  key={r.key}
                  onMouseEnter={() => setHovCost(r.key)}
                  onMouseLeave={() => setHovCost(null)}
                  style={{
                    background: hovCost === r.key ? '#EEF3FC' : '#F7F9FD',
                    border: '1px solid ' + (hovCost === r.key ? '#D8E3F5' : '#EEF1F6'),
                    borderRadius: 12,
                    padding: '11px 13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    cursor: 'default',
                    transition: 'background .12s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#6B7A93', fontWeight: 400 }}>{r.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#13213C', marginTop: 2 }}>{r.val}</div>
                    </div>
                    <span style={{ width: 11, height: 11, borderRadius: 3, background: r.c, flex: 'none' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* ===== Section 2: overview cards (by stream for entity · by type for coord) ===== */}
      <div>
        <div className="hd" style={{ fontSize: 16, fontWeight: 800, color: '#13213C' }}>{sec2Title}</div>
        <div style={{ fontSize: 12, color: '#9AA6BC', fontWeight: 400, marginTop: 3 }}>{sec2Sub}</div>
      </div>
      <div data-r="seccards" data-tour="type-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14, marginTop: -8 }}>
        {sec2Cards.map((st) => (
          <div key={st.id} data-tour="sec2-card" style={{ background: '#fff', border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', borderRadius: 18, padding: '18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, minHeight: 44 }}>
              <div className="hd" style={{ flex: 1, fontSize: 14.5, fontWeight: 800, color: '#13213C', lineHeight: 1.5, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{st.name}</div>
              <span style={{ width: 38, height: 38, borderRadius: 11, background: '#EAF1FE', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <Icon d={st.icon} size={18} color="#2563EB" />
              </span>
            </div>
            <div style={{ height: 1, background: '#EEF1F6' }} />
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 11.5, color: '#9AA6BC', fontWeight: 400 }}>عدد المدخلات</span>
              <span style={{ fontSize: 30, fontWeight: 800, color: '#13213C', lineHeight: 1 }}>{st.total}</span>
            </div>
            <div style={{ background: '#F7F9FD', border: '1px solid #EEF1F6', borderRadius: 12, padding: '12px 13px' }}>
              <div style={{ fontSize: 10.5, color: '#9AA6BC', fontWeight: 400, marginBottom: 8, textAlign: 'right' }}>توزيع المدخلات حسب المراحل</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {st.stages.map((sg) => (
                  <div key={sg.label} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ width: 5, height: 5, flex: 'none', borderRadius: '50%', background: '#2563EB' }} />
                    <span style={{ flex: 1, fontSize: 12, color: '#54627B', fontWeight: 400 }}>{'إطلاقات ' + sg.label}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: '#13213C' }}>{sg.n}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ height: 1, background: '#EEF1F6', marginTop: 'auto' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#6B7A93', fontWeight: 400 }}>تكلفة التحويل</span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: '#13213C' }}>{st.execLabel}</span>
              </div>
              {/* launch budget hidden for track head — execution budget only */}
              {!isPath && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#6B7A93', fontWeight: 400 }}>تكلفة الإطلاق</span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: '#13213C' }}>{st.launchLabel}</span>
                  </div>
                  <div style={{ height: 1, background: '#EEF1F6', margin: '2px 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span className="hd" style={{ fontSize: 12.5, fontWeight: 800, color: '#13213C' }}>إجمالي التكلفة</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#2563EB' }}>{st.totalLabel}</span>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={st.onOpen}
              data-tour="type-details"
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#EAF1FE', color: '#1D4ED8', border: 'none', borderRadius: 11, padding: '10px 0', fontWeight: 800, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {useTypes ? 'عرض تفاصيل النوع' : 'عرض تفاصيل المسار'}
              <Icon d="M15 18l-6-6 6-6" size={12} color="#1D4ED8" />
            </button>
          </div>
        ))}
      </div>


    </div>
  );
}

// Execution & launch stages — distribution of inputs across the four stages
// (entity representative view)
const STAGE_CAL = 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z';
const STAGE_STATUSES = [
  { label: 'قيد التطوير', c: '#3B6FE8', key: 'underDev' as const },
  { label: 'تم التطوير', c: '#7BA3F5', key: 'developed' as const },
  { label: 'تم الإطلاق', c: '#C7D9F5', key: 'launched' as const },
];

// ---- title-row filters (مراحل التنفيذ / خطة الإطلاق) ----
// committee (ai): searchable entity combobox + stream select; stream-head
// (path): entity combobox only. Filters sit on the LEFT of the title row.
type FilterOpt = { v: string; label: string };

const FilterChevron = () => (
  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, flex: 'none', stroke: '#9AA6BC', fill: 'none', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

// Custom DOM dropdown replacing native <select> in filter UIs: native popups
// are drawn by the OS/browser at their own scale and position (broken under
// device emulation and inconsistent across phones), so we render our own.
function FilterSelect({ value, options, onChange, minWidth = 150 }: { value: string; options: FilterOpt[]; onChange: (v: string) => void; minWidth?: number }) {
  const [open, setOpen] = useState(false);
  const label = options.find((o) => o.v === value)?.label || options[0]?.label || '';
  const pick = (v: string) => { onChange(v); setOpen(false); };
  return (
    <div data-r="fselect" style={{ position: 'relative', flex: 'none' }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', minWidth, height: 40, background: '#fff', border: '1px solid #E4ECF7', borderRadius: 11, padding: '0 13px', cursor: 'pointer' }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 800, color: '#13213C', whiteSpace: 'nowrap' }}>{label}</span>
        <FilterChevron />
      </div>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 39 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: '100%', width: 'max-content', maxWidth: 'min(300px, calc(100vw - 32px))', maxHeight: 320, overflowY: 'auto', background: '#fff', border: '1px solid #E4ECF7', borderRadius: 13, boxShadow: '0 18px 44px -14px rgba(15,31,61,.28)', zIndex: 40 }}>
            {options.map((o) => (
              <div
                key={o.v}
                onClick={() => pick(o.v)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 14px', fontSize: 12.5, fontWeight: o.v === value ? 800 : 400, color: o.v === value ? '#1D4ED8' : '#33415C', background: o.v === value ? '#F2F7FF' : '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {o.label}
                {o.v === value && <Icon d="M20 6 9 17l-5-5" size={13} color="#1D4ED8" />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StreamSelect({ value, options, onChange }: { value: string; options: FilterOpt[]; onChange: (v: string) => void }) {
  return <FilterSelect value={value} options={options} onChange={onChange} />;
}

function EntityFilter({ value, options, onChange }: { value: string; options: FilterOpt[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const label = value === 'all' ? 'كل الجهات' : value;
  const q = query.trim();
  const filtered = options.filter((o) => !q || o.label.includes(q));
  const pick = (v: string) => { onChange(v); setOpen(false); setQuery(''); };
  return (
    <div data-r="entfilter" style={{ position: 'relative', flex: 'none' }}>
      <div
        onClick={() => { setOpen((o) => !o); setQuery(''); }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', minWidth: 160, background: '#fff', border: '1px solid #E4ECF7', borderRadius: 11, padding: '8px 13px', cursor: 'pointer' }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 800, color: '#13213C' }}>{label}</span>
        <FilterChevron />
      </div>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 39 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 290, maxWidth: 'min(290px, calc(100vw - 40px))', background: '#fff', border: '1px solid #E4ECF7', borderRadius: 13, boxShadow: '0 18px 44px -14px rgba(15,31,61,.28)', zIndex: 40, overflow: 'hidden' }}>
            <div style={{ padding: 10, borderBottom: '1px solid #F0F3F8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F5F7FB', borderRadius: 9, padding: '8px 11px' }}>
                <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, flex: 'none', stroke: '#9AA6BC', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  value={query}
                  autoFocus
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث عن جهة…"
                  style={{ border: 'none', background: 'transparent', outline: 'none', font: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#13213C', width: '100%' }}
                />
              </div>
            </div>
            <div style={{ maxHeight: 264, overflowY: 'auto', padding: 6 }}>
              {filtered.map((o) => {
                const sel = o.v === value;
                return (
                  <div
                    key={o.v}
                    onClick={() => pick(o.v)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 11px', borderRadius: 9, cursor: 'pointer', fontSize: 12.5, fontWeight: sel ? 800 : 600, color: sel ? '#2563EB' : '#42506B', background: sel ? '#EAF0FE' : 'transparent' }}
                    onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = '#F5F7FB'; }}
                    onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span>{o.label}</span>
                    {sel && (
                      <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, flex: 'none', stroke: '#2563EB', fill: 'none', strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: '#9AA6BC', fontWeight: 600 }}>لا توجد نتائج</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// title on the right, filters on the left (same row) — replaces the old scope banner
function StagePageHeader({ title, sub, f }: { title: string; sub: string; f: VM['execFilter'] }) {
  return (
    <div style={{ direction: 'rtl', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <div className="hd" style={{ fontSize: 20, fontWeight: 800, color: '#13213C' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#8A97AD', fontWeight: 400, marginTop: 6, maxWidth: 720, lineHeight: 1.7 }}>{sub}</div>
      </div>
      {(f.showEnt || f.showStream) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none', flexWrap: 'wrap' }}>
          {/* RTL: entity («كل الجهات») on the right, stream («كل المسارات») on the left */}
          {f.showEnt && <EntityFilter value={f.ent} options={f.entOptions} onChange={f.setEnt} />}
          {f.showStream && <StreamSelect value={f.stream} options={f.streamOptions} onChange={f.setStream} />}
        </div>
      )}
    </div>
  );
}

function StageCard({ b, showStream, onManage }: { b: VM['batchSummary'][number]; showStream: boolean; onManage?: () => void }) {
  const [hov, setHov] = useState<string | null>(null);
  const tot = b.count || 1;
  const segs = STAGE_STATUSES.map((s) => ({ key: s.key, frac: b[s.key] / tot, color: s.c, label: s.label, value: b[s.key] })).filter((x) => x.frac > 0.0001);
  return (
    <div style={{ background: '#fff', border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', borderRadius: 18, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div className="hd" style={{ fontSize: 16, fontWeight: 800, color: '#13213C' }}>{b.displayName}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#9AA6BC', fontWeight: 400, marginTop: 5 }}>
            <Icon d={STAGE_CAL} size={13} color="#9AA6BC" />
            {b.period}
          </div>
        </div>
        {onManage && (
          <button
            onClick={onManage}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#EAF0FE', border: '1px solid #D9E4FD', borderRadius: 999, padding: '5px 12px', fontSize: 11, color: '#2563EB', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', flex: 'none' }}
          >
            <Icon d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" size={11} color="#2563EB" />
            إدارة التنفيذ
          </button>
        )}
      </div>
      {/* donut (right) + status legend (left), with hover — a zero-phase still
          renders its ring as 0 with the empty breakdown rows below */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <EoDonutSeg segs={segs} dim={hov} center={String(b.count)} sub="مدخلات" />
        <div style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STAGE_STATUSES.map((r) => (
            <div
              key={r.label}
              onMouseEnter={() => setHov(r.key)}
              onMouseLeave={() => setHov(null)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '4px 8px', borderRadius: 8, background: hov === r.key ? '#EEF3FC' : 'transparent', cursor: 'default', transition: 'background .12s' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: r.c, flex: 'none' }} />
                <span style={{ fontSize: 12.5, color: '#54627B', fontWeight: 400 }}>{r.label}</span>
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#13213C' }}>{b[r.key]}</span>
            </div>
          ))}
        </div>
      </div>
      {/* نوع المدخلات */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11.5, color: '#9AA6BC', fontWeight: 400, flex: 'none' }}>نوع المدخلات</span>
        <div style={{ flex: 1, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {b.typeBreak.map((tp) => (
            <span key={tp.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#EFF1F5', color: '#42506B', borderRadius: 999, padding: '5px 12px', fontSize: 11.5, fontWeight: 700 }}>
              {tp.label} <b style={{ color: '#13213C' }}>{tp.n}</b>
            </span>
          ))}
        </div>
      </div>
      {/* المسار — committee only (spans multiple streams); single-stream roles omit it */}
      {showStream && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11.5, color: '#9AA6BC', fontWeight: 400, flex: 'none' }}>المسار</span>
          <div style={{ flex: 1, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {b.streamBreak.map((st) => (
              <span key={st.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#EFF1F5', color: '#42506B', borderRadius: 999, padding: '5px 12px', fontSize: 11.5, fontWeight: 700 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, flex: 'none' }} />
                {st.name} <b style={{ color: '#13213C' }}>{st.n}</b>
              </span>
            ))}
          </div>
        </div>
      )}
      {/* cost footer */}
      <div style={{ borderTop: '1px solid #F0F3F8', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#6B7A93', fontWeight: 400 }}>
          <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h4" size={13} color="#9AA6BC" />
          تكلفة التحويل التقديرية للمرحلة
        </span>
        <span className="hd" style={{ fontSize: 15, fontWeight: 800, color: '#13213C' }}>{b.costLabel}</span>
      </div>
      {/* view-inputs button (full width, bottom) */}
      <button
        onClick={b.onOpenAll}
        style={{ marginTop: 'auto', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#fff', border: '1px solid #E4ECF7', borderRadius: 12, padding: '11px 0', fontSize: 12.5, fontWeight: 800, color: '#1D4ED8', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        عرض المدخلات
        <Icon d="M15 18l-6-6 6-6" size={13} color="#1D4ED8" />
      </button>
    </div>
  );
}

function StageDistribution({ vm, onManage }: { vm: VM; onManage?: (batch: string) => void }) {
  return (
    <>
      <StagePageHeader
        title="مراحل التنفيذ"
        sub="توزيع مدخلات التحول على المراحل الزمنية الأربع مع التكلفة التقديرية للتنفيذ — ضمن نطاق عرضك."
        f={vm.execFilter}
      />
      <div data-tour="stages" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(440px,1fr))', gap: 16 }}>
        {vm.batchSummary.map((b) => (
          <StageCard key={b.name} b={b} showStream={vm.execFilter.showStreamBreak} onManage={onManage ? () => onManage(b.name) : undefined} />
        ))}
      </div>
    </>
  );
}

// ===== خطة الإطلاق (Launch Plan) — entity representative, read-only =====
// Phase → Launch → Entry, per the launch-plan handover. Only the status pill
// carries colour; type chip stays neutral.
const LPE_STATUS: Record<'dev' | 'launch' | 'done', { label: string; c: string; bg: string }> = {
  dev: { label: 'قيد التطوير', c: '#1F5FE0', bg: '#EAF0FE' },
  launch: { label: 'تم التطوير', c: '#3F82D8', bg: '#EAF3FD' },
  done: { label: 'تم الإطلاق', c: '#0B8A4B', bg: '#E6F6EE' },
};

// small scope chip (stream / entity) on launch cards and entry rows —
// white like the neighbouring pills, text only
function LpScopeChip({ label, title }: { label: string; title?: string }) {
  return (
    <span
      title={title || label}
      style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 700, color: '#42506B', background: '#F1F4F9', borderRadius: 999, padding: '3px 10px', maxWidth: 230, overflow: 'hidden' }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </span>
  );
}

function LpEntryRow({ e, launched, showStream, showEnt }: { e: VM['batchSummary'][number]['launches'][number]['items'][number]; launched: boolean; showStream?: boolean; showEnt?: boolean }) {
  const [hov, setHov] = useState(false);
  const st = LPE_STATUS[launched ? 'done' : e.status];
  return (
    <div
      onClick={e.onOpen}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', flexWrap: 'wrap',
        border: '1px solid ' + (hov ? '#D3DEEE' : '#E9EDF4'), borderRadius: 11,
        background: '#fff', boxShadow: hov ? '0 2px 8px -4px rgba(15,31,61,.14)' : '0 1px 2px rgba(15,31,61,.04)',
        cursor: 'pointer', transition: 'box-shadow .12s,border-color .12s',
      }}
    >
      <span style={{ flex: 1, minWidth: 120, fontSize: 13, fontWeight: 700, color: '#13213C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
      {showEnt && e.entityName && <LpScopeChip label={e.entityName} />}
      {showStream && e.streamName && <LpScopeChip label={'مسار ' + e.streamName} />}
      <span style={{ flex: 'none', fontSize: 11, fontWeight: 700, color: '#64748B', background: '#F1F4F9', borderRadius: 999, padding: '3px 10px' }}>{e.typeLabel}</span>
      <span style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: st.c, background: st.bg, borderRadius: 999, padding: '4px 11px' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.c, flex: 'none' }} />
        {st.label}
      </span>
      <Icon d="M15 18l-6-6 6-6" size={13} color="#AEB8C7" />
    </div>
  );
}

function LpLaunchCard({ l, idx, hideMoney, showStream, showEnt }: { l: VM['batchSummary'][number]['launches'][number]; idx: number; hideMoney: boolean; showStream?: boolean; showEnt?: boolean }) {
  const [open, setOpen] = useState(false);
  const [hov, setHov] = useState(false);
  // header scope summaries: exact name when single, count when several
  const streamsLabel = l.streams.length === 1 ? 'مسار ' + l.streams[0] : l.streams.length === 2 ? 'مساران' : `${l.streams.length} مسارات`;
  const entitiesLabel = l.entities.length === 1 ? l.entities[0] : l.entities.length === 2 ? 'جهتان' : `${l.entities.length} جهات`;
  // launch-level rollup for the header status pill (scoped to visible items)
  const lstatus: 'dev' | 'launch' | 'done' = l.launched
    ? 'done'
    : l.items.length > 0 && l.items.every((it) => it.status === 'launch' || it.status === 'done')
      ? 'launch'
      : 'dev';
  const lst = LPE_STATUS[lstatus];
  return (
    <div style={{ border: '1px solid #E6EBF3', borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
      <div
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', cursor: 'pointer', background: hov ? '#FAFBFE' : 'transparent', transition: 'background .12s' }}
      >
        <Icon d={open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} size={17} color="#AEB8C7" />
        <span style={{ width: 38, height: 38, flex: 'none', borderRadius: 11, background: '#EAF0FE', color: '#2563EB', fontWeight: 900, fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{idx + 1}</span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="hd" style={{ fontSize: 15, fontWeight: 800, color: '#13213C' }}>{l.title}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#5A6B86', background: '#F1F4F9', borderRadius: 999, padding: '3px 10px' }}>
            <Icon d="M3 6h18M3 12h18M3 18h18" size={11} color="#5A6B86" />
            إجمالي المدخلات <b style={{ color: '#13213C', fontWeight: 900 }}>{l.count}</b>
          </span>
          {showEnt && l.entities.length > 0 && <LpScopeChip label={entitiesLabel} title={l.entities.join('، ')} />}
          {showStream && l.streams.length > 0 && <LpScopeChip label={streamsLabel} title={l.streams.map((n) => 'مسار ' + n).join('، ')} />}
        </div>
        {!hideMoney && (
          <div style={{ flex: 'none', textAlign: 'left' }}>
            <div style={{ fontSize: 10.5, color: '#AEB8C7', fontWeight: 400 }}>تكلفة الإطلاق التقديرية</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#13213C', marginTop: 2 }}>{l.budgetLabel}</div>
          </div>
        )}
        <span style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: lst.c, background: lst.bg, borderRadius: 999, padding: '5px 12px' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: lst.c, flex: 'none' }} />
          {lst.label}
        </span>
      </div>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '2px 15px 15px', background: '#F3F5FA', border: '1px solid #ECF0F6', borderRadius: 12, padding: 10 }}>
          {l.items.map((e) => (
            <LpEntryRow key={e.id} e={e} launched={l.launched} showStream={showStream} showEnt={showEnt} />
          ))}
        </div>
      )}
    </div>
  );
}

function LpPhaseCard({ b, hideMoney, onManage, showStream, showEnt }: { b: VM['batchSummary'][number]; hideMoney: boolean; onManage?: () => void; showStream?: boolean; showEnt?: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const launches = b.launches;
  const visible = showAll ? launches : launches.slice(0, 3);
  const launchWord = launches.length === 1 ? 'إطلاق مجدول' : 'إطلاقات مجدولة';
  return (
    <div style={{ background: '#fff', border: '1px solid #EAEEF5', borderRadius: 16, padding: 22 }}>
      {/* phase header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingBottom: 14, borderBottom: '1px solid #EEF1F7' }}>
        <span className="hd" style={{ fontSize: 17, fontWeight: 800, color: '#13213C' }}>{b.displayName}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8A97AD', fontWeight: 400 }}>
          <Icon d={STAGE_CAL} size={13} color="#8A97AD" />
          {b.period}
        </span>
        <div style={{ flex: 1 }} />
        {onManage && (
          <button
            onClick={onManage}
            style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, background: '#EAF0FE', border: '1px solid #D9E4FD', borderRadius: 999, padding: '5px 12px', fontSize: 11, color: '#2563EB', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <Icon d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" size={11} color="#2563EB" />
            إدارة الإطلاقات
          </button>
        )}
        <span style={{ flex: 'none', fontSize: 12, fontWeight: 800, color: '#5A6B86', background: '#EEF2F8', borderRadius: 999, padding: '5px 13px' }}>{launches.length} {launchWord}</span>
      </div>
      {/* section label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 12px' }}>
        <span style={{ width: 3, height: 16, borderRadius: 2, background: '#7C93F5' }} />
        <span className="hd" style={{ fontSize: 14, fontWeight: 800, color: '#13213C' }}>الإطلاقات المجدولة</span>
      </div>
      {launches.length === 0 ? (
        <div style={{ border: '1px dashed #D8DFEB', borderRadius: 12, padding: '20px 16px', textAlign: 'center', fontSize: 12.5, color: '#8A97AD', fontWeight: 400 }}>
          لا توجد إطلاقات مجدولة ضمن نطاقك في هذه المرحلة
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visible.map((l, i) => (
            <LpLaunchCard key={l.id} l={l} idx={i} hideMoney={hideMoney} showStream={showStream} showEnt={showEnt} />
          ))}
          {launches.length > 3 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              style={{ width: '100%', background: '#F5F8FD', border: '1px solid #E6EBF3', borderRadius: 11, padding: '10px 0', fontSize: 12.5, fontWeight: 800, color: '#1D4ED8', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {showAll ? 'عرض أقل' : `عرض إطلاقات إضافية (${launches.length - 3})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LaunchPlan({ vm, onManage }: { vm: VM; onManage?: (batch: string) => void }) {
  const hideMoney = vm.role === 'path' || vm.role === 'ai';
  return (
    <>
      <StagePageHeader
        title="خطة الإطلاق"
        sub="الإطلاقات المجدولة عبر المراحل الزمنية الأربع — ضمن نطاق عرضك."
        f={vm.execFilter}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {vm.batchSummary.map((b) => (
          <LpPhaseCard
            key={b.name}
            b={b}
            hideMoney={hideMoney}
            onManage={onManage ? () => onManage(b.name) : undefined}
            showStream={vm.execFilter.showStreamInfo}
            showEnt={vm.execFilter.showEntInfo}
          />
        ))}
      </div>
    </>
  );
}

// small ⓘ affordance: hover / tap reveals a plain-language explanation.
// Per request, the ⓘ is shown ONLY on the top phase-countdown timer (keep);
// everywhere else it is suppressed.
function InfoTip({ text, dark, flip, keep }: { text: string; dark?: boolean; flip?: boolean; keep?: boolean }) {
  // flip: the popup grows to the LEFT by default (RTL); near the screen's
  // left edge it must grow to the right instead or it gets clipped
  const [open, setOpen] = useState(false);
  if (!keep) return null;
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', flex: 'none', verticalAlign: 'middle' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="معلومات"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: `1px solid ${dark ? 'rgba(255,255,255,.45)' : '#C7D2E4'}`,
          background: 'transparent',
          color: dark ? 'rgba(255,255,255,.85)' : '#8A97AD',
          fontSize: 10,
          fontWeight: 800,
          lineHeight: 1,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          fontFamily: 'inherit',
        }}
      >
        i
      </button>
      {open && (
        <span
          style={{
            position: 'absolute',
            top: 22,
            ...(flip ? { left: -8 } : { right: -8 }),
            width: 240,
            background: '#0F1F3D',
            color: '#fff',
            borderRadius: 10,
            padding: '9px 12px',
            fontSize: 11.5,
            fontWeight: 400,
            lineHeight: 1.8,
            zIndex: 60,
            boxShadow: '0 16px 40px -14px rgba(2,12,35,.55)',
            textAlign: 'right',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

// Clean SVG donut: distribution of one type across the streams (blue family)
const CHART_COLORS = ['#2563EB', '#0F2C66', '#27C2F0', '#7EA6F4', '#B9CDF5'];

function PieCard({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const R = 34;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div style={{ background: '#fff', border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', borderRadius: 14, padding: '15px 17px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7A93', lineHeight: 1.5 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
        <svg viewBox="0 0 90 90" width={104} height={104} style={{ flex: 'none' }}>
          <circle cx="45" cy="45" r={R} fill="none" stroke="#EDF1F8" strokeWidth="13" />
          {total > 0 &&
            data
              .filter((d) => d.value > 0)
              .map((d, i) => {
                const frac = d.value / total;
                const seg = (
                  <circle
                    key={d.label}
                    cx="45"
                    cy="45"
                    r={R}
                    fill="none"
                    stroke={CHART_COLORS[data.indexOf(d) % CHART_COLORS.length]}
                    strokeWidth="13"
                    strokeDasharray={`${frac * C} ${C}`}
                    strokeDashoffset={-acc * C}
                    transform="rotate(-90 45 45)"
                    strokeLinecap="butt"
                  />
                );
                acc += frac;
                return seg;
              })}
          <text
            x="45"
            y="50"
            textAnchor="middle"
            style={{ fontSize: 20, fontWeight: 800, fill: '#13213C', fontFamily: 'inherit' }}
          >
            {total}
          </text>
        </svg>
        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.map((d, i) => (
            <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 3,
                  background: CHART_COLORS[i % CHART_COLORS.length],
                  flex: 'none',
                }}
              />
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: '#54627B',
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {d.label}
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#13213C', flex: 'none' }}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Ranked horizontal bars: entities ordered by number of submissions
function RankBars({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  // dozens of entities may participate — show the top five and expand on demand
  const TOP = 5;
  const [showAll, setShowAll] = useState(false);
  const max = rows.reduce((a, r) => Math.max(a, r.value), 0) || 1;
  const shown = showAll ? rows : rows.slice(0, TOP);
  return (
    <div style={{ background: '#fff', border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', borderRadius: 14, padding: '15px 17px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7A93', lineHeight: 1.5 }}>{title}</div>
        {rows.length > TOP && (
          <button
            onClick={() => setShowAll((v) => !v)}
            style={{
              border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
              background: '#fff',
              color: '#54627B',
              borderRadius: 9,
              padding: '5px 11px',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
              flex: 'none',
            }}
          >
            {showAll ? 'عرض الأعلى فقط' : 'عرض الكل (' + rows.length + ')'}
          </button>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
          marginTop: 12,
          ...(showAll ? { maxHeight: 300, overflowY: 'auto', paddingLeft: 4 } : {}),
        }}
      >
        {shown.map((r, i) => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 7,
                background: i === 0 ? '#2563EB' : '#0F2C66',
                color: '#fff',
                fontSize: 11,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
              }}
            >
              {i + 1}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#33415C',
                width: 200,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 'none',
              }}
            >
              {r.label}
            </span>
            <div style={{ flex: 1, height: 16, background: '#EDF1F8', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.round((r.value / max) * 100)}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: i === 0 ? 'linear-gradient(270deg,#2563EB,#5B8DEF)' : '#0F2C66',
                }}
              />
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#13213C', flex: 'none', minWidth: 22, textAlign: 'left' }}>
              {r.value}
            </span>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ fontSize: 11.5, color: '#9AA6BC', fontWeight: 400 }}>لا توجد بيانات بعد.</div>
        )}
      </div>
    </div>
  );
}

// One full-width line of statistics: cells separated by vertical dividers,
// small label on top and a large formatted number underneath
function StatBand({
  dark,
  items,
}: {
  dark?: boolean;
  items: {
    label: string;
    value: string;
    suffix?: string;
    chip?: string;
    info?: string;
    dist?: { label: string; value: number }[];
    mini?: { label: string; v: number }[];
    onOpen?: () => void;
  }[];
}) {
  return (
    <div
      data-r="statband"
      style={{
        display: 'flex',
        borderRadius: 16,
        ...(dark
          ? { background: BLUE_GRAD, color: '#fff' }
          : { background: '#fff', border: '1px solid #E7ECF4' }),
      }}
    >
      {items.map((it, i) => (
        <div
          key={it.label}
          onClick={it.onOpen}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '15px 20px',
            borderLeft: i < items.length - 1 ? `1px solid ${dark ? 'rgba(255,255,255,.16)' : '#EBEFF6'}` : 'none',
            cursor: it.onOpen ? 'pointer' : 'default',
          }}
        >
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: dark ? 'rgba(255,255,255,.8)' : '#6B7A93',
              lineHeight: 1.5,
              minHeight: 38,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 6,
            }}
          >
            <span style={{ minWidth: 0 }}>{it.label}</span>
            {it.info && <InfoTip text={it.info} dark={dark} />}
            {it.onOpen && (
              <span
                title="عرض البطاقات التفصيلية"
                style={{ marginRight: 'auto', display: 'inline-flex', alignItems: 'center', flex: 'none' }}
              >
                <Icon d="M15 18l-6-6 6-6" size={14} color={dark ? 'rgba(255,255,255,.7)' : '#9AA6BC'} />
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
            <span
              style={{
                fontSize: 31,
                fontWeight: 800,
                color: dark ? '#fff' : '#13213C',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
              }}
            >
              {it.value}
              {it.suffix && <span style={{ fontSize: 17, fontWeight: 800, marginRight: 2 }}>{it.suffix}</span>}
            </span>
            {it.chip && (
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: dark ? 'rgba(255,255,255,.14)' : '#F0F4FB',
                  color: dark ? '#fff' : '#54627B',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {it.chip}
              </span>
            )}
          </div>
          {/* التوزيع حسب المسار — always visible, labelled */}
          {it.dist && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTop: `1px solid ${dark ? 'rgba(255,255,255,.2)' : '#EBEFF6'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 400, color: dark ? 'rgba(255,255,255,.7)' : '#8A97AD' }}>
                التوزيع حسب المسار
              </div>
              {it.dist.map((d) => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: dark ? '#fff' : '#13213C',
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {d.label}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: dark ? '#fff' : '#13213C', flex: 'none' }}>
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          )}
          {it.mini && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTop: `1px solid ${dark ? 'rgba(255,255,255,.2)' : '#EBEFF6'}`,
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 400, color: dark ? 'rgba(255,255,255,.7)' : '#8A97AD', marginBottom: 7 }}>
                التوزيع حسب الحالة
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2,1fr)',
                  gap: 6,
                }}
              >
              {it.mini.map((m) => (
                <div
                  key={m.label}
                  style={{
                    background: dark ? 'rgba(255,255,255,.08)' : '#F7F9FD',
                    border: `1px solid ${dark ? 'rgba(255,255,255,.14)' : '#EBEFF6'}`,
                    borderRadius: 10,
                    padding: '7px 10px',
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#fff' : '#13213C', lineHeight: 1.5 }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: dark ? '#fff' : '#13213C', marginTop: 1 }}>{m.v}</div>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// «تنزيل التقرير» dropdown next to the view switcher: Excel / PowerPoint
function ExportMenu({ onExcel, onPpt, label }: { onExcel: () => void; onPpt: () => void; label: string }) {
  const [open, setOpen] = useState(false);
  const items = [
    {
      label: 'Excel',
      iconD: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6M9 13l6 5M15 13l-6 5',
      iconBg: '#E3F6EC',
      iconColor: '#0B8A4B',
      onClick: onExcel,
    },
    {
      label: 'PowerPoint',
      iconD: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6M9 13h4a2 2 0 0 1 0 4H9v-4zm0 0v5',
      iconBg: '#FCEEE6',
      iconColor: '#C2410C',
      onClick: onPpt,
    },
  ];
  return (
    <div style={{ position: 'relative', flex: 'none' }}>
      <HoverButton
        onClick={() => setOpen((o) => !o)}
        base={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          height: 34,
          padding: '0 13px',
          border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
          background: '#fff',
          borderRadius: 10,
          color: '#42506B',
          fontWeight: 800,
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
        hover={{ borderColor: '#C7D6EE' }}
      >
        <Icon d="M12 3v12M7 10l5 5 5-5M5 21h14" size={15} />
        {label}
        <Icon d={open ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} size={13} color="#8A97AD" />
      </HoverButton>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute',
              top: 40,
              left: 0,
              minWidth: 170,
              background: '#fff',
              border: '1px solid #E7ECF4',
              borderRadius: 12,
              boxShadow: '0 20px 50px -18px rgba(2,12,35,.4)',
              zIndex: 31,
              overflow: 'hidden',
            }}
          >
            {items.map((it) => (
              <HoverDiv
                key={it.label}
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
                base={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 13px',
                  cursor: 'pointer',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: '#42506B',
                }}
                hover={{ background: '#F7F9FD' }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    background: it.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none',
                  }}
                >
                  <Icon d={it.iconD} size={14} color={it.iconColor} />
                </span>
                {it.label}
              </HoverDiv>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Dashboard({ vm }: { vm: VM }) {
  const s = vm.store;
  // which launch row (in the launch manager popup) is expanded to show its items
  const [openLaunch, setOpenLaunch] = useState<string | null>(null);
  // مرحلة manage popups: assign items / manage launches for a given batch
  const [itemsMgrFor, setItemsMgrFor] = useState<string | null>(null);
  const [launchMgrFor, setLaunchMgrFor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  // mobile: the filter bar collapses into one button that opens a full-screen sheet
  const [mobileFilters, setMobileFilters] = useState(false);
  // mobile navigation: the rail collapses into a hamburger drawer, and the
  // stream/type sub-items sit in a dropdown under «الكل».
  const [mobileNav, setMobileNav] = useState(false);
  const [allOpen, setAllOpen] = useState(false);

  return (
    <div
      data-r="root"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#F7F9FD,#EEF2F9)',
        direction: 'rtl',
        // prevent an absolutely-positioned tooltip / wide analytics row from
        // introducing a horizontal scroll that clips content in RTL
        overflowX: 'hidden',
        // the fixed navigation rail owns the right edge of the screen
        paddingRight: 248,
      }}
    >
      {/* ===================== HEADER ===================== */}
      <div
        data-r="hdr"
        style={{
          background: '#fff',
          borderBottom: '1px solid #E7ECF4',
          padding: '11px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Hamburger — mobile only (shown via globals.css ≤900px); toggles the
              navigation drawer. */}
          <button
            data-r="hamburger"
            onClick={() => setMobileNav((o) => !o)}
            aria-label="القائمة"
            style={{
              display: 'none',
              width: 42,
              height: 42,
              flex: 'none',
              borderRadius: 11,
              border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
              background: '#fff',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Icon d={mobileNav ? 'M18 6 6 18M6 6l12 12' : 'M3 6h18M3 12h18M3 18h18'} size={19} color="#33405A" strokeWidth={2.2} />
          </button>
          {/* Role switcher: demo builds only (production role comes from the
              UAE PASS / IdP mapping wired by IT). */}
          {vm.showRoleSwitcher && (
            <div
              data-r="hdrpills"
              style={{
                display: 'flex',
                background: '#F4F7FC',
                border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
                borderRadius: 12,
                padding: 3,
                gap: 2,
              }}
            >
              {vm.rolePills.map((p) => (
                <button
                  key={p.key}
                  onClick={p.onClick}
                  style={{
                    borderRadius: 9,
                    padding: '8px 13px',
                    fontWeight: 700,
                    fontSize: 11.5,
                    cursor: 'pointer',
                    ...(p.active
                      ? { background: '#fff', color: '#1D4ED8', boxShadow: '0 1px 4px rgba(15,31,61,.10)', border: '1px solid #D8E3F5' }
                      : { background: 'transparent', color: '#54627B', border: '1px solid transparent' }),
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Phase countdown (moved out of the banner) */}
          {vm.showProgramBanner && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                height: 44,
                padding: '0 13px',
                borderRadius: 12,
                border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
                background: '#fff',
                color: '#54627B',
                fontSize: 12,
              }}
            >
              <span style={{ fontWeight: 400, color: '#6B7A93', whiteSpace: 'nowrap' }}>{vm.banner.countdownLabel}</span>
              {[
                { v: String(vm.banner.cd.days), l: 'يوم' },
                { v: vm.banner.cd.hh, l: 'ساعة' },
                { v: vm.banner.cd.mm, l: 'دقيقة' },
                { v: vm.banner.cd.ss, l: 'ثانية' },
              ].map((seg, si) => (
                <span key={seg.l} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  {si > 0 && <span style={{ width: 1, height: 20, background: '#EBEFF6' }} />}
                  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
                    <span dir="ltr" style={{ fontWeight: 800, color: '#13213C', fontSize: 13 }}>{seg.v}</span>
                    <span style={{ fontSize: 9, color: '#9AA6BC', fontWeight: 400 }}>{seg.l}</span>
                  </span>
                </span>
              ))}
              <InfoTip keep flip text={vm.banner.countdownCaption + ' — يُرجى استكمال حصر وإدخال جميع المشاريع والمبادرات والعمليات والخدمات قبل انتهائه (' + vm.banner.curPhaseDeadlineFmt + ').'} />
            </div>
          )}

          {/* Notifications */}
          <div data-tour="notifs" style={{ position: 'relative' }}>
            <button
              onClick={s.toggleNotifs}
              style={{
                position: 'relative',
                width: 38,
                height: 38,
                borderRadius: 11,
                border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
                background: '#fff',
                color: '#54627B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
              {vm.hasUnread && (
                <span
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    minWidth: 18,
                    height: 18,
                    padding: '0 4px',
                    borderRadius: 9,
                    background: '#E5484D',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #fff',
                  }}
                >
                  {vm.unreadLabel}
                </span>
              )}
            </button>

            {vm.notifOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 46,
                  left: 0,
                  width: 360,
                  background: '#fff',
                  border: '1px solid #E7ECF4',
                  borderRadius: 16,
                  boxShadow: '0 24px 60px -20px rgba(2,12,35,.45)',
                  zIndex: 40,
                  overflow: 'hidden',
                  animation: 'fadeUp .2s ease both',
                }}
              >
                <div
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #F0F3F8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: '#13213C' }}>الإشعارات</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9AA6BC' }}>
                    {vm.unreadLabel} غير مقروء
                  </span>
                </div>
                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {vm.notifs.map((n) => (
                    <HoverDiv
                      key={n.id}
                      onClick={n.onOpen}
                      base={{
                        display: 'flex',
                        gap: 11,
                        padding: '13px 16px',
                        borderBottom: '1px solid #F4F6FA',
                        cursor: 'pointer',
                      }}
                      hover={{ background: '#F7F9FD' }}
                    >
                      <span
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          flex: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: n.iconBg,
                        }}
                      >
                        <Icon d={n.icon} size={17} color={n.iconColor} />
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 800, color: '#13213C', lineHeight: 1.45 }}>
                          {n.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: '#9AA6BC',
                            fontWeight: 400,
                            marginTop: 2,
                            lineHeight: 1.5,
                          }}
                        >
                          {n.sub}
                        </div>
                        {n.act && (
                          <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
                            <button
                              onClick={(e) => {
                                stop(e);
                                n.onApprove();
                              }}
                              style={{
                                background: 'linear-gradient(180deg,#2E74EE,#1F5FE0)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 8,
                                padding: '6px 13px',
                                fontWeight: 800,
                                fontSize: 11,
                                cursor: 'pointer',
                              }}
                            >
                              اعتماد
                            </button>
                            <button
                              onClick={(e) => {
                                stop(e);
                                n.onReject();
                              }}
                              style={{
                                background: '#fff',
                                border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
                                color: '#C0303B',
                                borderRadius: 8,
                                padding: '6px 11px',
                                fontWeight: 800,
                                fontSize: 11,
                                cursor: 'pointer',
                              }}
                            >
                              رفض
                            </button>
                            <button
                              onClick={(e) => {
                                stop(e);
                                n.onReqInfo();
                              }}
                              style={{
                                background: '#fff',
                                border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
                                color: '#54627B',
                                borderRadius: 8,
                                padding: '6px 11px',
                                fontWeight: 800,
                                fontSize: 11,
                                cursor: 'pointer',
                              }}
                            >
                              طلب معلومات
                            </button>
                          </div>
                        )}
                      </div>
                      {n.unread && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#2563EB',
                            flex: 'none',
                            marginTop: 5,
                          }}
                        />
                      )}
                    </HoverDiv>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* admin viewing the dashboards: back to the admin console */}
          {vm.adminReturn && (
            <button
              onClick={() => s.setAdminDash(false)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 40, background: '#fff', border: '1px solid #E7ECF4', borderRadius: 11, padding: '0 14px', fontSize: 12.5, fontWeight: 800, color: '#1D4ED8', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" size={14} color="#1D4ED8" />
              لوحة الإدارة
            </button>
          )}

          {/* multi-stream coordinator: active-stream switcher */}
          {vm.streamSwitcher.show && (
            <FilterSelect value={vm.streamSwitcher.value} options={vm.streamSwitcher.options} minWidth={190} onChange={(v) => s.setMyPath(v)} />
          )}

          {/* Avatar / profile */}
          <div data-tour="profile" style={{ position: 'relative' }}>
            <div
              onClick={s.toggleProfile}
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: 'linear-gradient(135deg,#2E74EE,#27C2F0)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" size={18} color="#fff" strokeWidth={2.2} />
            </div>
            {vm.profileOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 46,
                  left: 0,
                  width: 230,
                  background: '#fff',
                  border: '1px solid #E7ECF4',
                  borderRadius: 14,
                  boxShadow: '0 24px 60px -20px rgba(2,12,35,.45)',
                  zIndex: 40,
                  overflow: 'hidden',
                  animation: 'fadeUp .2s ease both',
                }}
              >
                <div
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #F0F3F8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                  }}
                >
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      background: 'linear-gradient(135deg,#2E74EE,#27C2F0)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 12.5,
                      flex: 'none',
                    }}
                  >
                    <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" size={18} color="#fff" strokeWidth={2.2} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#13213C' }}>{vm.profileName}</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#9AA6BC',
                        fontWeight: 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {vm.profilePos}
                    </div>
                  </div>
                </div>
                <HoverDiv
                  onClick={s.openTeam}
                  base={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 16px',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#42506B',
                  }}
                  hover={{ background: '#F7F9FD' }}
                >
                  <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" size={16} />{' '}
                  فريق العمل
                </HoverDiv>
                <HoverDiv
                  onClick={s.logout}
                  base={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 16px',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#D23B45',
                    borderTop: '1px solid #F0F3F8',
                  }}
                  hover={{ background: '#FCEEEF' }}
                >
                  <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={16} /> تسجيل الخروج
                </HoverDiv>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* ===================== WORK AREA ===================== */}
      <div
        data-r="work"
        style={{ display: 'flex', gap: 16, padding: '16px 24px 44px', alignItems: 'flex-start' }}
      >
        {/* Sidebar navigation — full-height panel on the right edge (desktop);
            on mobile it collapses behind the hamburger (mnav-closed hides it). */}
        <aside
          data-r="rail"
          className={mobileNav ? '' : 'mnav-closed'}
          style={{
            width: 248,
            position: 'fixed',
            top: 0,
            bottom: 0,
            right: 0,
            zIndex: 30,
            background: '#fff',
            borderLeft: '1px solid #E7ECF4',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* brand: both logos side by side */}
          <div
            data-r="brand"
            style={{
              padding: '14px 14px 12px',
              borderBottom: '1px solid #F0F3F8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              position: 'relative',
            }}
          >
            {/* close button — only visible inside the mobile full-screen drawer */}
            <button
              data-r="railclose"
              onClick={() => setMobileNav(false)}
              aria-label="إغلاق القائمة"
              style={{
                display: 'none',
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 38,
                height: 38,
                borderRadius: 11,
                border: '1px solid #E7ECF4',
                background: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Icon d="M18 6 6 18M6 6l12 12" size={18} color="#33405A" strokeWidth={2.2} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="assets/uae-crest.png" alt="UAE" style={{ height: 46, flex: 'none' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="assets/logo.png" alt="logo" style={{ height: 46, minWidth: 0, objectFit: 'contain' }} />
          </div>
          {/* navigation */}
          <div data-r="navlist" style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {vm.navItems.map((n) => (
            <button
              key={n.key}
              className={n.sub ? 'mnav-sub' + (allOpen ? '' : ' mnav-collapsed') : ''}
              onClick={() => {
                if (n.key === 'all') {
                  // «الكل»: navigate and toggle the stream/type dropdown; keep the
                  // mobile drawer open so the sub-items can be reached
                  n.onClick();
                  setAllOpen((o) => !o);
                } else {
                  n.onClick();
                  setMobileNav(false);
                }
              }}
              data-tour={n.key === 'all' ? 'nav-all' : n.key === 'projects' ? 'nav-projects' : n.key === 'operations' ? 'nav-operations' : n.key === 'services' ? 'nav-services' : n.key === 'launchplans' ? 'nav-exec' : n.key === 'lplan' ? 'nav-launch' : n.key === 'team' ? 'nav-team' : n.key === 'entities' ? 'nav-entities' : undefined}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: n.sub ? '9px 13px' : '11px 13px',
                marginRight: n.sub ? 22 : 0,
                borderRadius: 11,
                border: 'none',
                borderRight: n.sub ? '2px solid #EBEFF6' : 'none',
                borderTopRightRadius: n.sub ? 0 : 11,
                borderBottomRightRadius: n.sub ? 0 : 11,
                background: n.active ? '#EAF1FE' : 'transparent',
                color: n.active ? '#1D4ED8' : '#42506B',
                fontWeight: n.active ? 800 : 400,
                fontSize: n.sub ? 12.5 : 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'right',
              }}
            >
              {n.active && (
                <span
                  style={{
                    position: 'absolute',
                    right: -12,
                    top: 9,
                    bottom: 9,
                    width: 3.5,
                    borderRadius: 999,
                    background: '#2563EB',
                  }}
                />
              )}
              <Icon d={n.icon} size={n.sub ? 14 : 16} color={n.active ? '#2563EB' : '#8A97AD'} />
              {n.label}
              {typeof n.count === 'number' && (
                <span
                  data-r="navcount"
                  style={{
                    marginInlineStart: 'auto',
                    minWidth: 22,
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 800,
                    color: n.active ? '#1D4ED8' : '#8A97AD',
                    background: n.active ? '#DCE8FE' : '#F1F4F9',
                    borderRadius: 999,
                    padding: '1px 7px',
                  }}
                >
                  {n.count}
                </span>
              )}
              {n.key === 'all' && (
                <span
                  data-r="navchev"
                  style={{
                    display: 'none',
                    marginInlineStart: 6,
                    transition: 'transform .2s',
                    transform: allOpen ? 'rotate(180deg)' : 'none',
                  }}
                >
                  <Icon d="M6 9l6 6 6-6" size={14} color="#8A97AD" strokeWidth={2.4} />
                </span>
              )}
            </button>
          ))}
          </div>
          {/* basket entry (moved from the top bar into the side menu) */}
          {vm.showBasket && (
            <div data-tour="basket" style={{ padding: '4px 12px 0' }}>
              <button
                onClick={s.openBasket}
                style={{
                  position: 'relative',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 13px',
                  borderRadius: 11,
                  border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
                  background: '#fff',
                  color: '#42506B',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'right',
                }}
              >
                <Icon d="M5 8h14l-1.2 10.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z M9 8V6a3 3 0 0 1 6 0v2" size={16} color="#2563EB" />
                {vm.role === 'ai' ? 'قائمة الاعتماد والتمويل' : 'سلة التمويل'}
                {vm.hasBasketBadge && (
                  <span
                    style={{
                      marginInlineStart: 'auto',
                      minWidth: 20,
                      height: 20,
                      padding: '0 5px',
                      borderRadius: 10,
                      background: '#E5484D',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {vm.basketBadge}
                  </span>
                )}
              </button>
            </div>
          )}
          {/* bottom: onboarding guide */}
          <div data-r="railhelp" data-tour="guide" style={{ padding: 12 }}>
            <div style={{ background: '#EAF1FE', border: '1px solid #DCE7FA', borderRadius: 16, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div className="hd" style={{ fontSize: 14, fontWeight: 800, color: '#13213C' }}>{vm.role === 'ai' ? 'دليل اللجنة الوطنية' : vm.role === 'entity' ? 'دليل ممثل الجهة' : vm.role === 'coord' ? 'دليل منسق المسار في الجهة' : 'دليل الاستخدام'}</div>
                <span
                  style={{
                    flex: 'none',
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    background: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px -5px rgba(29,78,216,.4)',
                  }}
                >
                  <Icon d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" size={18} color="#2563EB" />
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#6B7A93', fontWeight: 400, lineHeight: 1.7, marginTop: 8, textAlign: 'right' }}>
                {vm.role === 'ai' ? 'إرشادات مراجعة الترشيحات واعتماد المدخلات للتمويل.' : vm.role === 'entity' ? (vm.navSection === 'lplan' ? 'إرشادات مراجعة مدخلات الجهة ومتابعة خطة الإطلاق.' : vm.navSection === 'launchplans' ? 'إرشادات مراجعة مدخلات الجهة ومتابعة مراحل التقدم.' : vm.navStream ? 'إرشادات مراجعة مدخلات المسار وتحديث حالة الاعتماد.' : 'إرشادات مراجعة مدخلات الجهة وتحديث حالة الاعتماد.') : vm.role === 'coord' ? 'إرشادات متابعة مدخلات المسار وتحديث مراحل التقدم داخل الجهة.' : 'تعرّف على آلية تسجيل المدخلات ومتابعتها عبر مراحل المشروع.'}
              </div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent(TOUR_EVENT))}
                style={{
                  marginTop: 12,
                  width: '100%',
                  background: BLUE_GRAD,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '11px 0',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {vm.role === 'ai' ? 'عرض الدليل' : 'فتح الدليل'}
              </button>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {vm.navSection === 'overview' && (
          <>
      {/* ===================== BANNER + STEPPER (entity/coord only) ===================== */}
      {vm.showProgramBanner && (
      <div style={{ margin: '2px 0 -4px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div className="hd" style={{ fontSize: 22, fontWeight: 800, color: '#13213C' }}>
            {vm.banner.pageTitle}
          </div>
          <div style={{ fontSize: 12.5, color: '#6B7A93', fontWeight: 400, marginTop: 6, maxWidth: 620, lineHeight: 1.7 }}>
            {vm.banner.subtitle}
          </div>
        </div>
        {vm.showAddBtn && (
          <button
            onClick={s.openCreate}
            data-tour="add"
            style={{
              flex: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 42,
              padding: '0 18px',
              background: 'linear-gradient(180deg,#2E74EE,#1F5FE0)',
              color: '#fff',
              border: 'none',
              borderRadius: 11,
              fontWeight: 800,
              fontSize: 13.5,
              cursor: 'pointer',
              boxShadow: '0 2px 6px -2px rgba(37,99,235,.35)',
              fontFamily: 'inherit',
            }}
          >
            <Icon d="M12 5v14M5 12h14" size={17} strokeWidth={2.2} /> إضافة مدخل جديد
          </button>
        )}
      </div>
      )}

          {/* Entity overview — redesigned first section (cost + inputs donuts)
              and second section (per-stream cards) */}
          {(vm.role === 'entity' || vm.role === 'coord' || vm.role === 'path') && <EntityOverview vm={vm} />}

          {/* KPI bands (coord / path): counts band only */}
          {vm.notAiRole && vm.role !== 'entity' && vm.role !== 'coord' && vm.role !== 'path' && (
            <div data-tour="kpis" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SectionLabel>الأعداد الإجمالية</SectionLabel>
              <div data-r="kpirow">
                <StatBand
                  items={[
                    {
                      label: 'إجمالي المدخلات',
                      value: String(vm.kpis.total),
                      info: 'إجمالي ' + vm.typesPhrase + ' المسجّلة ضمن نطاق اطلاعك. اضغطوا على البطاقة لاستعراض البطاقات التفصيلية.',
                      dist: vm.showStreamDist ? vm.kpiDist.total : undefined,
                      mini: vm.kpiBreak.total,
                      onOpen: () => s.setNavSection('all'),
                    },
                    {
                      label: 'المشاريع / المبادرات',
                      value: String(vm.kpis.projInit),
                      info: 'عدد المشاريع والمبادرات المسجّلة ضمن نطاق اطلاعك في مسارات التحول. اضغطوا على البطاقة لاستعراض البطاقات التفصيلية.',
                      dist: vm.showStreamDist ? vm.kpiDist.projInit : undefined,
                      mini: vm.kpiBreak.projInit,
                      onOpen: () => s.setNavSection('projects'),
                    },
                    ...(vm.showOpsKpi
                      ? [
                          {
                            label: 'العمليات',
                            value: String(vm.kpis.operations),
                            info: 'عدد العمليات التخصصية وعمليات الدعم المؤسسي المسجّلة للتحول. اضغطوا على البطاقة لاستعراض البطاقات التفصيلية.',
                            dist: vm.showStreamDist ? vm.kpiDist.operations : undefined,
                            mini: vm.kpiBreak.operations,
                            onOpen: () => s.setNavSection('operations'),
                          },
                        ]
                      : []),
                    ...(vm.showSvcKpi
                      ? [
                          {
                            label: 'الخدمات',
                            value: String(vm.kpis.services),
                            info: 'عدد الخدمات المسجّلة للتحول في مسار الخدمات. اضغطوا على البطاقة لاستعراض البطاقات التفصيلية.',
                            dist: vm.showStreamDist ? vm.kpiDist.services : undefined,
                            mini: vm.kpiBreak.services,
                            onOpen: () => s.setNavSection('services'),
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            </div>
          )}

          {/* Committee analytics (ai) — national overview */}
          {vm.isAiRole && (
            <>
              {/* page heading */}
              <div data-tour="ai-heading" style={{ margin: '2px 0 -4px' }}>
                <div className="hd" style={{ fontSize: 22, fontWeight: 800, color: '#13213C' }}>لوحة اللجنة الوطنية</div>
                <div style={{ fontSize: 12, color: '#9AA6BC', fontWeight: 400, marginTop: 4 }}>متابعة حالة المدخلات المرشحة والجهات المشاركة حسب المسارات.</div>
              </div>

              {/* Section 1: ملخص المدخلات والترشيحات */}
              <div>
                <div className="hd" style={{ fontSize: 16, fontWeight: 800, color: '#13213C' }}>ملخص المدخلات والترشيحات</div>
                <div style={{ fontSize: 12, color: '#9AA6BC', fontWeight: 400, marginTop: 3 }}>نظرة سريعة على حالة المدخلات ومشاركة الجهات.</div>
              </div>
              <div data-r="kpi" data-tour="kpis" style={{ background: '#fff', border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', borderRadius: 18, padding: 14, marginTop: -8, display: 'flex', alignItems: 'stretch', gap: 12, flexWrap: 'wrap' }}>
                <CmtStat value={vm.aiStats.entCount} label="الجهات المشاركة" sub={vm.aiStats.entCount > 2 ? 'جهات مشاركة' : 'جهة مشاركة'} iconD="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" info="عدد الجهات الاتحادية التي قدّمت مدخلات ضمن المشروع." />
                <div style={{ width: 1, background: '#EEF1F6', alignSelf: 'stretch', margin: '2px 0' }} />
                <CmtStat value={vm.aiStats.total} label="إجمالي المدخلات" sub={vm.aiStats.total > 2 ? 'مدخلات مسجلة' : 'مُدخل مسجّل'} iconD="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" info="كل ما قدّمته الجهات عبر مسارات المشروع ووصل إلى اللجنة الوطنية." />
                <div data-tour="nom-status" style={{ flex: '2 1 300px', minWidth: 280, background: '#F5F7FB', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span className="hd" style={{ fontSize: 13.5, fontWeight: 800, color: '#13213C' }}>حالة المدخلات المرشحة</span>
                    <span style={{ fontSize: 12, color: '#9AA6BC', fontWeight: 400 }}>من أصل {vm.aiStats.total} مدخلات</span>
                  </div>
                  <div className="rgrid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    <CmtMini value={vm.aiStats.nominatedHeads} label="مرشحة من رؤساء المسارات" info="ما رشّحه رؤساء المسارات وينتظر قرار اللجنة." />
                    <CmtMini value={vm.aiStats.nominatedCommittee} label="مرشحة للجنة الوطنية" info="ما رشّحته اللجنة الوطنية مباشرة وينتظر الاعتماد." />
                    <CmtMini value={vm.aiStats.funded} label="معتمدة للتمويل" green info="ما اعتمدته اللجنة الوطنية للتمويل." />
                  </div>
                </div>
              </div>

              {/* Section 2: المدخلات حسب المسار */}
              <div>
                <div className="hd" style={{ fontSize: 16, fontWeight: 800, color: '#13213C' }}>توزيع المدخلات حسب المسار</div>
                <div style={{ fontSize: 12, color: '#9AA6BC', fontWeight: 400, marginTop: 3 }}>توزيع المدخلات حسب المسار ونوع المدخل.</div>
              </div>
              <div data-r="seccards" data-tour="ai-streams" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14, marginTop: -8 }}>
                {vm.committeeStreamCards.map((st) => (
                  <div key={st.id} data-tour="ai-stream-card" style={{ background: '#fff', border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', borderRadius: 18, padding: '18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, minHeight: 44 }}>
                      <div className="hd" style={{ flex: 1, fontSize: 14.5, fontWeight: 800, color: '#13213C', lineHeight: 1.5 }}>{st.name}</div>
                      <span style={{ width: 38, height: 38, borderRadius: 11, background: '#EAF1FE', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                        <Icon d={st.icon} size={18} color="#2563EB" />
                      </span>
                    </div>
                    <div style={{ height: 1, background: '#EEF1F6' }} />
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 11.5, color: '#9AA6BC', fontWeight: 400 }}>عدد الجهات المشاركة</span>
                      <span style={{ fontSize: 30, fontWeight: 800, color: '#13213C', lineHeight: 1 }}>{st.entCount}</span>
                    </div>
                    <div style={{ background: '#F7F9FD', border: '1px solid #EEF1F6', borderRadius: 12, padding: '12px 13px' }}>
                      <div style={{ fontSize: 10.5, color: '#9AA6BC', fontWeight: 400, marginBottom: 9, textAlign: 'right' }}>توزيع المدخلات حسب النوع</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ fontSize: 12, color: '#13213C', fontWeight: 800 }}>الإجمالي</span>
                          <span style={{ fontSize: 12.5, fontWeight: 800, color: '#13213C' }}>{st.total}</span>
                        </div>
                        {(() => {
                          const order = ['مشروع / مبادرة', 'خدمة', 'عملية'];
                          return [...st.byType]
                            .sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label))
                            .map((tp) => (
                              <div key={tp.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                <span style={{ fontSize: 12, color: '#54627B', fontWeight: 400 }}>{tp.label}</span>
                                <span style={{ fontSize: 12.5, fontWeight: 800, color: '#13213C' }}>{tp.n}</span>
                              </div>
                            ));
                        })()}
                      </div>
                    </div>
                    <button
                      onClick={st.onOpen}
                      data-tour="ai-stream-details"
                      style={{ marginTop: 'auto', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#EAF1FE', color: '#1D4ED8', border: 'none', borderRadius: 11, padding: '10px 0', fontWeight: 800, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      عرض التفاصيل
                      <Icon d="M15 18l-6-6 6-6" size={12} color="#1D4ED8" />
                    </button>
                  </div>
                ))}
              </div>


            </>
          )}


          </>
          )}

          {/* ===== PORTFOLIO PAGES: stream summary cards + recap + list ===== */}
          {vm.sectionTitle && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div className="hd" style={{ fontSize: 20, fontWeight: 800, color: '#13213C' }}>{vm.sectionTitle}</div>
                  {vm.batchChip && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        background: '#EEF3FC',
                        border: '1px solid #D8E3F5',
                        borderRadius: 999,
                        padding: '5px 7px 5px 12px',
                        fontSize: 12,
                        color: '#16408F',
                        fontWeight: 400,
                      }}
                    >
                      ضمن {vm.batchChip.label}
                      <button
                        onClick={vm.batchChip.onClear}
                        aria-label="إزالة تصفية المرحلة"
                        style={{
                          background: '#fff',
                          border: '1px solid #D8E3F5',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        <Icon d="M18 6L6 18M6 6l12 12" size={10} color="#16408F" />
                      </button>
                    </span>
                  )}
                </div>
              </div>

              {vm.role === 'coord' && (
                <div style={{ fontSize: 12, color: '#9AA6BC', fontWeight: 400, marginTop: -8 }}>متابعة مدخلات المسار حسب حالة التطوير والاعتماد.</div>
              )}

              {/* recap strip for the current selection — hidden on the "الكل" view */}
              {!(vm.activePathAll && vm.filterValue === 'all') && (
                <>
                  <SectionLabel>ملخص حالة المدخلات</SectionLabel>
                  <StatBand
                    items={[
                      { label: 'إجمالي المدخلات', value: String(vm.recap.total), info: 'إجمالي المدخلات المسجّلة ضمن هذا الاختيار.' },
                      { label: 'غير قابلة للتحويل', value: String(vm.recap.notCapable), info: 'بنود لا تنطبق عليها خطة إطلاق أو حالة تطوير.' },
                      { label: 'قيد التطوير', value: String(vm.recap.underDev), info: 'معتمدة ويجري تطويرها حالياً.' },
                      { label: 'تم التطوير', value: String(vm.recap.developed), info: 'اكتمل تطويرها وهي جاهزة للإطلاق.' },
                      { label: 'تم الإطلاق', value: String(vm.recap.launched), info: 'أُطلقت رسمياً.' },
                    ]}
                  />
                </>
              )}

              {/* filters + search (the list-title/count row is dropped for all roles) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* mobile: single trigger that opens the full-screen filter sheet */}
                <button
                  data-r="filterbtn"
                  onClick={() => setMobileFilters(true)}
                  style={{
                    display: 'none',
                    alignItems: 'center',
                    gap: 8,
                    height: 40,
                    background: '#fff',
                    border: '1px solid #E7ECF4',
                    boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
                    borderRadius: 11,
                    padding: '0 14px',
                    fontSize: 13,
                    fontWeight: 800,
                    color: '#42506B',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <Icon d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" size={14} color="#2563EB" />
                  الفلاتر والبحث
                  {vm.anyFilterActive && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB', flex: 'none' }} />}
                </button>
                <div
                  data-r="filters"
                  className={mobileFilters ? 'mfilters-open' : ''}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: '1 1 auto', minWidth: 0 }}
                >
                <div data-r="mfhead" style={{ display: 'none', alignItems: 'center', gap: 10 }}>
                  <span className="hd" style={{ fontSize: 17, fontWeight: 800, color: '#13213C', flex: 1 }}>الفلاتر والبحث</span>
                  <button
                    onClick={() => setMobileFilters(false)}
                    style={{ width: 38, height: 38, borderRadius: 11, border: '1px solid #E7ECF4', background: '#fff', color: '#54627B', cursor: 'pointer', fontSize: 17, fontFamily: 'inherit' }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    value={vm.searchValue}
                    onChange={(e) => s.setSearch(e.target.value)}
                    placeholder="البحث باسم المدخل…"
                    style={{
                      height: 40,
                      width: 220,
                      border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
                      backgroundColor: '#fff',
                      borderRadius: 11,
                      padding: '0 36px 0 13px',
                      fontSize: 12.5,
                      fontWeight: 400,
                      color: '#13213C',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                  <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}>
                    <Icon d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3" size={15} color="#9AA6BC" />
                  </span>
                </div>
                {/* heads/coordinators are locked to their own stream — no streams filter */}
                {vm.role !== 'path' && vm.role !== 'coord' && (
                  <FilterSelect
                    value={vm.pathFilterValue}
                    options={vm.pathOptions}
                    minWidth={170}
                    onChange={(v) => { if (vm.role === 'entity' || vm.role === 'ai') s.setNavStream(v === 'all' ? null : v); else s.setActivePath(v); }}
                  />
                )}
                {vm.showEntFilter && (
                  <EntityFilter value={vm.entFilterValue} options={vm.entOptions} onChange={(v) => s.setEntFilter(v)} />
                )}
                <FilterSelect value={vm.filterValue} options={vm.typeOptions} onChange={(v) => s.setFilter(v)} />
                <FilterSelect value={vm.statusFilterValue} options={vm.statusOptions} onChange={(v) => s.setStatusFilter(v)} />
                <FilterSelect value={vm.batchFilterValue} options={vm.batchFilterOptions} minWidth={170} onChange={(v) => s.setBatchFilter(v === 'all' ? null : v)} />
                {vm.showFundFilter && (
                  <FilterSelect value={vm.fundFilterValue} options={vm.fundOptions} minWidth={200} onChange={(v) => s.setFundFilter(v)} />
                )}
                <button
                  data-r="mfapply"
                  onClick={() => setMobileFilters(false)}
                  style={{
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: 'linear-gradient(180deg,#2E74EE,#1F5FE0)',
                    color: '#fff',
                    border: 'none',
                    boxShadow: '0 8px 18px -8px rgba(37,99,235,.7)',
                    borderRadius: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  تطبيق الفلاتر
                </button>
                </div>
                <div style={{ flex: 1 }} />
                {/* cards / table view switcher */}
                <div
                  style={{
                    display: 'flex',
                    background: '#F4F7FC',
                    border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
                    borderRadius: 11,
                    padding: 3,
                    gap: 2,
                  }}
                >
                  {(
                    [
                      { k: 'cards' as const, icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z', title: 'عرض البطاقات' },
                      { k: 'list' as const, icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', title: 'عرض الجدول' },
                    ]
                  ).map((v) => (
                    <button
                      key={v.k}
                      title={v.title}
                      onClick={() => setViewMode(v.k)}
                      style={{
                        width: 34,
                        height: 32,
                        border: viewMode === v.k ? '1px solid #D8E3F5' : '1px solid transparent',
                        borderRadius: 8,
                        background: viewMode === v.k ? '#fff' : 'transparent',
                        boxShadow: viewMode === v.k ? '0 1px 4px rgba(15,31,61,.10)' : 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon d={v.icon} size={15} color={viewMode === v.k ? '#1D4ED8' : '#8A97AD'} />
                    </button>
                  ))}
                </div>
                <ExportMenu onExcel={s.exportExcel} onPpt={s.exportPpt} label={vm.role === 'ai' ? (vm.navStream ? 'تحميل تقرير اعتماد المسار' : 'تحميل تقرير الاعتماد') : vm.navStream ? 'تحميل تقرير المسار' : 'تحميل التقرير'} />
                {vm.showAddBtn && (
                  <button
                    onClick={s.openCreate}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      height: 40,
                      padding: '0 18px',
                      background: 'linear-gradient(180deg,#2E74EE,#1F5FE0)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 11,
                      fontWeight: 800,
                      fontSize: 13.5,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px -2px rgba(37,99,235,.35)',
                      fontFamily: 'inherit',
                    }}
                  >
                    <Icon d="M12 5v14M5 12h14" size={17} strokeWidth={2.2} /> إضافة مدخل جديد
                  </button>
                )}
              </div>

              {/* cards / table */}
              {vm.sectionCards.length === 0 ? (
                <div
                  style={{
                    border: '1.5px dashed #D5DEEC',
                    background: '#FAFCFF',
                    borderRadius: 16,
                    padding: '38px 20px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#33415C' }}>لا توجد نتائج للعرض</div>
                  <div style={{ fontSize: 12, color: '#9AA6BC', fontWeight: 400, marginTop: 6, lineHeight: 1.7 }}>
                    {vm.emptyDesc}
                  </div>
                </div>
              ) : viewMode === 'list' ? (
                <ListView cards={vm.sectionCards} />
              ) : (
                <div data-r="cards" data-tour="cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
                  {vm.sectionCards.map((c) => (
                    <CardItem key={c.id} c={c} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ===== ENTITIES (committee) ===== */}
          {vm.navSection === 'entities' && (
            <>
              <div>
                <div className="hd" style={{ fontSize: 20, fontWeight: 800, color: '#13213C' }}>الجهات المشاركة</div>
                <div style={{ fontSize: 12, color: '#9AA6BC', fontWeight: 400, marginTop: 3 }}>
                  توزيع المدخلات والتكاليف على الجهات المشاركة
                </div>
              </div>
              {vm.entityCards.length === 0 ? (
                <div style={{ border: '1.5px dashed #D5DEEC', background: '#FAFCFF', borderRadius: 16, padding: '38px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#33415C' }}>لا توجد جهات مشاركة بعد</div>
                </div>
              ) : (
                <div data-r="entcards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 16 }}>
                  {vm.entityCards.map((e2) => (
                    <HoverDiv
                      key={e2.name}
                      onClick={e2.onOpen}
                      base={{ background: '#fff', border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', borderRadius: 18, padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 15 }}
                      hover={{ borderColor: '#C7D6EE', boxShadow: '0 18px 40px -22px rgba(15,31,61,.35)' }}
                    >
                      {/* icon badge (left) + entity name (right) */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ width: 42, height: 42, flex: 'none', borderRadius: 12, background: '#EAF0FE', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon d="M3 21h18M4 21V9l8-5 8 5v12M8 21v-4M12 21v-4M16 21v-4M4 9h16" size={20} color="#2563EB" />
                        </span>
                        <div className="hd" style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 800, color: '#13213C', lineHeight: 1.5, textAlign: 'right' }}>{e2.name}</div>
                      </div>
                      {/* total inputs — label right, number left */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontSize: 13, color: '#9AA6BC', fontWeight: 400 }}>إجمالي المدخلات</div>
                        <div style={{ fontSize: 30, fontWeight: 800, color: '#13213C', lineHeight: 1 }}>{e2.total}</div>
                      </div>
                      {/* by-stream breakdown — stream name right, count left */}
                      <div style={{ background: '#F7F9FC', border: '1px solid #EDF1F7', borderRadius: 14, padding: '14px 15px' }}>
                        <div style={{ fontSize: 12, color: '#9AA6BC', fontWeight: 400, textAlign: 'right', marginBottom: 11 }}>{e2.byStreamTitle}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                          {e2.byStream.map((sBrk) => (
                            <div key={sBrk.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                              <div style={{ fontSize: 13, color: '#42506B', fontWeight: 500, textAlign: 'right' }}>{sBrk.name}</div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: '#13213C', flex: 'none' }}>{sBrk.count}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* approved for funding + approved cost — label right, value left */}
                      <div style={{ borderTop: '1px solid #EEF1F7', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {e2.myNominated != null && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ fontSize: 12.5, color: '#6B7A93', fontWeight: 400 }}>المدخلات المرشحة من قبلي</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#13213C', flex: 'none' }}>{e2.myNominated}</div>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ fontSize: 12.5, color: '#6B7A93', fontWeight: 400 }}>{e2.myNominated != null ? 'المدخلات المعتمدة للتمويل' : 'العناصر المعتمدة للتمويل'}</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#13213C', flex: 'none' }}>{e2.funded}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ fontSize: 12.5, color: '#6B7A93', fontWeight: 400 }}>التكلفة المعتمدة</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#13213C', flex: 'none' }}>{e2.approvedCostLabel}</div>
                        </div>
                      </div>
                      {/* total execution budget — label right (bold), value left (blue) */}
                      <div style={{ borderTop: '1px solid #EEF1F7', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontSize: 13, color: '#13213C', fontWeight: 800 }}>إجمالي الميزانية التنفيذية</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#2563EB', flex: 'none' }}>{e2.execBudgetLabel}</div>
                      </div>
                      {/* CTA */}
                      <button
                        onClick={(ev) => { stop(ev); e2.onOpen(); }}
                        style={{ width: '100%', background: '#EFF4FE', border: 'none', borderRadius: 12, padding: '11px 0', fontSize: 13, fontWeight: 800, color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        عرض المزيد
                        <Icon d="M15 18l-6-6 6-6" size={13} color="#2563EB" />
                      </button>
                    </HoverDiv>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ===== LAUNCH PLANS: four big مرحلة cards ===== */}
          {vm.navSection === 'launchplans' && (
            <StageDistribution vm={vm} onManage={vm.showAddBtn ? setItemsMgrFor : undefined} />
          )}
          {vm.navSection === 'lplan' && (
            <LaunchPlan vm={vm} onManage={vm.showAddBtn ? setLaunchMgrFor : undefined} />
          )}

          {/* ===== stage items manager popup (coordinator) ===== */}
              {itemsMgrFor && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 60, direction: 'rtl', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                  <div
                    onClick={() => setItemsMgrFor(null)}
                    style={{ position: 'absolute', inset: 0, background: 'rgba(8,17,35,.55)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', animation: 'fadeIn .2s' }}
                  />
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: 620,
                      maxHeight: '70vh',
                      background: '#fff',
                      borderRadius: 20,
                      boxShadow: '0 30px 70px -24px rgba(2,12,35,.5)',
                      animation: 'fadeUp .3s',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ padding: '18px 22px 12px', display: 'flex', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid #F0F3F8' }}>
                      <div style={{ flex: 1 }}>
                        <div className="hd" style={{ fontSize: 16.5, fontWeight: 800, color: '#13213C' }}>تخطيط {itemsMgrFor.replace(/^إطلاق /, '')}</div>
                        <div style={{ fontSize: 11.5, color: '#9AA6BC', fontWeight: 400, marginTop: 3, lineHeight: 1.7 }}>
                          اختر المدخلات التي سيتم تنفيذها ضمن هذه المرحلة من خطة التنفيذ.
                        </div>
                      </div>
                      <button
                        onClick={() => setItemsMgrFor(null)}
                        style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', background: '#fff', color: '#54627B', cursor: 'pointer', fontSize: 16 }}
                      >
                        ✕
                      </button>
                    </div>
                    <div style={{ padding: '12px 22px 18px', overflowY: 'auto' }}>
                      {vm.stageAssignItems.length === 0 && (
                        <div style={{ padding: '18px 0', fontSize: 12, color: '#9AA6BC', fontWeight: 400, textAlign: 'center' }}>
                          لا توجد مشاريع أو عمليات أو خدمات قابلة للتحول بعد.
                        </div>
                      )}
                      {vm.stageAssignItems.map((x, xi) => (
                        <div
                          key={x.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 4px', borderTop: xi ? '1px solid #F4F6FA' : 'none' }}
                        >
                          <input
                            type="checkbox"
                            checked={x.batch === itemsMgrFor}
                            onChange={() => s.setItemBatch(x.id, x.batch === itemsMgrFor ? null : itemsMgrFor)}
                            style={{ width: 15, height: 15, accentColor: '#2563EB', cursor: 'pointer', flex: 'none' }}
                          />
                          <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#F1F4F9', color: '#54627B', flex: 'none' }}>
                            {x.typeLabel}
                          </span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 400, color: '#33415C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {x.title}
                          </span>
                          {x.batch === itemsMgrFor ? (
                            <span style={{ flex: 'none', fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#EAF1FE', color: '#1D4ED8' }}>
                              ضمن هذه المرحلة
                            </span>
                          ) : x.batch ? (
                            <span style={{ flex: 'none', fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#FFF3DE', color: '#B45309', whiteSpace: 'nowrap' }}>
                              {'مخطط حاليًا ' + x.batch.replace(/^إطلاق /, '').replace(/^المرحلة/, 'للمرحلة')}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ===== launch manager popup ===== */}
              {launchMgrFor && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 60, direction: 'rtl', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                  <div
                    onClick={() => setLaunchMgrFor(null)}
                    style={{ position: 'absolute', inset: 0, background: 'rgba(8,17,35,.55)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', animation: 'fadeIn .2s' }}
                  />
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: 760,
                      maxHeight: '74vh',
                      background: '#fff',
                      borderRadius: 20,
                      boxShadow: '0 30px 70px -24px rgba(2,12,35,.5)',
                      animation: 'fadeUp .3s',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ padding: '18px 22px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #F0F3F8' }}>
                      <div style={{ flex: 1 }}>
                        <div className="hd" style={{ fontSize: 16.5, fontWeight: 800, color: '#13213C' }}>إدارة الإطلاقات — {launchMgrFor.replace(/^إطلاق /, '')}</div>
                        <div style={{ fontSize: 11.5, color: '#9AA6BC', fontWeight: 400, marginTop: 3 }}>
                          أضيفوا الإطلاقات وحدِّدوا ما يشمله كل إطلاق — تنعكس التغييرات مباشرة على بطاقة المرحلة.
                        </div>
                      </div>
                      <button
                        onClick={() => s.addLaunchPlan(launchMgrFor)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          background: '#EAF0FE',
                          color: '#2563EB',
                          border: '1px solid #D9E4FD',
                          borderRadius: 10,
                          padding: '8px 13px',
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          flex: 'none',
                        }}
                      >
                        + إضافة إطلاق
                      </button>
                      <button
                        onClick={() => setLaunchMgrFor(null)}
                        style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', background: '#fff', color: '#54627B', cursor: 'pointer', fontSize: 16, flex: 'none' }}
                      >
                        ✕
                      </button>
                    </div>
                    <div style={{ padding: '14px 22px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(vm.launchPlanMgr.find((g) => g.batch === launchMgrFor)?.plans || []).length === 0 && (
                        <div style={{ padding: '18px 0', fontSize: 12, color: '#9AA6BC', fontWeight: 400, textAlign: 'center' }}>
                          لا توجد إطلاقات بعد — ابدؤوا بإضافة إطلاق.
                        </div>
                      )}
                      {(vm.launchPlanMgr.find((g) => g.batch === launchMgrFor)?.plans || []).map((p, pi) => {
                        const key = launchMgrFor + '|' + p.id;
                        const pOpen = openLaunch === key;
                        const selCount = p.items.filter((x) => x.checked).length;
                        const ord =
                          ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'][pi] || String(pi + 1);
                        return (
                          <div key={p.id} style={{ border: '1px solid #E6EBF3', borderRadius: 12, overflow: 'hidden', background: '#F3F5FA' }}>
                            <HoverDiv
                              onClick={() => setOpenLaunch(pOpen ? null : key)}
                              base={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', cursor: 'pointer', background: 'transparent' }}
                              hover={{ background: '#ECEFF5' }}
                            >
                              <Icon d={pOpen ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} size={14} color="#8A97AD" />
                              <span className="hd" style={{ flex: 'none', fontSize: 13, fontWeight: 800, color: '#13213C', whiteSpace: 'nowrap' }}>
                                الإطلاق {ord}
                              </span>
                              <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 400, color: '#6B7A93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.title.trim()}
                              </span>
                              <span style={{ flex: 'none', fontSize: 11, color: '#6B7A93', fontWeight: 400 }}>{selCount} محدد</span>
                              <button
                                onClick={(e) => {
                                  stop(e);
                                  s.removeLaunchPlan(p.id);
                                }}
                                title="حذف الإطلاق"
                                style={{
                                  flex: 'none',
                                  width: 26,
                                  height: 26,
                                  borderRadius: 8,
                                  border: 'none',
                                  background: '#FCEEEF',
                                  color: '#C0303B',
                                  cursor: 'pointer',
                                  fontSize: 13,
                                  fontFamily: 'inherit',
                                }}
                              >
                                ✕
                              </button>
                            </HoverDiv>
                            {pOpen && (
                              <div style={{ padding: '14px 13px', borderTop: '1px solid #E3E8F0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {/* 1) name / type / date */}
                                <div data-r="form3" style={{ display: 'grid', gridTemplateColumns: '1fr 170px 150px', gap: 8 }}>
                                  <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 400, color: '#6B7A93', marginBottom: 4 }}>اسم الإطلاق</label>
                                    <input
                                      value={p.title}
                                      onChange={(e) => s.updLaunchPlan(p.id, 'title', e.target.value)}
                                      placeholder="مثال: إطلاق خدمات المرحلة الأولى"
                                      style={mgrInput}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 400, color: '#6B7A93', marginBottom: 4 }}>نوع الإطلاق</label>
                                    <select value={p.ltype} onChange={(e) => s.updLaunchPlan(p.id, 'ltype', e.target.value)} style={mgrInput}>
                                      {LAUNCH_TYPES.map((t) => (
                                        <option key={t}>{t}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 400, color: '#6B7A93', marginBottom: 4 }}>التاريخ</label>
                                    <input type="date" value={p.date} onChange={(e) => s.updLaunchPlan(p.id, 'date', e.target.value)} style={mgrInput} />
                                  </div>
                                </div>
                                {/* 2) what the launch includes */}
                                <div>
                                  <div className="hd" style={{ fontSize: 12.5, fontWeight: 800, color: '#13213C', marginBottom: 7 }}>
                                    ماذا سيشمل الإطلاق؟
                                  </div>
                                  <div style={{ border: '1px solid #E6EBF3', borderRadius: 10, maxHeight: 220, overflowY: 'auto', background: '#fff' }}>
                                    {p.items.length === 0 && (
                                      <div style={{ padding: '12px 13px', fontSize: 11.5, color: '#9AA6BC', fontWeight: 400 }}>لا توجد إضافات بعد.</div>
                                    )}
                                    {p.items.map((x, xi) => (
                                      <div
                                        key={x.id}
                                        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 11px', borderTop: xi ? '1px solid #F0F3F8' : 'none' }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={x.checked}
                                          onChange={() => s.togglePlanItem(p.id, x.id)}
                                          style={{ width: 15, height: 15, accentColor: '#2563EB', cursor: 'pointer', flex: 'none' }}
                                        />
                                        <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#F1F4F9', color: '#54627B', flex: 'none' }}>
                                          {x.typeLabel}
                                        </span>
                                        <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 400, color: '#33415C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {x.title}
                                        </span>
                                        {x.otherBatch && (
                                          <span style={{ flex: 'none', fontSize: 9.5, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: '#FFF3DE', color: '#B45309' }}>
                                            في مرحلة أخرى
                                          </span>
                                        )}
                                        {x.launched && (
                                          <span style={{ flex: 'none', fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#E3F6EC', color: '#0B8A4B' }}>
                                            تم الإطلاق
                                          </span>
                                        )}
                                        <span style={{ flex: 'none', fontSize: 11.5, fontWeight: 400, color: '#9AA6BC' }}>
                                          {x.hasBudget ? x.budget : 'لم يتم تحديد الميزانية'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                {/* 3) budgets: exec = dynamic total of the checked items */}
                                <div data-r="form2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                  <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 400, color: '#6B7A93', marginBottom: 4 }}>الميزانية التقديرية للتنفيذ</label>
                                    <input
                                      value={p.budget}
                                      readOnly
                                      placeholder="تُحتسب تلقائياً من ميزانيات ما هو محدَّد"
                                      title="مجموع ميزانيات ما هو محدَّد أعلاه — يتحدّث تلقائياً"
                                      style={{ ...mgrInput, backgroundColor: '#F4F7FC', cursor: 'default' }}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 400, color: '#6B7A93', marginBottom: 4 }}>الميزانية التقديرية للإطلاق</label>
                                    <input
                                      value={p.launchBudget || ''}
                                      onChange={(e) => s.updLaunchPlan(p.id, 'launchBudget', e.target.value)}
                                      placeholder="تكلفة الإطلاق / الفعالية"
                                      style={mgrInput}
                                    />
                                  </div>
                                </div>
                                {/* 4) launch-level scope */}
                                <div>
                                  <label style={{ display: 'block', fontSize: 11, fontWeight: 400, color: '#6B7A93', marginBottom: 4 }}>نطاق العمل (على مستوى الإطلاق)</label>
                                  <textarea
                                    value={p.scope || ''}
                                    onChange={(e) => s.updLaunchPlan(p.id, 'scope', e.target.value)}
                                    placeholder="وصف موجز لما سيتم تحويله ضمن هذا الإطلاق…"
                                    rows={3}
                                    style={{ ...mgrInput, height: 'auto', padding: '9px 11px', resize: 'vertical', lineHeight: 1.7 }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

        </div>
      </div>

      {/* First-login onboarding walkthrough */}
      <Tour steps={vm.role === 'coord' ? COORD_TOUR_STEPS : vm.role === 'entity' ? ENTITY_TOUR_STEPS : vm.role === 'ai' ? AI_TOUR_STEPS : vm.role === 'path' ? PATH_TOUR_STEPS : TOUR_STEPS} />
    </div>
  );
}

// ---------------------------------------------------------------------------
const mgrInput: CSSProperties = {
  width: '100%',
  height: 40,
  border: '1px solid #DCE3EE',
  backgroundColor: '#fff',
  borderRadius: 10,
  padding: '0 11px',
  fontSize: 12.5,
  fontWeight: 400,
  color: '#13213C',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const selectStyle: CSSProperties = {
  height: 40,
  width: 170,
  minWidth: 170,
  border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
  backgroundColor: '#fff',
  borderRadius: 11,
  padding: '0 13px',
  fontWeight: 400,
  fontSize: 13,
  color: '#42506B',
  outline: 'none',
  cursor: 'pointer',
};

function KpiCard({
  value,
  label,
  iconD,
  grid,
  suffix,
  sub,
  rows,
}: {
  value: number;
  label: string;
  iconD?: string;
  grid?: boolean;
  suffix?: string;
  sub?: string;
  rows?: { label: string; value: number }[];
}) {
  const iconChip = (
    <span
      style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        background: '#EAF0FE',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
      }}
    >
      {grid ? (
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#2563EB"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ) : (
        <Icon d={iconD!} size={16} color="#2563EB" />
      )}
    </span>
  );
  const valueBlock = (
    <div style={{ fontSize: 21, fontWeight: 800, color: '#13213C', lineHeight: 1.25 }}>
      {value}
      {suffix && <span style={{ fontSize: 13, color: '#9AA6BC' }}>{suffix}</span>}
      {sub && <span style={{ fontSize: 11.5, color: '#9AA6BC', fontWeight: 700, marginRight: 6 }}>({sub})</span>}
    </div>
  );

  // with a distribution: icon stacked above the total on the start side,
  // plain label + number rows filling the rest (no bars)
  if (rows && rows.length > 0) {
    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
          borderRadius: 14,
          padding: '13px 15px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 7, minWidth: 0 }}>
          {iconChip}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: '#6B7A93', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</div>
            {valueBlock}
          </div>
        </div>
        <div style={{ width: 1, alignSelf: 'stretch', background: '#F0F3F8', flex: 'none' }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {rows.map((r) => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#6B7A93',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.label}
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#13213C', flex: 'none' }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
        borderRadius: 14,
        padding: '13px 15px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 7,
      }}
    >
      {iconChip}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: '#6B7A93', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</div>
        {valueBlock}
      </div>
    </div>
  );
}

// Hero tile: total first, with a single-hue stacked composition bar.
// Identity is carried by lightness steps of ONE blue + direct labels.
const BLUE_STEPS = ['#2563EB', '#7DA4F2', '#C2D5FA'];

// Percentage tile — label + value only, no decoration.

// national-overview KPI card: info ⓘ on the left, label + status dot on the
// right, big centred figure below
function CommitteeKpi({ value, label, dot, info }: { value: number; label: string; dot?: string; info?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', borderRadius: 16, padding: '15px 18px', minHeight: 120, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span style={{ fontSize: 12.5, color: '#6B7A93', fontWeight: 400, lineHeight: 1.5 }}>{label}</span>
          {dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flex: 'none' }} />}
        </span>
        {info && <InfoTip text={info} />}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 6 }}>
        <span style={{ fontSize: 34, fontWeight: 800, color: '#13213C', lineHeight: 1 }}>{value}</span>
      </div>
    </div>
  );
}

// national-overview stat column (inside the shared indicators card)
function CmtStat({ value, label, sub, iconD, info }: { value: number; label: string; sub: string; iconD: string; info?: string }) {
  return (
    <div style={{ flex: '1 1 150px', minWidth: 150, padding: '2px 18px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span style={{ fontSize: 12.5, color: '#6B7A93', fontWeight: 400 }}>{label}</span>
          <Icon d={iconD} size={16} color="#8A97AD" />
        </span>
        {info && <InfoTip text={info} />}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, paddingTop: 12 }}>
        <div style={{ fontSize: 34, fontWeight: 800, color: '#13213C', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: '#9AA6BC', fontWeight: 400 }}>{sub}</div>
      </div>
    </div>
  );
}

// mini nomination-distribution card
function CmtMini({ value, label, info, green }: { value: number; label: string; info?: string; green?: boolean }) {
  return (
    <div style={{ background: green ? '#EAF1FE' : '#fff', border: '1px solid ' + (green ? '#D3E3FB' : '#E7ECF4'), borderRadius: 14, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 92 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ fontSize: 11.5, color: green ? '#2563EB' : '#6B7A93', fontWeight: 400, lineHeight: 1.4 }}>{label}</span>
        {info && <InfoTip text={info} />}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <span style={{ fontSize: 27, fontWeight: 800, color: green ? '#2563EB' : '#13213C', lineHeight: 1 }}>{value}</span>
      </div>
    </div>
  );
}

function StatCard({ value, label, dot, info, suffix }: { value: number; label: string; dot?: string; info?: string; suffix?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', borderRadius: 14, padding: '13px 15px' }}>
      <div
        style={{
          fontSize: 11.5,
          color: '#6B7A93',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          lineHeight: 1.5,
        }}
      >
        {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flex: 'none' }} />}
        <span style={{ minWidth: 0 }}>{label}</span>
        {info && <InfoTip text={info} />}
      </div>
      <div style={{ fontSize: 21, fontWeight: 800, color: '#13213C', marginTop: 3, lineHeight: 1.25 }}>
        {value}
        {suffix && <span style={{ fontSize: 13, color: '#9AA6BC' }}>{suffix}</span>}
      </div>
    </div>
  );
}

function BudgetFigure({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{ fontSize: 20, fontWeight: 800, color: '#13213C', whiteSpace: 'nowrap', lineHeight: 1.25 }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: '#8A97AD', fontWeight: 600, marginTop: 4 }}>{label}</div>
    </div>
  );
}

type CardVM = VM['cards'][number];

// ---------------------------------------------------------------------------
// List view — the same items as a clean, scannable table
function ListView({ cards }: { cards: CardVM[] }) {
  const th: CSSProperties = {
    textAlign: 'right',
    padding: '10px 14px',
    fontSize: 11.5,
    fontWeight: 700,
    color: '#8A97AD',
    borderBottom: '1px solid #EEF1F7',
    whiteSpace: 'nowrap',
  };
  const td: CSSProperties = {
    padding: '12px 14px',
    fontSize: 12.5,
    color: '#33415C',
    borderBottom: '1px solid #F4F6FA',
    verticalAlign: 'middle',
  };
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
        borderRadius: 16,
        overflowX: 'auto',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1020 }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 30 }} />
            <th style={th}>العنوان</th>
            <th style={th}>النوع</th>
            <th style={th}>المسار</th>
            <th style={th}>الحالة</th>
            <th style={th}>خطة الإطلاق</th>
            <th style={th}>آخر تحديث</th>
            <th style={{ ...th, textAlign: 'center' }}>الإجراء</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c) => (
            <tr
              key={c.id}
              onClick={c.onOpen}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#F7F9FD')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '')}
            >
              <td style={td}>
                {(c.showSelectCheck || c.showAssignCheck) ? (
                  <span
                    onClick={(e) => {
                      stop(e);
                      if (c.showSelectCheck) c.onToggleFundSel();
                      else c.onToggleAssignSel();
                    }}
                    style={{
                      display: 'inline-flex',
                      width: 17,
                      height: 17,
                      borderRadius: 5,
                      border: `2px solid ${c.showSelectCheck ? (c.fundChecked ? '#2563EB' : '#C7D1E2') : c.assignChecked ? '#2563EB' : '#C7D1E2'}`,
                      background: (c.showSelectCheck ? c.fundChecked : c.assignChecked) ? '#2563EB' : '#fff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    {(c.showSelectCheck ? c.fundChecked : c.assignChecked) && (
                      <Icon d="M20 6 9 17l-5-5" size={11} color="#fff" strokeWidth={3} />
                    )}
                  </span>
                ) : c.fundLocked ? (
                  <span
                    title="معتمد للتمويل"
                    style={{
                      display: 'inline-flex',
                      width: 17,
                      height: 17,
                      borderRadius: 5,
                      border: '2px solid #BAC3D3',
                      background: '#BAC3D3',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'default',
                    }}
                  >
                    <Icon d="M20 6 9 17l-5-5" size={11} color="#fff" strokeWidth={3} />
                  </span>
                ) : null}
              </td>
              <td style={{ ...td, fontWeight: 800, color: '#13213C', maxWidth: 260 }}>{c.title}</td>
              <td style={{ ...td, whiteSpace: 'nowrap' }}>{c.typeLabel}</td>
              <td style={td}>{c.pathName}</td>
              <td style={{ ...td, whiteSpace: 'nowrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: c.wfBg,
                    color: c.wfChip,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.wfChip }} />
                  {c.wfLabel}
                </span>
              </td>
              <td style={{ ...td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.launchLabel || '—'}
              </td>
              <td style={{ ...td, whiteSpace: 'nowrap', color: '#8A97AD', fontSize: 11.5 }}>
                {c.statusStamp || '—'}
              </td>
              <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                {c.canApprove ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={(e) => {
                        stop(e);
                        c.onApprove();
                      }}
                      style={{
                        background: 'linear-gradient(180deg,#0EA371,#0B8A4B)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 9,
                        padding: '7px 14px',
                        fontWeight: 800,
                        fontSize: 11.5,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      اعتماد
                    </button>
                    <button
                      title="رفض"
                      aria-label="رفض"
                      onClick={(e) => {
                        stop(e);
                        c.onReject();
                      }}
                      style={{
                        width: 30,
                        height: 30,
                        background: '#FCEEEF',
                        color: '#C0303B',
                        border: '1px solid #F5D8DB',
                        borderRadius: 9,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon d="M18 6L6 18M6 6l12 12" size={12} color="#C0303B" strokeWidth={2.4} />
                    </button>
                    <button
                      onClick={(e) => {
                        stop(e);
                        c.onReqInfo();
                      }}
                      style={{
                        background: '#fff',
                        color: '#33405A',
                        border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
                        borderRadius: 9,
                        padding: '7px 12px',
                        fontWeight: 700,
                        fontSize: 11,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      طلب تفاصيل إضافية
                    </button>
                  </span>
                ) : c.showPathCta ? (
                  <button
                    onClick={(e) => {
                      stop(e);
                      c.onPathCta();
                    }}
                    style={{
                      background: '#EAF0FE',
                      color: '#2563EB',
                      border: 'none',
                      borderRadius: 9,
                      padding: '7px 14px',
                      fontWeight: 800,
                      fontSize: 11.5,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {c.pathCtaLabel}
                  </button>
                ) : (
                  <span style={{ color: '#C3CDDE', fontSize: 12 }}>عرض ←</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CARD_PILLS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'مسودة', color: '#5A6B86', bg: '#EEF2F8' },
  pendEnt: { label: 'بانتظار اعتماد الجهة', color: '#B45309', bg: '#FFF7EB' },
  apprEnt: { label: 'معتمد من الجهة', color: '#0B8A4B', bg: '#EAF7F0' },
  rejEnt: { label: 'مرفوض من الجهة', color: '#C0392B', bg: '#FDECEA' },
  nominated: { label: 'مُرشَّح للتمويل', color: '#6D28D9', bg: '#F3EEFD' },
  pendFund: { label: 'بانتظار اعتماد التمويل', color: '#B45309', bg: '#FFF7EB' },
  apprFund: { label: 'معتمد للتمويل', color: '#0B8A4B', bg: '#EAF7F0' },
  launched: { label: 'تم الإطلاق', color: '#0B8A4B', bg: '#E9F7EF' },
};

const RECO_BANDS: Record<'reco' | 'wait', { color: string; bg: string; border: string }> = {
  reco: { color: '#0B8A4B', bg: '#F3FBF6', border: '#DCF0E5' },
  wait: { color: '#B45309', bg: '#FFFBF3', border: '#F6E7CE' },
};

// §6 button tokens — base: 12.5/700, padding 9x12, radius 9, inline-flex centered gap 6.
// GREEN and RED are reserved EXCLUSIVELY for approve and reject.
const BTN_BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontSize: 12.5,
  fontWeight: 800,
  padding: '10px 14px',
  borderRadius: 10,
  cursor: 'pointer',
  fontFamily: 'inherit',
  lineHeight: 1,
};
// One unified 3-tier button system.
// primary   — filled brand blue, the main action
// secondary — white with a blue outline, the alternative action
// tertiary  — ghost / low-emphasis
const BTN_PRIMARY: React.CSSProperties = { ...BTN_BASE, background: 'linear-gradient(180deg,#2E74EE,#1F5FE0)', color: '#fff', border: 'none', boxShadow: '0 8px 18px -8px rgba(37,99,235,.7)' };
const BTN_SECONDARY: React.CSSProperties = { ...BTN_BASE, background: '#fff', border: '1px solid #D8E3F5', color: '#1D4ED8' };
const BTN_TERTIARY: React.CSSProperties = { ...BTN_BASE, background: 'transparent', border: '1px solid transparent', color: '#54627B' };
// semantic aliases map onto the three tiers (approve = primary, reject =
// secondary, other neutral actions = secondary)
// approval is always GREEN and rejection always RED — flat, no shadow
const BTN_APPROVE: React.CSSProperties = { ...BTN_BASE, background: '#0B8A4B', color: '#fff', border: 'none' };
const BTN_REJECT: React.CSSProperties = { ...BTN_BASE, background: '#fff', border: '1px solid #F0C4C8', color: '#C0303B' };
const BTN_NEUTRAL = BTN_SECONDARY;

const CLOCK_D = 'M12 8v4l2.5 1.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z';
const CHECK_D = 'M20 6 9 17l-5-5';

function CardItem({ c }: { c: CardVM }) {
  const [hover, setHover] = useState(false);
  const pill = CARD_PILLS[c.cardStatus] || CARD_PILLS.draft;
  const showCheckbox = c.showAssignCheck || c.showSelectCheck;
  const checkboxChecked = c.showAssignCheck ? c.assignChecked : c.fundChecked;
  const onToggleCheckbox = c.showAssignCheck ? c.onToggleAssignSel : c.onToggleFundSel;
  const band = RECO_BANDS[c.recoBand] || RECO_BANDS.wait;
  return (
    <div
      onClick={c.onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#fff',
        border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
        borderRadius: 16,
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        cursor: 'pointer',
        transition: 'box-shadow .15s,transform .15s',
        ...(hover
          ? { boxShadow: '0 16px 34px -20px rgba(15,31,61,.45)', transform: 'translateY(-2px)' }
          : null),
      }}
    >
      {/* Meta row: type chip + status pill + optional checkbox */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 999,
              background: '#EEF2F8',
              color: '#5A6B86',
              whiteSpace: 'nowrap',
            }}
          >
            {c.typeLabel}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 999,
              background: pill.bg,
              color: pill.color,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: pill.color, flex: 'none' }} />
            {c.pillLabel || pill.label}
          </span>
        </div>
        {showCheckbox ? (
          <span
            onClick={(e) => {
              stop(e);
              onToggleCheckbox();
            }}
            style={{
              width: 19,
              height: 19,
              borderRadius: 6,
              border: `2px solid ${checkboxChecked ? '#2563EB' : '#CBD5E6'}`,
              background: checkboxChecked ? '#2563EB' : '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
              cursor: 'pointer',
              transition: 'all .12s',
            }}
          >
            {checkboxChecked && <Icon d={CHECK_D} size={12} color="#fff" strokeWidth={3} />}
          </span>
        ) : c.fundLocked ? (
          // already approved for funding (funded or launched): locked, gray, checked, not clickable
          <span
            title="معتمد للتمويل"
            style={{
              width: 19,
              height: 19,
              borderRadius: 6,
              border: '2px solid #BAC3D3',
              background: '#BAC3D3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
              cursor: 'default',
            }}
          >
            <Icon d={CHECK_D} size={12} color="#fff" strokeWidth={3} />
          </span>
        ) : null}
      </div>

      {/* Title */}
      <div style={{ fontSize: 15.5, fontWeight: 700, color: '#13213C', lineHeight: 1.4 }}>{c.title}</div>

      {/* Description (2-line clamp) */}
      <div
        style={{
          fontSize: 12.5,
          color: '#8492A8',
          lineHeight: 1.6,
          fontWeight: 500,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {c.desc}
      </div>

      {/* Launch phase + linked launch */}
      {(c.batchLabel || (c.launchNames && c.launchNames.length > 0)) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {c.batchLabel === TBD_BATCH ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: '#FFF3DE', color: '#B45309' }}>
              <Icon d="M12 8v4l2.5 1.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" size={11} color="#B45309" />
              للتحديد بعد الدراسة
            </span>
          ) : c.batchLabel ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 10,
                fontWeight: 800,
                padding: '3px 9px',
                borderRadius: 999,
                background: '#EAF0FE',
                color: '#2563EB',
              }}
            >
              <Icon d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" size={11} color="#2563EB" />
              التنفيذ ضمن {c.batchLabel.replace('إطلاق ', '')}
            </span>
          ) : null}
          {c.launchNames && c.launchNames.length > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 999,
                background: '#F0F4FB',
                color: '#3B5AA5',
                maxWidth: '100%',
              }}
            >
              <Icon d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" size={11} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.launchNames.join('، ')}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Rejection reason box */}
      {c.cardStatus === 'rejEnt' && (
        <div
          style={{
            display: 'flex',
            gap: 9,
            background: '#FDF1EF',
            border: '1px solid #F6D9D3',
            borderRadius: 10,
            padding: '10px 12px',
          }}
        >
          <Icon
            d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            size={15}
            color="#C0392B"
            strokeWidth={2}
          />
          <div style={{ fontSize: 11.5, color: '#A23A2E', fontWeight: 600, lineHeight: 1.6 }}>{c.retNote}</div>
        </div>
      )}

      {/* Recommendation strip — COMMITTEE only, on every committee card */}
      {c.showEntity && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            background: band.bg,
            border: `1px solid ${band.border}`,
            borderRadius: 11,
            padding: '9px 11px',
          }}
        >
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 9,
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 900,
              color: '#fff',
              background: band.color,
            }}
          >
            {c.scoreV}
          </span>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: band.color }}>{c.recoStripLabel || c.scoreLabel}</div>
        </div>
      )}

      {/* Footer meta — pinned to the bottom so cards in a row align */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
          borderTop: '1px solid #F0F3F8',
          paddingTop: 13,
          marginTop: 'auto',
        }}
      >
        {c.showPathLine && (
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9AA6BA' }}>المسار: {c.pathName}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 11.5,
              fontWeight: 600,
              color: '#54627B',
              minWidth: 0,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#94A3B8', flex: 'none' }} />
            <span>{c.footLabel}</span>
          </span>
          {c.endDateFmt && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                fontWeight: 600,
                color: '#AEB8C7',
                whiteSpace: 'nowrap',
                flex: 'none',
              }}
            >
              <Icon d={CLOCK_D} size={11} color="#AEB8C7" />
              {c.endDateFmt}
            </span>
          )}
        </div>
      </div>

      {/* Action area — per (role, status) matrix */}
      {c.cardAction === 'edit' && (
        <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
          <button
            onClick={(e) => {
              stop(e);
              c.onPathCta();
            }}
            style={{ ...BTN_PRIMARY, flex: 1 }}
          >
            متابعة التعبئة
          </button>
          <button
            aria-label="خيارات"
            onClick={(e) => {
              stop(e);
              c.onMenu();
            }}
            style={{ ...BTN_NEUTRAL, width: 38, flex: 'none', padding: 0 }}
          >
            <Icon d="M12 5h.01M12 12h.01M12 19h.01" size={18} color="#64748B" strokeWidth={2.6} />
          </button>
          {c.menuOpen && c.canDelete && (
            <div
              onClick={stop}
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                left: 0,
                background: '#fff',
                border: '1px solid #E7ECF4',
                borderRadius: 10,
                boxShadow: '0 14px 30px -14px rgba(15,31,61,.4)',
                padding: 5,
                zIndex: 5,
                minWidth: 150,
              }}
            >
              <button
                onClick={(e) => {
                  stop(e);
                  c.onDelete();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 7,
                  padding: '8px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#C0392B',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <Icon
                  d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"
                  size={14}
                  color="#C0392B"
                />
                حذف المدخل
              </button>
            </div>
          )}
        </div>
      )}

      {c.cardAction === 'withdraw' && (
        <button
          onClick={(e) => {
            stop(e);
            c.onWithdrawToDraft();
          }}
          style={{ ...BTN_NEUTRAL, width: '100%' }}
        >
          سحب المدخل
        </button>
      )}

      {c.cardAction === 'editResubmit' && (
        <button
          onClick={(e) => {
            stop(e);
            c.onPathCta();
          }}
          style={{ ...BTN_PRIMARY, width: '100%' }}
        >
          تعديل المدخل وإعادة إرساله
        </button>
      )}

      {c.cardAction === 'viewDetails' && (
        <button
          onClick={(e) => {
            stop(e);
            c.onOpen();
          }}
          style={{ ...BTN_NEUTRAL, width: '100%' }}
        >
          عرض التفاصيل
        </button>
      )}

      {c.cardAction === 'approveInfoReject' && (
        <div style={{ display: 'flex', gap: 7 }}>
          <button
            onClick={(e) => {
              stop(e);
              c.onApprove();
            }}
            style={{ ...BTN_APPROVE, flex: 1 }}
          >
            <Icon d={CHECK_D} size={13} color="#fff" strokeWidth={3} />
            اعتماد
          </button>
          <button
            onClick={(e) => {
              stop(e);
              c.onReject();
            }}
            style={{ ...BTN_REJECT, flex: 1 }}
          >
            رفض
          </button>
          <button
            onClick={(e) => {
              stop(e);
              c.onReqInfo();
            }}
            style={{ ...BTN_NEUTRAL, flex: 1, whiteSpace: 'nowrap' }}
          >
            طلب تفاصيل إضافية
          </button>
        </div>
      )}

      {c.cardAction === 'nominate' && (
        <button
          onClick={(e) => {
            stop(e);
            c.onNominate();
          }}
          style={{ ...BTN_PRIMARY, width: '100%' }}
        >
          ترشيح للتمويل
        </button>
      )}

      {c.cardAction === 'cancelNom' && (
        <button
          onClick={(e) => {
            stop(e);
            c.onWithdrawNom();
          }}
          style={{ ...BTN_REJECT, width: '100%' }}
        >
          إلغاء الترشيح
        </button>
      )}

      {/* committee funding decision — approve (green) / reject (red).
          NOTE: card handover §9-5 says committee never rejects; the committee
          copy spec (later, wins) requires «رفض التمويل». */}
      {c.cardAction === 'fundApproveReject' && (
        <div style={{ display: 'flex', gap: 7 }}>
          <button
            onClick={(e) => {
              stop(e);
              c.onFundNom();
            }}
            style={{ ...BTN_APPROVE, flex: 1 }}
          >
            <Icon d={CHECK_D} size={13} color="#fff" strokeWidth={3} />
            اعتماد التمويل
          </button>
          <button
            onClick={(e) => {
              stop(e);
              c.onDeclineNom();
            }}
            style={{ ...BTN_REJECT, flex: 1 }}
          >
            رفض التمويل
          </button>
        </div>
      )}

    </div>
  );
}
