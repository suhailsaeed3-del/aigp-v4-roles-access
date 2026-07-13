'use client';
import { useState } from 'react';
import type { VM } from '@/lib/viewModel';
import { useStore } from '@/lib/store';

export function Login({ vm }: { vm: VM }) {
  const loginUaePass = useStore((s) => s.loginUaePass);
  const [hover, setHover] = useState(false);
  void vm;

  // Presentation default is a MOCK login that jumps straight into the flow.
  // Set NEXT_PUBLIC_UAEPASS_MODE=live to start the real UAE PASS OIDC flow.
  const onLogin = () => {
    if (process.env.NEXT_PUBLIC_UAEPASS_MODE === 'live') {
      const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
      window.location.href = `${base}/api/auth/uaepass/login`;
      return;
    }
    loginUaePass();
  };

  return (
    <div
      data-screen-label="Login"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        direction: 'rtl',
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(125% 125% at 50% 0%,#0B2A66 0%,#071A40 55%,#04102A 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.55,
          backgroundImage:
            'radial-gradient(circle at 80% 15%,rgba(39,194,240,.20),transparent 45%),radial-gradient(circle at 15% 85%,rgba(37,99,235,.22),transparent 45%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px)',
          backgroundSize: '46px 46px',
          maskImage: 'radial-gradient(110% 80% at 50% 30%,#000,transparent 75%)',
          WebkitMaskImage: 'radial-gradient(110% 80% at 50% 30%,#000,transparent 75%)',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 480,
          margin: 24,
          textAlign: 'center',
          animation: 'fadeUp .5s ease both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="assets/uae-crest.png" alt="United Arab Emirates" style={{ height: 140 }} />
          <div style={{ width: 1, height: 96, background: 'rgba(159,196,242,.35)' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="assets/logo-dark.png"
            alt="مشروع الذكاء الاصطناعي المساعد"
            style={{ height: 96 }}
          />
        </div>
        <p
          style={{
            color: '#AFC6E8',
            fontSize: 14,
            fontWeight: 500,
            margin: '40px auto 22px',
            lineHeight: 1.9,
            maxWidth: 410,
          }}
        >
          المنصة الحكومية لتخطيط ومتابعة مشروع الذكاء الاصطناعي المساعد.
        </p>
        <div
          style={{
            background: 'rgba(255,255,255,.08)',
            border: '1px solid rgba(255,255,255,.16)',
            borderRadius: 22,
            padding: '30px 26px',
            backdropFilter: 'blur(16px) saturate(140%)',
            WebkitBackdropFilter: 'blur(16px) saturate(140%)',
            boxShadow: '0 24px 60px -24px rgba(0,0,0,.5)',
            maxWidth: 420,
            margin: '0 auto',
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 22px', color: '#fff' }}>
            تسجيل الدخول
          </h1>
          <button
            onClick={onLogin}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
              direction: 'ltr',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 11,
              width: '100%',
              background: '#fff',
              border: '1.5px solid #DCE0E6',
              borderRadius: 14,
              padding: '13px 20px',
              cursor: 'pointer',
              transition: 'transform .15s,box-shadow .15s',
              transform: hover ? 'scale(1.015)' : 'none',
              boxShadow: hover
                ? '0 14px 32px -14px rgba(0,0,0,.5)'
                : '0 10px 28px -16px rgba(0,0,0,.45)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="assets/uaepass-finger.png"
              alt=""
              style={{ height: 26, maxHeight: 26, width: 'auto', display: 'block' }}
            />
            <span style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A', letterSpacing: '.2px' }}>
              Sign in with UAE PASS
            </span>
          </button>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 11.5,
          color: '#5E7BA8',
          fontWeight: 500,
          zIndex: 1,
        }}
      >
        © 2026 وزارة شؤون مجلس الوزراء، جميع الحقوق محفوظة
      </div>
    </div>
  );
}
