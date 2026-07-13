'use client';
// ---------------------------------------------------------------------------
// First-login onboarding tour: dims the page, spotlights one dashboard
// section at a time and explains it in a small card (with back/next and
// step dots). Shows once per browser (localStorage) and can be replayed
// from the «جولة تعريفية» button in the header, which dispatches the
// window event below.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

export type TourStep = { sel: string; title: string; desc: string };

const DONE_KEY = 'aihub_tour_v1';
export const TOUR_EVENT = 'aihub:tour';

type Rect = { top: number; left: number; width: number; height: number };

export function Tour({ steps }: { steps: TourStep[] }) {
  const [visible, setVisible] = useState<TourStep[]>([]);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const active = visible.length > 0;
  const step = visible[idx];
  const stepRef = useRef(step);
  stepRef.current = step;

  const start = useCallback(() => {
    // only tour the sections this role actually sees; steps with an empty
    // selector (e.g. the closing message) are always kept
    const present = steps.filter((st) => !st.sel || document.querySelector(st.sel));
    if (present.length === 0) return;
    setIdx(0);
    setRect(null);
    setVisible(present);
  }, [steps]);

  const stop = useCallback(() => {
    try {
      localStorage.setItem(DONE_KEY, '1');
    } catch {
      /* private mode */
    }
    setVisible([]);
    setRect(null);
  }, []);

  // first visit → auto start (after the dashboard has painted)
  useEffect(() => {
    let done = '1';
    try {
      done = localStorage.getItem(DONE_KEY) || '';
    } catch {
      /* private mode */
    }
    const t = done ? 0 : window.setTimeout(start, 900);
    const onEvent = () => start();
    window.addEventListener(TOUR_EVENT, onEvent);
    return () => {
      if (t) window.clearTimeout(t);
      window.removeEventListener(TOUR_EVENT, onEvent);
    };
  }, [start]);

  // scroll the target into view, then track its rect while the step is shown
  useEffect(() => {
    if (!active) return;
    const sel = stepRef.current.sel;
    if (!sel) { setRect(null); return; } // centered message step — no spotlight
    const el = document.querySelector(sel);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    let raf = 0;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const onMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    const t = window.setTimeout(measure, 420);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [active, idx]);

  if (!active) return null;
  const centered = !step.sel;
  if (!centered && !rect) return null;

  // the app body is scaled with CSS `zoom`; rects come back in visual pixels
  // while our fixed positioning is re-multiplied by that zoom — divide it out
  let z = 1;
  if (typeof document !== 'undefined') {
    const zv = parseFloat(getComputedStyle(document.body).zoom as string);
    if (zv && !isNaN(zv)) z = zv;
  }

  const last = idx === visible.length - 1;
  const pad = 8;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const cardW = Math.min(390, vw - 24);
  // card below the target when there is room, otherwise above it (centered step
  // has no target → sit the card in the middle of the screen)
  const below = centered ? true : rect!.top + rect!.height + pad + 200 < vh || rect!.top < 230;
  const cardTop = centered
    ? Math.max(12, vh / 2 - 120)
    : below
      ? Math.min(rect!.top + rect!.height + pad + 14, vh - 220)
      : Math.max(12, rect!.top - pad - 14 - 200);
  const cardLeft = centered
    ? Math.max(12, vw / 2 - cardW / 2)
    : Math.min(Math.max(12, rect!.left + rect!.width / 2 - cardW / 2), vw - cardW - 12);
  const arrowLeft = centered ? -100 : Math.min(Math.max(18, rect!.left + rect!.width / 2 - cardLeft - 7), cardW - 18);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, direction: 'rtl', zoom: 1 / z } as CSSProperties}>
      {/* click blocker (also dims the whole screen on the centered closing step) */}
      <div style={{ position: 'absolute', inset: 0, background: centered ? 'rgba(9,20,44,.52)' : 'transparent' }} onClick={(e) => e.stopPropagation()} />
      {/* spotlight (skipped on the centered closing step) */}
      {!centered && (
      <div
        style={{
          position: 'fixed',
          top: rect!.top - pad,
          left: rect!.left - pad,
          width: rect!.width + pad * 2,
          height: rect!.height + pad * 2,
          borderRadius: 16,
          boxShadow: '0 0 0 9999px rgba(9,20,44,.52)',
          border: '2px solid rgba(255,255,255,.85)',
          pointerEvents: 'none',
          transition: 'all .3s ease',
        }}
      />
      )}
      {/* card */}
      <div
        style={{
          position: 'fixed',
          top: cardTop,
          left: cardLeft,
          width: cardW,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 30px 70px -24px rgba(2,12,35,.6)',
          padding: '16px 18px 14px',
          transition: 'all .3s ease',
        }}
      >
        {/* arrow (hidden on the centered closing step) */}
        {!centered && (
        <div
          style={{
            position: 'absolute',
            left: arrowLeft,
            [below ? 'top' : 'bottom']: -7,
            width: 14,
            height: 14,
            background: '#fff',
            transform: 'rotate(45deg)',
            borderRadius: 3,
          }}
        />
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: '#13213C' }}>{step.title}</div>
          <div style={{ display: 'flex', gap: 5, flex: 'none' }}>
            {visible.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === idx ? 16 : 7,
                  height: 7,
                  borderRadius: 4,
                  background: i === idx ? '#2563EB' : '#D9E2F2',
                  transition: 'all .25s',
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: '#54627B', fontWeight: 400, lineHeight: 1.85, marginTop: 8 }}>
          {step.desc}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid #F0F3F8',
          }}
        >
          <button
            onClick={stop}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#9AA6BC',
              fontWeight: 700,
              fontSize: 11.5,
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: '7px 4px',
              visibility: last ? 'hidden' : 'visible',
            }}
          >
            تخطي الجولة
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {idx > 0 && (
              <button
                onClick={() => setIdx(idx - 1)}
                style={{
                  border: '1px solid #E7ECF4',
                  background: '#fff',
                  color: '#42506B',
                  borderRadius: 10,
                  padding: '8px 14px',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                السابق
              </button>
            )}
            <button
              onClick={() => (last ? stop() : setIdx(idx + 1))}
              style={{
                border: 'none',
                background: 'linear-gradient(180deg,#2E74EE,#1F5FE0)',
                color: '#fff',
                borderRadius: 10,
                padding: '8px 18px',
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 8px 18px -8px rgba(37,99,235,.7)',
              }}
            >
              {last ? 'إنهاء الجولة' : 'التالي'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
