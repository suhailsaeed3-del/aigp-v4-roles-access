'use client';
import React from 'react';
import type { VM } from '@/lib/viewModel';
import { RichTextEditor } from './RichText';
import { Icon } from './Icon';
import { LAUNCH_TYPES, typeLabel, pathById } from '@/lib/domain';
import { BULK_VERDICT_STYLE } from '@/lib/ai';

// ============================================================================
// Create wizard side-panel (§9) — faithful RTL reproduction of the prototype.
// ============================================================================

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #DCE3EE',
  backgroundColor: '#fff',
  borderRadius: 11,
  padding: '11px 13px',
  fontSize: 13.5,
  outline: 'none',
  fontFamily: 'inherit',
};
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 400,
  color: '#54627B',
  marginBottom: 6,
};
const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E7ECF4',
  borderRadius: 16,
  padding: 18,
  marginBottom: 14,
};

// icon path data (stroke SVGs)
const IC = {
  plus: 'M12 5v14M5 12h14',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevron: 'M15 18l-6-6 6-6',
  pencil: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  upload: 'M12 15V3M7 8l5-5 5 5M5 21h14',
  sparkle: 'M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.4L12 3Z',
  check: 'M20 6L9 17l-5-5',
  calendar: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  x: 'M18 6L6 18M6 6l12 12',
  warnTri: 'M12 9v4M12 17h.01M10.3 3.9L2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  infoCircle: 'M12 8h.01M11 12h1v4h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  download: 'M12 3v12M8 11l4 4 4-4M5 21h14',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  attach: 'M21.44 11.05 12 20.5a5 5 0 0 1-7-7l9.5-9.5a3.3 3.3 0 0 1 4.7 4.7L9.4 18.1a1.6 1.6 0 0 1-2.3-2.3l8.5-8.5',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  settings:
    'M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5 19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5 19 5M15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0',
};

export function CreatePanel({ vm }: { vm: VM }) {
  const m = vm.modal;
  const s = vm.store;
  const draft = m.draft;

  const setField = (k: string, v: unknown) => s.setDraftField(k as never, v);
  const gv = (k: string): string => (draft ? ((draft as unknown as Record<string, unknown>)[k] as string) ?? '' : '');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, direction: 'rtl' }}>
      {/* scrim */}
      <div
        onClick={() => s.closeModal()}
        style={{ position: 'absolute', inset: 0, background: 'rgba(8,18,40,.5)', animation: 'fadeIn .2s' }}
      />
      {/* panel */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: 580,
          maxWidth: '96vw',
          background: '#F7F9FD',
          boxShadow: '-24px 0 70px -24px rgba(2,12,35,.5)',
          animation: 'slideInRight .3s',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '15px 20px',
            background: '#fff',
            borderBottom: '1px solid #E7ECF4',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: 'linear-gradient(135deg,#2E74EE,#27C2F0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flex: 'none',
            }}
          >
            <Icon d={IC.plus} size={20} color="#fff" />
          </div>
          <div className="hd" style={{ flex: 1, fontSize: 15, fontWeight: 800, color: '#13213C' }}>{m.createTitle}</div>
          <button
            onClick={() => s.closeModal()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1px solid #E7ECF4',
              background: '#fff',
              color: '#54627B',
              cursor: 'pointer',
              fontSize: 16,
              fontFamily: 'inherit',
            }}
          >
            ✕
          </button>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {m.mStep === 'path' && <PathStep vm={vm} />}
          {m.mStep === 'type' && <TypeStep vm={vm} />}
          {m.mStep === 'method' && <MethodStep vm={vm} />}
          {m.mStep === 'form' && <FormStep vm={vm} setField={setField} gv={gv} />}
          {m.mStep === 'bulk' && <BulkStep vm={vm} />}
          {m.mStep === 'bulkReview' && <BulkReviewStep vm={vm} />}
          {m.mStep === 'done' && <DoneStep vm={vm} />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// STEP: PATH
function PathStep({ vm }: { vm: VM }) {
  const m = vm.modal;
  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px', color: '#13213C' }}>اختر المسار</h2>
      <p style={{ fontSize: 12.5, color: '#8A97AD', margin: '0 0 16px' }}>
        حدّد المسار الذي ستُضيف فيه.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {m.pathCards.map((p) => (
          <button
            key={p.id}
            onClick={p.onClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              width: '100%',
              textAlign: 'right',
              background: '#fff',
              border: '1px solid #E7ECF4',
              borderRadius: 14,
              padding: 14,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 11,
                background: `${p.color}1A`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
              }}
            >
              <Icon d={p.icon} size={20} color={p.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1F2D49' }}>{p.name}</div>
              <div style={{ fontSize: 11.5, color: '#9AA6BC', marginTop: 2 }}>{p.desc}</div>
            </div>
            <Icon d={IC.chevronLeft} size={18} color="#C3CDDE" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// STEP: TYPE
function TypeStep({ vm }: { vm: VM }) {
  const m = vm.modal;
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {m.typeCards.map((t) => (
          <button
            key={t.key}
            onClick={t.onClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              width: '100%',
              textAlign: 'right',
              background: '#fff',
              border: '1px solid #E7ECF4',
              borderRadius: 14,
              padding: 16,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 11,
                background: '#EAF0FE',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
              }}
            >
              <Icon d={IC.plus} size={20} color="#2563EB" />
            </div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: '#1F2D49' }}>
              إضافة {t.label}
            </div>
            <Icon d={IC.chevron} size={18} color="#C3CDDE" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// STEP: METHOD
function MethodStep({ vm }: { vm: VM }) {
  const s = vm.store;
  const optCard = (
    onClick: () => void,
    chipBg: string,
    chipColor: string,
    icon: string,
    title: string,
    desc: string
  ) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 13,
        width: '100%',
        textAlign: 'right',
        background: '#fff',
        border: '1px solid #E7ECF4',
        borderRadius: 14,
        padding: 16,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          background: chipBg,
          color: chipColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
        }}
      >
        <Icon d={icon} size={20} color={chipColor} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#1F2D49', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: '#9AA6BC', lineHeight: 1.7 }}>{desc}</div>
      </div>
    </button>
  );
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {optCard(
        () => s.chooseManual(),
        '#EAF0FE',
        '#2563EB',
        IC.pencil,
        'التعبئة اليدوية',
        'املأ النموذج بنفسك خطوة بخطوة ثم أرسله للاعتماد.'
      )}
      {optCard(
        () => s.chooseBulk(),
        '#E3F6EC',
        '#0B8A4B',
        IC.upload,
        'رفع المستند',
        'نزّل قالب خطة العمل، عبّئ عدّة صفوف دفعة واحدة، ثم ارفعه لاستيرادها ومراجعتها قبل الإرسال.'
      )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// STEP: FORM
function FormStep({
  vm,
  setField,
  gv,
}: {
  vm: VM;
  setField: (k: string, v: unknown) => void;
  gv: (k: string) => string;
}) {
  const m = vm.modal;
  const s = vm.store;
  const fStep = m.fStep;

  return (
    <div>
      {/* numbered stepper */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const completed = n < fStep;
          const current = n === fStep;
          const filled = completed || current;
          const label = m.fLabels[n - 1] || '';
          return (
            <div
              key={n}
              onClick={completed ? () => s.setFStep(n) : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                minWidth: 0,
                cursor: completed ? 'pointer' : 'default',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <span
                  style={{
                    flex: 1,
                    height: 2,
                    borderRadius: 2,
                    background: n > 1 ? (n <= fStep ? '#2563EB' : '#E1E7F1') : 'transparent',
                  }}
                />
                <span
                  style={{
                    width: 26,
                    height: 26,
                    flex: 'none',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11.5,
                    fontWeight: 800,
                    background: filled ? '#2563EB' : '#fff',
                    color: filled ? '#fff' : '#9AA6BC',
                    border: filled ? 'none' : '1.5px solid #DCE3EE',
                    boxShadow: current ? '0 0 0 4px rgba(37,99,235,.14)' : 'none',
                  }}
                >
                  {completed ? <Icon d={IC.check} size={14} color="#fff" strokeWidth={3} /> : n}
                </span>
                <span
                  style={{
                    flex: 1,
                    height: 2,
                    borderRadius: 2,
                    background: n < 5 ? (n < fStep ? '#2563EB' : '#E1E7F1') : 'transparent',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: current ? '#13213C' : completed ? '#42506B' : '#9AA6BC',
                  textAlign: 'center',
                  lineHeight: 1.35,
                  padding: '0 2px',
                }}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#13213C' }}>{m.fStepTitle}</div>
        <div style={{ fontSize: 12, color: '#8A97AD', marginTop: 2 }}>{m.fStepHint}</div>
      </div>

      {fStep === 1 && <F1 vm={vm} setField={setField} gv={gv} />}
      {fStep === 2 && <F2 vm={vm} setField={setField} gv={gv} />}
      {fStep === 3 && <FOutcome setField={setField} gv={gv} />}
      {fStep === 4 && <FBudget vm={vm} setField={setField} gv={gv} />}
      {fStep === 5 && <FPhases vm={vm} />}

      {/* form actions (sticky bottom) */}
      <div
        style={{
          position: 'sticky',
          bottom: -24,
          margin: '10px -24px -24px',
          padding: '20px 24px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg,rgba(247,249,253,0),#F7F9FD 30%)',
        }}
      >
        <button
          onClick={() => s.fPrev()}
          style={{
            background: '#fff',
            border: '1px solid #DCE3EE',
            borderRadius: 12,
            padding: '12px 18px',
            color: '#54627B',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          السابق
        </button>
        <div style={{ display: 'flex', gap: 9 }}>
          <button
            onClick={() => s.saveDraftOnly()}
            style={{
              background: '#EEF1F7',
              border: 'none',
              borderRadius: 12,
              padding: '12px 18px',
              color: '#54627B',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            حفظ كمسودة
          </button>
          <button
            onClick={() => s.fNext()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'linear-gradient(180deg,#2E74EE,#1F5FE0)',
              border: 'none',
              borderRadius: 11,
              padding: '11px 18px',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 10px 22px -10px rgba(37,99,235,.7)',
              fontFamily: 'inherit',
            }}
          >
            {m.fNextLabel}
            <Icon d={IC.chevronLeft} size={16} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

// F1 GENERAL
function F1({
  vm,
  setField,
  gv,
}: {
  vm: VM;
  setField: (k: string, v: unknown) => void;
  gv: (k: string) => string;
}) {
  const m = vm.modal;
  const disabledStyle: React.CSSProperties = { ...inputStyle, backgroundColor: '#F1F4F9', cursor: 'not-allowed' };
  return (
    <div style={cardStyle}>
      {m.mIsOp && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>نوع العملية <span style={{ color: '#D23B45' }}>*</span></label>
          <select value={gv('opType')} onChange={(e) => setField('opType', e.target.value)} style={inputStyle}>
            <option>العمليات التخصصية</option>
            <option>عمليات الدعم المؤسسي</option>
          </select>
        </div>
      )}

      {m.mIsProjectish && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>التصنيف <span style={{ color: '#D23B45' }}>*</span></label>
          <select
            value={gv('type') === 'initiative' ? 'مبادرة' : 'مشروع'}
            onChange={(e) => setField('type', e.target.value === 'مبادرة' ? 'initiative' : 'project')}
            style={inputStyle}
          >
            <option>مشروع</option>
            <option>مبادرة</option>
          </select>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>اسم {m.mTypeLabel} <span style={{ color: '#D23B45' }}>*</span></label>
        <input
          value={gv('title')}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="اكتب اسماً واضحاً"
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>وصف مختصر <span style={{ color: '#D23B45' }}>*</span></label>
        <RichTextEditor
          value={gv('desc')}
          onChange={(v) => setField('desc', v)}
          placeholder="نبذة موجزة عن النطاق والهدف"
          minHeight={110}
        />
      </div>

      {m.mIsOp && (
        <>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>الأنشطة الفرعية <span style={{ color: '#D23B45' }}>*</span></label>
            <RichTextEditor
              value={gv('subActivities')}
              onChange={(v) => setField('subActivities', v)}
              placeholder="مثال: استلام، تدقيق، إصدار"
              minHeight={96}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>الجهة الاتحادية المعنية</label>
              <input value={vm.entityName} disabled style={disabledStyle} />
            </div>
            <div>
              <label style={labelStyle}>القطاع المعني <span style={{ color: '#D23B45' }}>*</span></label>
              <input value={gv('sector')} onChange={(e) => setField('sector', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>الوحدة التنظيمية المعنية <span style={{ color: '#D23B45' }}>*</span></label>
              <input value={gv('dept')} onChange={(e) => setField('dept', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>القسم المعني <span style={{ color: '#D23B45' }}>*</span></label>
              <input value={gv('section')} onChange={(e) => setField('section', e.target.value)} style={inputStyle} />
            </div>
          </div>
        </>
      )}

      {m.mIsService && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>مالك الخدمة <span style={{ color: '#D23B45' }}>*</span></label>
            <input value={gv('serviceOwner')} onChange={(e) => setField('serviceOwner', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>الفئة المستهدفة <span style={{ color: '#D23B45' }}>*</span></label>
            <input value={gv('targetUsers')} onChange={(e) => setField('targetUsers', e.target.value)} style={inputStyle} />
          </div>
        </div>
      )}
    </div>
  );
}

// F2 DETAILED
function F2({
  vm,
  setField,
  gv,
}: {
  vm: VM;
  setField: (k: string, v: unknown) => void;
  gv: (k: string) => string;
}) {
  const m = vm.modal;
  const s = vm.store;
  const cardTitle: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: '#1F2D49', marginBottom: 14 };
  const rankBtn = (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>ترتيب الأولوية <span style={{ color: '#D23B45' }}>*</span></label>
      <button
        onClick={() => s.openRank()}
        style={{
          width: '100%',
          border: '1px solid #DCE3EE',
          background: '#fff',
          borderRadius: 11,
          padding: '11px 13px',
          fontSize: 13.5,
          fontWeight: 700,
          color: '#33405A',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          fontFamily: 'inherit',
        }}
      >
        <span>{m.rankBtnLabel}</span>
        <Icon d={IC.list} size={16} color="#8A97AD" />
      </button>
    </div>
  );
  const sel = (label: string, key: string, opts: string[]) => (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label} <span style={{ color: '#D23B45' }}>*</span></label>
      <select value={gv(key)} onChange={(e) => setField(key, e.target.value)} style={inputStyle}>
        {opts.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
  const range = (label: string, key: string) => (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label} <span style={{ color: '#D23B45' }}>*</span></label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Number(gv(key)) || 0}
          onChange={(e) => setField(key, Number(e.target.value))}
          style={{ flex: 1, accentColor: '#2563EB' }}
        />
        <span style={{ fontSize: 13, fontWeight: 800, color: '#2563EB', minWidth: 42, textAlign: 'left' }}>
          {Number(gv(key)) || 0}%
        </span>
      </div>
    </div>
  );

  return (
    <div>
      {!m.mIsOp && (
        <div style={cardStyle}>
          <div style={cardTitle}>التصنيف والأولوية</div>
          {sel('الأولوية', 'priority', ['عالية', 'متوسطة', 'منخفضة'])}
          {sel('مستوى التعقيد', 'complexity', ['عالٍ', 'متوسط', 'منخفض'])}
          {m.mIsProjectish
            ? sel(
                gv('type') === 'initiative' ? 'وضع المبادرة' : 'وضع المشروع',
                'status',
                gv('type') === 'initiative'
                  ? ['مبادرة جديدة', 'قيد التنفيذ', 'قائمة', 'مكتملة']
                  : ['مشروع جديد', 'قيد التنفيذ', 'قائم', 'مكتمل']
              )
            : sel('وضع الخدمة', 'status', ['خدمة جديدة', 'قيد التنفيذ', 'قائمة', 'مكتملة'])}
          {rankBtn}
        </div>
      )}

      {m.mIsOp && (
        <>
          <div style={cardStyle}>
            <div style={cardTitle}>تقييم التحول للمساعد الذكي</div>
            {sel('الأولوية', 'priority', ['عالية', 'متوسطة', 'منخفضة'])}
            {sel('مستوى التعقيد', 'complexity', ['عالٍ', 'متوسط', 'منخفض'])}
            {sel('وضع العملية', 'status', ['عملية جديدة', 'قيد التنفيذ', 'قائمة', 'مكتملة'])}
            {rankBtn}
            {sel('قابلية التحول', 'transformability', ['قابل كلياً', 'قابل جزئياً', 'غير قابل للتحول', 'أخرى'])}
            {sel('أولوية التحول', 'transformPriority', ['منخفضة', 'متوسطة', 'عالية'])}
            {range('جاهزية التحول', 'readiness')}
            {sel('مستوى الأثر المتوقع', 'impact', ['منخفض', 'متوسط', 'عالٍ'])}
          </div>
          <div style={cardStyle}>
            <div style={cardTitle}>معلومات الأتمتة</div>
            {range('نسبة الأتمتة الحالية', 'automationPct')}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>نظام الأتمتة المستخدم <span style={{ color: '#D23B45' }}>*</span></label>
              <input
                value={gv('automationSystem')}
                onChange={(e) => setField('automationSystem', e.target.value)}
                style={inputStyle}
              />
            </div>
            {sel('كثافة الاستخدام', 'usageIntensity', ['منخفضة', 'متوسطة', 'عالية'])}
            {sel('مستوى تعقيد الأتمتة', 'complexityLevel', ['منخفض', 'متوسط', 'عالٍ'])}
          </div>
        </>
      )}

      {m.mIsService && (
        <div style={cardStyle}>
          <div style={cardTitle}>تفاصيل الخدمة</div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>رحلة المتعامل / الخطوات الحالية <span style={{ color: '#D23B45' }}>*</span></label>
            <RichTextEditor
              value={gv('currentJourney')}
              onChange={(v) => setField('currentJourney', v)}
              minHeight={96}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>نقاط الألم <span style={{ color: '#D23B45' }}>*</span></label>
            <RichTextEditor
              value={gv('painPoints')}
              onChange={(v) => setField('painPoints', v)}
              minHeight={96}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>التحسين المتوقع <span style={{ color: '#D23B45' }}>*</span></label>
            <RichTextEditor
              value={gv('expectedImprovement')}
              onChange={(v) => setField('expectedImprovement', v)}
              placeholder="مثال: تقليل زمن الإصدار من 3 أيام إلى دقائق"
              minHeight={96}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>مستوى الأثر المتوقع <span style={{ color: '#D23B45' }}>*</span></label>
              <select value={gv('impact')} onChange={(e) => setField('impact', e.target.value)} style={inputStyle}>
                {['منخفض', 'متوسط', 'عالٍ'].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>تاريخ الانتهاء المتوقع <span style={{ color: '#D23B45' }}>*</span></label>
              <input
                type="date"
                value={gv('endDate')}
                onChange={(e) => setField('endDate', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// F-OUTCOME (step3)
function FOutcome({
  setField,
  gv,
}: {
  setField: (k: string, v: unknown) => void;
  gv: (k: string) => string;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>المخرجات المتوقعة <span style={{ color: '#D23B45' }}>*</span></label>
        <RichTextEditor
          value={gv('expectedOutputs')}
          onChange={(v) => setField('expectedOutputs', v)}
          placeholder="مثال: منصة موحّدة، تطبيق ذكي، لوحة تحكم"
          minHeight={96}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ ...labelStyle, minHeight: 38 }}>نسبة التحول المستهدفة باستخدام الذكاء الاصطناعي <span style={{ color: '#D23B45' }}>*</span></label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              border: '1px solid #E7ECF4',
              borderRadius: 12,
              backgroundColor: '#fff',
              padding: '0 14px',
              height: 46,
            }}
          >
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Number(gv('targetPct')) || 0}
              onChange={(e) => setField('targetPct', e.target.value)}
              style={{ flex: 1, accentColor: '#2563EB', cursor: 'pointer' }}
            />
            <span
              style={{
                flex: 'none',
                minWidth: 48,
                textAlign: 'center',
                fontSize: 13.5,
                fontWeight: 800,
                color: '#13213C',
                background: '#F0F4FB',
                borderRadius: 8,
                padding: '4px 8px',
              }}
            >
              {Number(gv('targetPct')) || 0}%
            </span>
          </div>
        </div>
        <div>
          <label style={{ ...labelStyle, minHeight: 38 }}>عدد نماذج وأنظمة الذكاء الاصطناعي المتوقعة <span style={{ color: '#D23B45' }}>*</span></label>
          <input
            type="number"
            min={0}
            value={gv('aiModels')}
            onChange={(e) => setField('aiModels', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>تاريخ الانتهاء المتوقع <span style={{ color: '#D23B45' }}>*</span></label>
          <input
            type="date"
            value={gv('endDate')}
            onChange={(e) => setField('endDate', e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  );
}

// F-BUDGET (step4)
function FBudget({
  vm,
  setField,
  gv,
}: {
  vm: VM;
  setField: (k: string, v: unknown) => void;
  gv: (k: string) => string;
}) {
  void vm;
  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>
          نطاق العمل التفصيلي <span style={{ color: '#D23B45' }}>*</span>
        </label>
        <RichTextEditor
          value={gv('scopeOfWork')}
          onChange={(v) => setField('scopeOfWork', v)}
          placeholder="صف نطاق العمل: المكوّنات، المخرجات، التكاملات، والاستثناءات"
          minHeight={130}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>
          الميزانية التقديرية
        </label>
        <input
          value={gv('budget')}
          onChange={(e) => setField('budget', e.target.value)}
          placeholder="مثال: 1,200,000 درهم"
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>المستند المرفق <span style={{ color: '#D23B45' }}>*</span></label>
        {gv('scopeFile') ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              border: '1px solid #DCE3EE',
              background: '#fff',
              borderRadius: 12,
              padding: '11px 13px',
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                flex: 'none',
                borderRadius: 9,
                background: '#E3F6EC',
                color: '#0B8A4B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon d={IC.file} size={18} color="#0B8A4B" />
            </span>
            <div style={{ flex: 1, fontSize: 12.5, color: '#1F2D49', fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {gv('scopeFile')}
            </div>
            <label
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                color: '#2563EB',
                cursor: 'pointer',
                padding: '5px 9px',
                borderRadius: 8,
              }}
            >
              تغيير
              <input
                type="file"
                onChange={(e) => setField('scopeFile', e.target.files?.[0]?.name || '')}
                style={{ display: 'none' }}
              />
            </label>
            <button
              onClick={() => setField('scopeFile', '')}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#FCEEEF',
                color: '#D23B45',
                border: 'none',
                cursor: 'pointer',
                flex: 'none',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              border: '1.5px dashed #CDD8EA',
              background: '#FAFCFF',
              borderRadius: 12,
              padding: '13px 15px',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                flex: 'none',
                borderRadius: 9,
                background: '#EAF0FE',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon d={IC.attach} size={18} color="#2563EB" />
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#54627B' }}>
              أرفق مستند نطاق العمل والميزانية (PDF)
            </span>
            <input
              type="file"
              onChange={(e) => setField('scopeFile', e.target.files?.[0]?.name || '')}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

// F-PHASES (step 5): pick the execution & launch batch only — launch plans
// are attached centrally via «إدارة خطط الإطلاق» or the dashboard bulk-assign
function FPhases({ vm }: { vm: VM }) {
  const m = vm.modal;
  const s = vm.store;
  const draft = m.draft;

  return (
    <div>
      {(draft?.transformability || '') === 'غير قابل' ? (
        <div style={cardStyle}>
          <div style={{ fontSize: 12.5, color: '#8A97AD', lineHeight: 1.8 }}>
            هذا البند غير قابل للتحول بالذكاء الاصطناعي — لا تنطبق عليه خطة إطلاق، ويمكنكم الإرسال للاعتماد مباشرة.
          </div>
        </div>
      ) : (
      <div style={cardStyle}>
        <label style={labelStyle}>
          اختر مرحلة التنفيذ <span style={{ color: '#D23B45' }}>*</span>
        </label>
        <select
          value={draft?.execBatch || ''}
          onChange={(e) => s.selectExecBatch(e.target.value)}
          style={inputStyle}
        >
          <option value="">اختر المرحلة…</option>
          {m.batchOptions.map((b) => (
            <option key={b.name} value={b.name}>
              {b.label}
            </option>
          ))}
        </select>
        <div style={{ fontSize: 11.5, color: '#9AA6BC', fontWeight: 400, marginTop: 7, lineHeight: 1.7 }}>
          حدّد مرحلة التنفيذ والإطلاق — يتم الربط بخطة إطلاق لاحقاً من صفحة
          «مراحل التنفيذ والإطلاق».
        </div>
      </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// STEP: BULK
function BulkStep({ vm }: { vm: VM }) {
  const s = vm.store;
  const m = vm.modal;
  return (
    <div>
      <div
        style={{
          background: '#FFF8EC',
          border: '1px solid #F6E2BD',
          color: '#8A6314',
          borderRadius: 12,
          padding: '12px 14px',
          fontSize: 12.5,
          fontWeight: 600,
          lineHeight: 1.7,
          marginBottom: 18,
        }}
      >
        استخدم قالب خطة العمل المرفق فقط — تُقرأ البيانات وتُعرض للمراجعة قبل الإرسال للاعتماد.
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: '#1F2D49', marginBottom: 10 }}>
          الخطوة ١ · تنزيل القالب
        </div>
        <a
          href="assets/workplan_template.xlsx"
          download="قالب_خطة_العمل.xlsx"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            justifyContent: 'center',
            border: '1.5px dashed #CDD8EA',
            background: '#FAFCFF',
            borderRadius: 12,
            padding: '14px',
            color: '#2563EB',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
            textDecoration: 'none',
            boxSizing: 'border-box',
          }}
        >
          <Icon d={IC.download} size={18} color="#2563EB" />
          قالب خطة العمل (Excel)
        </a>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: '#1F2D49', marginBottom: 10 }}>
          الخطوة ٢ · رفع الملف
        </div>
        <label
          style={{
            display: 'block',
            border: '1.5px dashed #CDD8EA',
            background: '#FAFCFF',
            borderRadius: 12,
            padding: '28px 14px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          <input
            type="file"
            accept=".xlsx"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const buf = await f.arrayBuffer();
              e.target.value = '';
              s.importWorkplan(buf);
            }}
          />
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1F2D49', marginBottom: 6 }}>
            اضغط لاختيار ملف خطة العمل
          </div>
          <div style={{ fontSize: 11.5, color: '#9AA6BC', lineHeight: 1.7 }}>
            ملف Excel بصيغة .xlsx بقالب خطة العمل — تُقرأ المشاريع والعمليات والخدمات وخطة الإطلاقات،
            وما ينقص يُستكمل يدوياً بعد الاستيراد.
          </div>
        </label>
      </div>

      <button
        onClick={() => s.mBack()}
        style={{
          background: '#fff',
          border: '1px solid #DCE3EE',
          borderRadius: 12,
          padding: '12px 20px',
          color: '#54627B',
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        الرجوع
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// STEP: BULK REVIEW
function BulkReviewStep({ vm }: { vm: VM }) {
  const m = vm.modal;
  const s = vm.store;

  const tile = (count: number, label: string, color: string, bg: string) => (
    <div style={{ flex: 1, background: bg, borderRadius: 14, padding: 14, textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{count}</div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color, marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: 'linear-gradient(135deg,#2E74EE,#1F5FE0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}
        >
          <Icon d={IC.settings} size={21} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#13213C' }}>مراجعة الصفوف المستوردة</div>
          <div style={{ fontSize: 11.5, color: '#9AA6BC' }}>تحقّق من الصفوف المقروءة من الملف قبل الإرسال للاعتماد</div>
        </div>
      </div>

      {m.bulkLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '40px 0' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: '3px solid #E1E7F1',
              borderTopColor: '#2563EB',
              animation: 'spin .8s linear infinite',
            }}
          />
          <div style={{ fontSize: 13, color: '#54627B', fontWeight: 700 }}>
            جارٍ مراجعة {m.bulkRows.length} صفوف بالذكاء الاصطناعي…
          </div>
        </div>
      )}

      {m.bulkLoaded && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {tile(m.bulkReadyCount, 'جاهز', '#0B8A4B', '#E3F6EC')}
            {tile(m.bulkReviewCount, 'بحاجة لمراجعة', '#B45309', '#FFF3DE')}
            {tile(m.bulkErrorCount, 'يوجد خطأ', '#D23B45', '#FCEEEF')}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {m.bulkRows.map((b, i) => {
              const st = BULK_VERDICT_STYLE[b._v || ''] || { bg: '#F1F4F9', c: '#54627B' };
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: '#fff',
                    border: '1px solid #E7ECF4',
                    borderRadius: 12,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#1F2D49' }}>
                        {b.title || 'بدون عنوان'}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#54627B',
                          background: '#F1F4F9',
                          borderRadius: 999,
                          padding: '2px 8px',
                          flex: 'none',
                        }}
                      >
                        {typeLabel(b.type || 'project')}
                      </span>
                      {b.path && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#54627B',
                            background: '#F1F4F9',
                            borderRadius: 999,
                            padding: '2px 8px',
                            flex: 'none',
                          }}
                        >
                          {pathById(b.path).name}
                        </span>
                      )}
                    </div>
                    {b._note && <div style={{ fontSize: 11.5, color: '#9AA6BC', marginTop: 2 }}>{b._note}</div>}
                  </div>
                  <span
                    style={{
                      background: st.bg,
                      color: st.c,
                      borderRadius: 999,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 800,
                      flex: 'none',
                    }}
                  >
                    {b._v}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              background: '#F4F7FC',
              border: '1px solid #E1E7F1',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 12,
              color: '#54627B',
              lineHeight: 1.7,
              marginBottom: 14,
            }}
          >
            سيتم إرسال الصفوف الجاهزة وبحاجة لمراجعة فقط. الصفوف التي بها أخطاء لن تُرسَل.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => s.mBack()}
              style={{
                background: '#fff',
                border: '1px solid #DCE3EE',
                borderRadius: 12,
                padding: '12px 20px',
                color: '#54627B',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              رجوع
            </button>
            <button
              onClick={() => s.submitBulk()}
              style={{
                background: 'linear-gradient(180deg,#0EA371,#0B8A4B)',
                border: 'none',
                borderRadius: 11,
                padding: '12px 20px',
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              الإرسال للاعتماد
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// STEP: DONE
function DoneStep({ vm }: { vm: VM }) {
  const s = vm.store;
  return (
    <div style={{ textAlign: 'center', padding: '30px 10px' }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: '#E3F6EC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
        }}
      >
        <Icon d={IC.check} size={34} color="#0B8A4B" strokeWidth={3} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#13213C', marginBottom: 8 }}>تم بنجاح</div>
      <p style={{ fontSize: 13, color: '#8A97AD', lineHeight: 1.8, maxWidth: 340, margin: '0 auto 24px' }}>
        تمت الإضافة والإرسال لاعتماد ممثل الجهة.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button
          onClick={() => s.openCreate()}
          style={{
            background: '#EAF0FE',
            border: '1px solid #D9E4FD',
            borderRadius: 11,
            padding: '12px 20px',
            color: '#2563EB',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          إضافة المزيد
        </button>
        <button
          onClick={() => s.closeModal()}
          style={{
            background: 'linear-gradient(180deg,#2E74EE,#1F5FE0)',
            border: 'none',
            borderRadius: 11,
            padding: '12px 20px',
            color: '#fff',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          العودة للوحة التحكم
        </button>
      </div>
    </div>
  );
}
