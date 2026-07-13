'use client';
import type { VM } from '@/lib/viewModel';
import { Icon } from './Icon';

const BASKET_ICON = 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z M3 6h18 M16 10a4 4 0 0 1-8 0';
const CHECK_ICON = 'M20 6 9 17l-5-5';

export function FundBar({ vm }: { vm: VM }) {
  if (!vm.fundBarShow) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 22,
        zIndex: 56,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: '#0F1F3D',
          color: '#fff',
          borderRadius: 16,
          padding: '12px 14px 12px 22px',
          boxShadow: '0 22px 55px -14px rgba(4,12,30,.6)',
          animation: 'fadeUp .2s',
          pointerEvents: 'auto',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 800 }}>المحدّد: {vm.fundSelCount}</span>
        <button
          onClick={() => vm.store.clearFundSel()}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,.28)',
            color: '#fff',
            borderRadius: 11,
            padding: '10px 20px',
            fontSize: 12.5,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          تخطي
        </button>
        <button
          onClick={() => vm.store.commitSelection()}
          style={{
            background: '#fff',
            color: '#0F1F3D',
            border: 'none',
            borderRadius: 11,
            padding: '10px 22px',
            fontSize: 12.5,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          {vm.fundBarActionLabel}
        </button>
      </div>
    </div>
  );
}

export function AssignBar({ vm }: { vm: VM }) {
  if (!vm.assignBar.show) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 22,
        zIndex: 56,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: '#0F1F3D',
          color: '#fff',
          borderRadius: 16,
          padding: '12px 14px 12px 22px',
          boxShadow: '0 22px 55px -14px rgba(4,12,30,.6)',
          animation: 'fadeUp .2s',
          pointerEvents: 'auto',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 800 }}>المحدّد: {vm.assignBar.count}</span>
        <button
          onClick={() => vm.store.clearAssignSel()}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,.28)',
            color: '#fff',
            borderRadius: 11,
            padding: '10px 20px',
            fontSize: 12.5,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          تخطي
        </button>
        <button
          onClick={() => vm.store.openAssign()}
          style={{
            background: '#fff',
            color: '#0F1F3D',
            border: 'none',
            borderRadius: 11,
            padding: '10px 22px',
            fontSize: 12.5,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          {vm.assignBar.actionLabel}
        </button>
      </div>
    </div>
  );
}

export function BasketDrawer({ vm }: { vm: VM }) {
  if (!vm.basketOpen) return null;
  const b = vm.basket;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-start' }}>
      <div onClick={() => vm.store.closeBasket()} style={{ position: 'absolute', inset: 0, background: 'rgba(8,16,38,.42)' }} />
      <div
        style={{
          position: 'relative',
          width: 460,
          maxWidth: '94vw',
          height: '100%',
          background: '#F7F9FD',
          boxShadow: '24px 0 60px -20px rgba(2,12,35,.5)',
          animation: 'slideIn .24s',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E7ECF4', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 38, height: 38, flex: 'none', borderRadius: 11, background: '#E5EEFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={BASKET_ICON} size={20} color="#2563EB" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="hd" style={{ fontSize: 15, fontWeight: 800, color: '#13213C' }}>{b.title}</div>
              <div style={{ fontSize: 11.5, color: '#9AA6BC', fontWeight: 400, lineHeight: 1.5, marginTop: 2 }}>{b.subtitle}</div>
            </div>
            <button
              onClick={() => vm.store.closeBasket()}
              style={{ width: 34, height: 34, flex: 'none', borderRadius: 10, border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', background: '#fff', color: '#54627B', fontSize: 16, fontWeight: 700, cursor: 'pointer', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
          {/* Tabs (with counts) */}
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            {b.tabs.map((t) => {
              const on = b.tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => vm.store.setBasketTab(t.id)}
                  style={{
                    flex: 1,
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 6px',
                    minHeight: 46,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    fontWeight: 800,
                    fontSize: 10.5,
                    lineHeight: 1.3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    background: on ? '#0F1F3D' : '#F1F5FB',
                    color: on ? '#fff' : '#54627B',
                  }}
                >
                  <span
                    style={{
                      minWidth: 17,
                      height: 17,
                      padding: '0 5px',
                      borderRadius: 9,
                      fontSize: 10.5,
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: on ? 'rgba(255,255,255,.22)' : '#E1E8F2',
                      color: on ? '#fff' : '#54627B',
                    }}
                  >
                    {t.count}
                  </span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 28px' }}>
          {b.items.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {b.items.map((it) => (
                <div key={it.id} style={{ background: '#fff', border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', borderRadius: 14, padding: 14 }}>
                  <div onClick={it.onOpen} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 11px', borderRadius: 999, background: '#EEF3FA', color: '#42506B' }}>
                        {it.typeLabel}
                      </span>
                      <span style={{ fontSize: 11.5, color: '#9AA6BC', fontWeight: 400 }}>
                        التكلفة <span style={{ fontWeight: 800, color: '#13213C' }}>{it.costLabel}</span>
                      </span>
                    </div>
                    <div className="hd" style={{ fontSize: 14, fontWeight: 800, color: '#13213C', lineHeight: 1.4, marginTop: 10 }}>{it.title}</div>
                    <div style={{ fontSize: 11.5, color: '#9AA6BC', fontWeight: 400, marginTop: 4 }}>{it.entity} · {it.pathName}</div>
                    {it.nomByLine && (
                      <div style={{ fontSize: 11.5, color: '#54627B', fontWeight: 700, marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563EB', flex: 'none' }} />
                        {it.nomByLine}
                      </div>
                    )}
                  </div>
                  {it.approved ? (
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#E7F7EE', color: '#0B8A4B', borderRadius: 11, padding: '11px 12px', fontSize: 12.5, fontWeight: 800 }}>
                      <Icon d={CHECK_ICON} size={16} color="#0B8A4B" />
                      تم اعتماده للتمويل
                    </div>
                  ) : b.isCommittee ? (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button
                        onClick={it.onApprove}
                        style={{ flex: 1, background: 'linear-gradient(180deg,#12B26F,#0B8A4B)', color: '#fff', border: 'none', borderRadius: 11, padding: '11px 12px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 22px -12px rgba(11,138,75,.6)' }}
                      >
                        اعتماد التمويل
                      </button>
                      <button
                        onClick={it.onDecline}
                        style={{ background: '#fff', color: '#DC2B38', border: '1px solid #F3D3D6', borderRadius: 11, padding: '11px 16px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}
                      >
                        رفض التمويل
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '5px 11px', borderRadius: 999, color: '#B45309', background: '#FFF3DE' }}>
                        بانتظار قرار اللجنة الوطنية
                      </span>
                      <button
                        onClick={it.onWithdraw}
                        style={{ background: '#fff', color: '#C0303B', border: '1px solid #E7ECF4', boxShadow: '0 6px 20px -10px rgba(16,36,79,.12)', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                      >
                        سحب الترشيح
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '60px 20px', color: '#9AA6BC' }}>
              <Icon d={b.activeIsApproved ? CHECK_ICON : BASKET_ICON} size={40} color="#C3CDDD" />
              <div style={{ fontSize: 13, fontWeight: 700 }}>{b.activeIsApproved ? 'لا توجد اعتمادات بعد' : 'لا توجد ترشيحات بعد'}</div>
            </div>
          )}
        </div>

        {/* Budget usage + total footer (committee) */}
        {b.showBudget && (
          <div style={{ background: '#fff', borderTop: '1px solid #E7ECF4', padding: '16px 18px 26px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#6B7A93', fontWeight: 400 }}>الميزانية المعتمدة</span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: '#13213C' }}>{b.budget.approvedLabel}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#6B7A93', fontWeight: 400 }}>المتبقي</span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: '#13213C' }}>{b.budget.remainingLabel}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#6B7A93', fontWeight: 400 }}>نسبة الاستخدام</span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: '#2563EB' }}>{b.budget.pct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: '#EEF1F6', overflow: 'hidden' }}>
                <div style={{ width: `${b.budget.pct}%`, height: '100%', background: '#2563EB', borderRadius: 999, transition: 'width .4s ease' }} />
              </div>
            </div>
            <div style={{ borderTop: '1px dashed #E1E8F2', marginTop: 14, paddingTop: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span className="hd" style={{ color: '#13213C', fontSize: 12.5, fontWeight: 800 }}>إجمالي تكلفة التمويل المعتمد</span>
              <span style={{ color: '#2563EB', fontSize: 15, fontWeight: 800 }}>{b.fundedTotalLabel}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
