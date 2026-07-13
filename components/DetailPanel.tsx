'use client';
import type { VM } from '@/lib/viewModel';
import { Icon } from './Icon';
import { RichTextEditor, RichTextView } from './RichText';
import { SC, EXEC_STATUS_OPTS } from '@/lib/domain';

const CHECK = 'M20 6 9 17l-5-5';
const CLOCK = 'M12 8v4l2.5 1.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z';
const DOWNLOAD = 'M12 3v12M7 10l5 5 5-5M5 21h14';
const WALLET = 'M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4z';
const SPEECH = 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z';

const labelStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 500,
  color: '#98A4B6',
  marginBottom: 8,
};
const valueStyle: React.CSSProperties = {
  fontSize: 14.5,
  fontWeight: 800,
  color: '#16233F',
};

const sectionCard: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
  borderRadius: 14,
  padding: '16px 18px',
};

// ===== grouped detail layout (section header + divided field card) =====
const IC_BUILDING = 'M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01';
const IC_TAG = 'M9 3H4a1 1 0 0 0-1 1v5l9 9 6-6-9-9zM7.5 7.5h.01';
const IC_GRID = 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z';
const IC_PEOPLE = 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8';

function DetailSecHead({ title }: { title: string }) {
  return (
    <div style={{ direction: 'rtl', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, marginTop: 22, marginBottom: 12 }}>
      <span className="hd" style={{ fontSize: 15.5, fontWeight: 800, color: '#16233F' }}>{title}</span>
    </div>
  );
}

function DetailGrid({ cols, tint, children }: { cols: number; tint?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, gap: 1, background: '#EAEEF5', border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', borderRadius: 16, overflow: 'hidden' }}>
      {children}
    </div>
  );
}

function DetailCell({ label, iconD, tint, children }: { label: string; iconD?: string; tint?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: tint ? '#F8FAFD' : '#fff', padding: '20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 92 }}>
      <div style={{ minWidth: 0, textAlign: 'right', flex: 1 }}>
        <div style={labelStyle}>{label}</div>
        <div style={{ ...valueStyle, lineHeight: 1.55 }}>{children}</div>
      </div>
      {iconD && (
        <span style={{ width: 34, height: 34, flex: 'none', borderRadius: 10, background: '#EAF0FE', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d={iconD} size={16} color="#2563EB" />
        </span>
      )}
    </div>
  );
}

function TransformPill({ v }: { v?: string }) {
  const s = (v || '').trim();
  const bad = s.includes('غير');
  const partial = s.includes('جزئي');
  const c = !s ? '#8A97AD' : bad ? '#C0392B' : partial ? '#B45309' : '#0B8A4B';
  const bg = !s ? '#EEF2F8' : bad ? '#FDECEA' : partial ? '#FFF7EB' : '#EAF7F0';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: bg, color: c, borderRadius: 999, padding: '3px 11px', fontSize: 12, fontWeight: 800 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flex: 'none' }} />
      {s || '—'}
    </span>
  );
}

// Colored pill for qualitative levels (الأولوية / التصنيف / كثافة الاستخدام /
// أولوية التحول / مستوى التعقيد): high→red, medium→amber, low→green.
function LevelPill({ v }: { v?: string }) {
  const s = (v || '').trim();
  const high = /عالٍ|عالي|عالية|مرتفع|كبير|حرج|عاجل|قصو/.test(s);
  const mid = /متوسط|معتدل|متوسّط/.test(s);
  const low = /منخفض|بسيط|قليل|ضعيف|محدود/.test(s);
  const c = !s ? '#8A97AD' : high ? '#C0392B' : mid ? '#B45309' : low ? '#0B8A4B' : '#1D4ED8';
  const bg = !s ? '#EEF2F8' : high ? '#FDECEA' : mid ? '#FFF7EB' : low ? '#EAF7F0' : '#EAF1FE';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: bg, color: c, borderRadius: 999, padding: '3px 11px', fontSize: 12, fontWeight: 800 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flex: 'none' }} />
      {s || '—'}
    </span>
  );
}

function AutoLevel({ pct, level }: { pct?: number; level?: string }) {
  const p = Math.max(0, Math.min(100, pct || 0));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 16, fontWeight: 900, color: '#13213C' }}>{p}%</span>
        {level && <span style={{ fontSize: 11.5, color: '#8A97AD', fontWeight: 400 }}>{level}</span>}
      </div>
      <div style={{ marginTop: 6, height: 6, background: '#EDF1F7', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: p + '%', background: '#2563EB', borderRadius: 999 }} />
      </div>
    </div>
  );
}

export function DetailPanel({ vm }: { vm: VM }) {
  const d = vm.detail!;
  // drawer tabs: البيانات / التنفيذ والإطلاق / السجل

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        direction: 'rtl',
      }}
    >
      {/* scrim */}
      <div
        onClick={d.onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(8,18,40,.5)',
          animation: 'fadeIn .2s',
        }}
      />
      {/* panel */}
      <div
        data-r="panel"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: 680,
          maxWidth: '97vw',
          background: '#F4F7FC',
          boxShadow: '-24px 0 70px -24px rgba(2,12,35,.5)',
          animation: 'slideInRight .3s',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ---------- HEADER ---------- */}
        <div
          style={{
            background: '#fff',
            borderBottom: '1px solid #E7ECF4',
            padding: '16px 22px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: d.typeBg,
                  color: d.typeColor,
                  flex: 'none',
                }}
              >
                {d.typeLabel}
              </span>
              <span
                className="hd"
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#13213C',
                  lineHeight: 1.4,
                }}
              >
                {d.title}
              </span>
            </div>
            <button
              onClick={d.onClose}
              style={{
                flex: 'none',
                width: 34,
                height: 34,
                borderRadius: 10,
                border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
                background: '#fff',
                color: '#54627B',
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>

          {/* ---------- STEP TIMELINE ---------- */}
          <div style={{ display: 'flex', marginTop: 18 }}>
            {d.dSteps.map((st, idx) => {
              const circleBg = st.isDone ? '#0B8A4B' : st.state === 'active' ? '#fff' : '#EFF2F7';
              const circleColor = st.isDone ? '#fff' : st.state === 'active' ? '#2563EB' : '#9AA6BC';
              const circleBorder =
                st.state === 'active' ? '2px solid #2563EB' : st.isDone ? 'none' : '1px solid #E1E7F1';
              const circleGlow =
                st.state === 'active' ? '0 0 0 4px rgba(37,99,235,.15)' : 'none';
              const lineBg = st.isDone || st.state === 'active' ? '#0B8A4B' : '#E1E7F1';
              const labelColor =
                st.state === 'active' ? '#13213C' : st.isDone ? '#0B8A4B' : '#9AA6BC';
              return (
                <div
                  key={st.num}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <div
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 3,
                        background: idx === 0 ? 'transparent' : lineBg,
                      }}
                    />
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                        flex: 'none',
                        margin: '0 4px',
                        background: circleBg,
                        color: circleColor,
                        border: circleBorder,
                        boxShadow: circleGlow,
                      }}
                    >
                      {st.isDone ? <Icon d={CHECK} size={14} color="#fff" strokeWidth={3} /> : st.num}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 3,
                        background: idx === d.dSteps.length - 1 ? 'transparent' : (d.dSteps[idx + 1].isDone || d.dSteps[idx + 1].state === 'active' ? '#0B8A4B' : '#E1E7F1'),
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: labelColor,
                      textAlign: 'center',
                      marginTop: 6,
                      lineHeight: 1.4,
                    }}
                  >
                    {st.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------- BODY ---------- */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'contents' }}>
          {/* ===== INFO GRID ===== */}
          <div
            className="rgrid-2"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4,1fr)',
              gap: 10,
            }}
          >
            <div
              style={{
                background: '#fff',
                border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
                borderRadius: 13,
                padding: '12px 13px',
              }}
            >
              <div style={labelStyle}>الحالة</div>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: d.wfBg,
                  color: d.wfChip,
                }}
              >
                {d.wfLabel}
              </span>
            </div>
            <div
              style={{
                background: '#fff',
                border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
                borderRadius: 13,
                padding: '12px 13px',
              }}
            >
              <div style={labelStyle}>الأولوية</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <LevelPill v={d.priority} />
                {d.rankLabel && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      padding: '3px 9px',
                      borderRadius: 999,
                      background: '#EAF1FE',
                      color: '#1D4ED8',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    الترتيب {d.rankLabel}
                  </span>
                )}
              </div>
            </div>
            <div
              style={{
                background: '#fff',
                border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
                borderRadius: 13,
                padding: '12px 13px',
              }}
            >
              <div style={labelStyle}>التصنيف</div>
              <div><LevelPill v={d.complexity} /></div>
            </div>
            <div
              style={{
                background: '#fff',
                border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
                borderRadius: 13,
                padding: '12px 13px',
              }}
            >
              <div style={labelStyle}>تاريخ الإطلاق المتوقع</div>
              <div style={valueStyle}>{d.endDateFmt}</div>
            </div>
          </div>
          </div>

          <div style={{ display: 'contents' }}>
          {/* Funded banner */}
          {d.dFunded && (
            <div
              style={{
                background: '#EDF9F1',
                border: '1px solid #D5EEE0',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                gap: 11,
                alignItems: 'flex-start',
              }}
            >
              <div style={{ flex: 'none', marginTop: 1 }}>
                <Icon d={WALLET} size={20} color="#0B8A4B" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#0B8A4B', fontWeight: 800, fontSize: 13 }}>
                  معتمد للتمويل من اللجنة الوطنية
                </div>
                <div style={{ color: '#0B7C57', fontSize: 12, fontWeight: 600, marginTop: 4 }}>
                  {d.dFundedText}
                </div>
              </div>
            </div>
          )}
          </div>

          <div style={{ display: 'contents' }}>
          {/* Returned banner */}
          {d.isReturned && (
            <div
              style={{
                background: '#FFF4F4',
                border: '1px solid #F6D6D9',
                borderRadius: 11,
                padding: '11px 13px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#C0303B',
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                <Icon d={SPEECH} size={16} color="#C0303B" />
                {d.retBannerLabel}
              </div>
              {d.retNote && (
                <div style={{ color: '#7A4A4E', fontSize: 12, marginTop: 4 }}>{d.retNote}</div>
              )}
            </div>
          )}
          </div>

          <div style={{ display: 'contents' }}>
          {/* Main detail — grouped sections (no outer card) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <DetailGrid cols={1}>
              <DetailCell label="الوصف">
                <RichTextView html={d.desc} style={{ fontSize: 13.5, color: '#33415C', lineHeight: 1.8, fontWeight: 400 }} />
              </DetailCell>
            </DetailGrid>

            {/* --- PROJECT / INITIATIVE --- */}
            {d.isProj && (
              <>
                <DetailSecHead title="النتائج المتوقعة" />
                <DetailGrid cols={2}>
                  <DetailCell label="المخرجات المتوقعة"><RichTextView html={d.expectedOutputs} style={{ fontSize: 13, color: '#33415C', lineHeight: 1.7, fontWeight: 400 }} /></DetailCell>
                  <DetailCell label="النتائج المتوقعة"><RichTextView html={d.expectedOutcomes} style={{ fontSize: 13, color: '#33415C', lineHeight: 1.7, fontWeight: 400 }} /></DetailCell>
                </DetailGrid>
                <DetailGrid cols={3}>
                  <DetailCell label="الأثر المتوقع"><RichTextView html={d.expectedImpact} style={valueStyle} /></DetailCell>
                  <DetailCell label="نماذج الذكاء">{d.aiModels}</DetailCell>
                  <DetailCell label="نسبة التحول">{d.targetPct}%</DetailCell>
                </DetailGrid>

                <DetailSecHead title="جاهزية التحول" />
                <DetailGrid cols={3}>
                  <DetailCell label="قابلية التحول"><TransformPill v={d.transformability} /></DetailCell>
                  <DetailCell label="أولوية التحول"><LevelPill v={d.transformPriority} /></DetailCell>
                  <DetailCell label="جاهزية التحول">{d.readiness}</DetailCell>
                </DetailGrid>
              </>
            )}

            {/* --- OPERATION --- */}
            {d.isOp && (
              <>
                <DetailSecHead title="خصائص العملية" />
                <DetailGrid cols={3}>
                  <DetailCell label="نوع العملية">{d.opType}</DetailCell>
                  <DetailCell label="كثافة الاستخدام"><LevelPill v={d.usageIntensity} /></DetailCell>
                  <DetailCell label="الأنشطة الفرعية"><RichTextView html={d.subActivities} style={valueStyle} /></DetailCell>
                </DetailGrid>

                <DetailSecHead title="جاهزية التحول" />
                <DetailGrid cols={3}>
                  <DetailCell label="قابلية التحول"><TransformPill v={d.transformability} /></DetailCell>
                  <DetailCell label="أولوية التحول"><LevelPill v={d.transformPriority} /></DetailCell>
                  <DetailCell label="جاهزية التحول">{d.readiness}</DetailCell>
                </DetailGrid>

                <DetailSecHead title="الأتمتة" />
                {(() => {
                  const cells = [
                    <DetailCell key="lvl" label="مستوى الأتمتة"><AutoLevel pct={d.automationPct} level={d.automationLevel} /></DetailCell>,
                    ...(d.automationSystem ? [<DetailCell key="sys" label="نظام الأتمتة">{d.automationSystem}</DetailCell>] : []),
                    ...(d.complexityLevel ? [<DetailCell key="cx" label="مستوى تعقيد الأتمتة"><LevelPill v={d.complexityLevel} /></DetailCell>] : []),
                  ];
                  return <DetailGrid cols={Math.min(3, cells.length)}>{cells}</DetailGrid>;
                })()}

                <DetailSecHead title="الجهة المعنية" />
                {(() => {
                  const cells = [
                    <DetailCell key="fed" tint label="الجهة الاتحادية المعنية" iconD={IC_BUILDING}>{d.itemEntityName}</DetailCell>,
                    ...(d.sector ? [<DetailCell key="sec" tint label="القطاع المعني" iconD={IC_TAG}>{d.sector}</DetailCell>] : []),
                    ...(d.dept ? [<DetailCell key="dept" tint label="الوحدة التنظيمية المعنية" iconD={IC_GRID}>{d.dept}</DetailCell>] : []),
                    ...(d.section ? [<DetailCell key="sect" tint label="القسم المعني" iconD={IC_PEOPLE}>{d.section}</DetailCell>] : []),
                  ];
                  return <DetailGrid cols={2} tint>{cells}</DetailGrid>;
                })()}
              </>
            )}

            {/* --- OUTCOMES for non-project types (entered in step 3) --- */}
            {!d.isProj && (d.expectedOutputs || d.expectedOutcomes || d.expectedImpact || !!d.targetPct || !!d.aiModels) && (
              <>
                <DetailSecHead title="النتائج المتوقعة" />
                {(d.expectedOutputs || d.expectedOutcomes) && (
                  <DetailGrid cols={d.expectedOutputs && d.expectedOutcomes ? 2 : 1}>
                    {d.expectedOutputs ? <DetailCell label="المخرجات المتوقعة"><RichTextView html={d.expectedOutputs} style={{ fontSize: 13, color: '#33415C', lineHeight: 1.7, fontWeight: 400 }} /></DetailCell> : null}
                    {d.expectedOutcomes ? <DetailCell label="النتائج المتوقعة"><RichTextView html={d.expectedOutcomes} style={{ fontSize: 13, color: '#33415C', lineHeight: 1.7, fontWeight: 400 }} /></DetailCell> : null}
                  </DetailGrid>
                )}
                {(() => {
                  const cells = [
                    ...(d.expectedImpact ? [<DetailCell key="imp" label="الأثر المتوقع"><RichTextView html={d.expectedImpact} style={valueStyle} /></DetailCell>] : []),
                    ...(d.aiModels ? [<DetailCell key="ai" label="نماذج الذكاء">{d.aiModels}</DetailCell>] : []),
                    ...(d.targetPct ? [<DetailCell key="pct" label="نسبة التحول">{d.targetPct}%</DetailCell>] : []),
                  ];
                  return cells.length ? <DetailGrid cols={Math.min(3, cells.length)}>{cells}</DetailGrid> : null;
                })()}
              </>
            )}

            {/* --- SERVICE --- */}
            {d.isSvc && (
              <>
                <DetailSecHead title="بيانات الخدمة" />
                <DetailGrid cols={2}>
                  <DetailCell label="مالك الخدمة">{d.serviceOwner}</DetailCell>
                  <DetailCell label="الفئة المستهدفة">{d.targetUsers}</DetailCell>
                </DetailGrid>

                <DetailSecHead title="رحلة المتعامل" />
                <DetailGrid cols={1}>
                  <DetailCell label="رحلة المتعامل الحالية"><RichTextView html={d.currentJourney} style={{ fontSize: 13, color: '#33415C', lineHeight: 1.7, fontWeight: 400 }} /></DetailCell>
                  <DetailCell label="نقاط الألم"><RichTextView html={d.painPoints} style={{ fontSize: 13, color: '#33415C', lineHeight: 1.7, fontWeight: 400 }} /></DetailCell>
                  <DetailCell label="التحسين المتوقع"><RichTextView html={d.expectedImprovement} style={{ fontSize: 13, color: '#33415C', lineHeight: 1.7, fontWeight: 400 }} /></DetailCell>
                </DetailGrid>
              </>
            )}
          </div>
          </div>

          <div style={{ display: 'contents' }}>
          {/* ===== EXECUTION PLAN (as entered by the coordinator) ===== */}
          {d.execBatchName && (
            <div style={sectionCard}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#13213C', marginBottom: 10 }}>
                خطة التنفيذ
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#EAF0FE',
                    color: '#2563EB',
                    borderRadius: 999,
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {d.execBatchName}
                </span>
                {d.execBatchPeriod && (
                  <span style={{ fontSize: 11.5, color: '#8A97AD', fontWeight: 700 }}>
                    {d.execBatchPeriod}
                  </span>
                )}
              </div>
              {d.subMilestones.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ ...labelStyle, marginBottom: 8 }}>المراحل الفرعية</div>
                  {d.subMilestones.map((sm, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        padding: '7px 0',
                        borderBottom: i < d.subMilestones.length - 1 ? '1px solid #F0F3F8' : 'none',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563EB', flex: 'none' }} />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#33405A', flex: 1 }}>{sm.name}</span>
                      <span style={{ fontSize: 11, color: '#9AA6BC', fontWeight: 700 }}>
                        {sm.startFmt} — {sm.endFmt}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>

          <div style={{ display: 'contents' }}>
          {/* ===== PLANNED LAUNCHES (read-only, pre-launch stages) ===== */}
          {!d.showLaunchView && d.plannedLaunches.length > 0 && (
            <div style={sectionCard}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#13213C', marginBottom: 10 }}>
                خطة الإطلاق
              </div>
              {d.plannedLaunches.map((l, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 0',
                    borderBottom: i < d.plannedLaunches.length - 1 ? '1px solid #F0F3F8' : 'none',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB', flex: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#13213C' }}>
                      {l.title}
                      {l.shared && (
                        <span
                          style={{
                            marginRight: 7,
                            background: '#E5EEFF',
                            color: '#2563EB',
                            borderRadius: 999,
                            padding: '2px 8px',
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        >
                          مشتركة
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#9AA6BC', fontWeight: 400, marginTop: 2 }}>
                      {l.ltype} · التسليم المتوقع {l.dateFmt}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>

          <div style={{ display: 'contents' }}>
          {/* ===== RECOMMENDATION ===== */}
          {d.showReco && (
            <>
              <div
                style={{
                  background: '#F5F8FD',
                  border: '1px solid #E1E9F5',
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#8A97AD',
                    marginBottom: 12,
                  }}
                >
                  توصية الذكاء الاصطناعي للتحول
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: d.scoreColor,
                      color: '#fff',
                      fontWeight: 900,
                      fontSize: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 'none',
                    }}
                  >
                    {d.scoreV}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: d.scoreColor }}>
                      {d.scoreLabel}
                    </div>
                    <div
                      style={{ fontSize: 12, color: '#54627B', lineHeight: 1.7, marginTop: 4 }}
                    >
                      {d.scoreExpl}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: '#13213C',
                    marginBottom: 12,
                  }}
                >
                  معايير التقييم
                </div>
                <div className="rgrid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  <div>
                    <div style={labelStyle}>الأولوية</div>
                    <div><LevelPill v={d.priority} /></div>
                  </div>
                  <div>
                    <div style={labelStyle}>مستوى التعقيد</div>
                    <div><LevelPill v={d.complexity} /></div>
                  </div>
                  <div>
                    <div style={labelStyle}>الأثر المتوقع</div>
                    <RichTextView html={d.expectedImpact} style={valueStyle} />
                  </div>
                </div>
              </div>
            </>
          )}
          </div>

          <div style={{ display: 'contents' }}>
          {/* ===== APPROVAL LOG ===== */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: '#13213C',
                marginBottom: 14,
              }}
            >
              سجل الاعتمادات والإجراءات
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {d.logRows.map((lg, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 10 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: lg.color,
                      marginTop: 4,
                      flex: 'none',
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1F2D49' }}>
                      {lg.action}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#9AA6BC', marginTop: 2 }}>{lg.sub}</div>
                    {lg.hasNote && (
                      <div
                        style={{
                          fontSize: 12,
                          color: '#54627B',
                          background: '#F7F9FD',
                          border: '1px solid #EBEFF6',
                          borderRadius: 10,
                          padding: '8px 10px',
                          marginTop: 6,
                          lineHeight: 1.6,
                        }}
                      >
                        {lg.note}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>

          <div style={{ display: 'contents' }}>
          {/* ===== SCOPE & BUDGET ===== */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: '#13213C',
                marginBottom: 14,
              }}
            >
              نطاق العمل والتكلفة المتوقعة
            </div>

            {/* Editable */}
            {d.canEditScope && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div
                    style={{ fontSize: 12, fontWeight: 400, color: '#54627B', marginBottom: 6 }}
                  >
                    نطاق العمل التفصيلي <span style={{ color: '#D23B45' }}>*</span>
                  </div>
                  <RichTextEditor
                    value={d.scopeOfWork}
                    onChange={(v) => d.onScopeWork(v)}
                    placeholder="صف نطاق العمل: المكوّنات، المخرجات، التكاملات، والاستثناءات"
                    minHeight={110}
                  />
                </div>
                <div>
                  <div
                    style={{ fontSize: 12, fontWeight: 400, color: '#54627B', marginBottom: 6 }}
                  >
                    الميزانية التقديرية
                  </div>
                  <input
                    value={d.budget}
                    onChange={(e) => d.onBudget(e.target.value)}
                    placeholder="مثال: 1,500,000 درهم"
                    style={{
                      width: '100%',
                      border: '1px solid #DCE3EE',
                      background: '#fff',
                      borderRadius: 11,
                      padding: '11px 13px',
                      fontSize: 13.5,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <div
                    style={{ fontSize: 12, fontWeight: 400, color: '#54627B', marginBottom: 6 }}
                  >
                    إرفاق مستند نطاق العمل
                  </div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1.5px dashed #CDD8EA',
                      background: '#FAFCFF',
                      borderRadius: 11,
                      padding: '18px 13px',
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: '#54627B',
                      cursor: 'pointer',
                    }}
                  >
                    {d.scopeFileLabel}
                    <input type="file" style={{ display: 'none' }} />
                  </label>
                </div>
                {d.showBudgetSubmit && (
                  <button
                    onClick={d.onSubmitScope}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(180deg,#2E74EE,#1F5FE0)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 12,
                      padding: '13px 20px',
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: 'pointer',
                      boxShadow: '0 10px 22px -10px rgba(37,99,235,.7)',
                    }}
                  >
                    إرسال الميزانية ونطاق العمل للاعتماد
                  </button>
                )}
              </div>
            )}

            {/* Pending input */}
            {d.scopePendingInput && (
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  background: '#F7F9FD',
                  border: '1px solid #EBEFF6',
                  borderRadius: 12,
                  padding: '13px 14px',
                }}
              >
                <div style={{ flex: 'none', marginTop: 1 }}>
                  <Icon d={CLOCK} size={20} color="#8A97AD" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1F2D49' }}>
                    بانتظار مراجعة رئيس المسار
                  </div>
                  <div style={{ fontSize: 12, color: '#8A97AD', lineHeight: 1.7, marginTop: 4 }}>
                    ستظهر تفاصيل نطاق العمل والتكلفة التقديرية بعد مراجعة رئيس المسار.
                  </div>
                </div>
              </div>
            )}

            {/* Read only */}
            {d.scopeReadOnly && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={labelStyle}>نطاق العمل التفصيلي</div>
                  <RichTextView html={d.scopeOfWork} style={{ fontSize: 13, color: '#54627B', lineHeight: 1.7 }} />
                </div>
                <div>
                  <div style={labelStyle}>الميزانية التقديرية</div>
                  <div style={valueStyle}>{d.budget}</div>
                </div>
                {d.hasScopeFile && (
                  <div>
                    <div style={labelStyle}>المستند المرفق</div>
                    <button
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        background: '#F7F9FD',
                        border: '1px solid #DCE3EE',
                        borderRadius: 11,
                        padding: '10px 13px',
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: '#2563EB',
                        cursor: 'pointer',
                      }}
                    >
                      <Icon d={DOWNLOAD} size={16} color="#2563EB" />
                      {d.scopeFile}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>

          <div style={{ display: 'contents' }}>
          {/* ===== SIMPLIFIED DELIVERY STATUS ===== */}
          {d.showExecView && !d.isAgentifiable && (
            <div style={{ background: '#fff', border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#13213C' }}>حالة التطوير</div>
              <div style={{ fontSize: 12, color: '#8A97AD', lineHeight: 1.7, marginTop: 6 }}>
                هذا البند غير قابل للتحول بالذكاء الاصطناعي — لا تنطبق عليه خطة إطلاق أو حالة تنفيذ.
              </div>
            </div>
          )}
          {d.showExecView && d.isAgentifiable && (
            <div style={{ background: '#fff', border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#13213C' }}>حالة التطوير</div>
              <div style={{ fontSize: 12, color: '#8A97AD', lineHeight: 1.7, margin: '6px 0 14px' }}>
                حدّدوا الحالة الحالية — قيد التطوير، ثم تم التطوير، وصولاً إلى تم الإطلاق.
              </div>
              <div
                style={{
                  display: 'flex',
                  background: '#F4F7FC',
                  border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)',
                  borderRadius: 12,
                  padding: 4,
                  gap: 4,
                }}
              >
                {[
                  { k: 'underDev', label: 'قيد التطوير' },
                  { k: 'developed', label: 'تم التطوير' },
                  { k: 'launched', label: 'تم الإطلاق' },
                ].map((st) => (
                  <button
                    key={st.k}
                    onClick={() => d.onSetStage(st.k)}
                    disabled={!d.canEditStage}
                    style={{
                      flex: 1,
                      border: 'none',
                      borderRadius: 9,
                      padding: '10px 8px',
                      fontWeight: d.devStage === st.k ? 800 : 400,
                      fontSize: 12.5,
                      cursor: d.canEditStage ? 'pointer' : 'default',
                      fontFamily: 'inherit',
                      background: d.devStage === st.k ? '#EAF1FE' : 'transparent',
                      color: d.devStage === st.k ? '#1D4ED8' : '#54627B',
                    }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>

        </div>

        {/* ---------- FOOTER ACTION BAR ---------- */}
        {(d.canApproveGateView || d.canEdit) && (
          <div
            style={{
              background: '#fff',
              borderTop: '1px solid #E7ECF4',
              padding: '13px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {d.canApproveGateView ? (
              <>
                {/* same sequence as the cards: اعتماد ← رفض ← طلب تفاصيل، والتعديل أخيراً */}
                <button
                  onClick={d.onApprove}
                  style={{ flex: 1, background: '#0B8A4B', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 20px', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  اعتماد
                </button>
                <button
                  onClick={d.onReject}
                  style={{ flex: 'none', background: '#fff', color: '#C0303B', border: '1px solid #F0C4C8', borderRadius: 12, padding: '13px 20px', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  رفض
                </button>
                <button
                  onClick={d.onReqInfo}
                  style={{ flex: 1, background: '#fff', color: '#33405A', border: '1px solid #E7ECF4', borderRadius: 12, padding: '13px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                  طلب تفاصيل إضافية
                </button>
                {d.showMenuEdit && (
                  <button
                    title="تعديل البيانات"
                    aria-label="تعديل البيانات"
                    onClick={d.onEdit}
                    style={{ width: 48, height: 48, flex: 'none', borderRadius: 12, border: '1px solid #E7ECF4', background: '#fff', color: '#54627B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" size={16} />
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={d.onEdit}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: 'linear-gradient(180deg,#2E74EE,#1F5FE0)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '13px 20px',
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: 'pointer',
                  boxShadow: '0 10px 22px -10px rgba(37,99,235,.7)',
                }}
              >
                <Icon d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" size={16} color="#fff" />
                {d.editLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

