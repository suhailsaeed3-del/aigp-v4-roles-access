'use client';
import type { CSSProperties } from 'react';
import type { VM } from '@/lib/viewModel';
import { PATHS } from '@/lib/domain';

export function TeamSetup({ vm }: { vm: VM }) {
  const s = vm.store;
  const step1 = vm.setupStep === 1;
  const step2 = vm.setupStep === 2;
  const s2color = step2 ? '#2563EB' : '#DCE3EE';

  const inputStyle: CSSProperties = {
    width: '100%',
    border: '1px solid #DCE3EE',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 13.5,
    outline: 'none',
  };
  const labelStyle: CSSProperties = {
    fontSize: 12.5,
    fontWeight: 400,
    color: '#54627B',
    display: 'block',
    marginBottom: 7,
  };
  const star = <span style={{ color: '#D23B45' }}>*</span>;

  const gradientBtn: CSSProperties = {
    background: 'linear-gradient(180deg,#2E74EE,#1F5FE0)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '13px 26px',
    fontWeight: 800,
    fontSize: 14,
    boxShadow: '0 10px 22px -10px rgba(37,99,235,.7)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  };

  return (
    <div
      data-screen-label="Team Setup"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#F7F9FD,#EEF2F9)',
        direction: 'rtl',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: '#fff',
          borderBottom: '1px solid #E7ECF4',
          padding: '13px 30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="assets/uae-crest.png" alt="United Arab Emirates" style={{ height: 72 }} />
          <div style={{ width: 1, height: 54, background: '#E7ECF4' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="assets/logo.png" alt="مشروع الذكاء الاصطناعي المساعد" style={{ height: 60 }} />
        </div>
      </div>

      {/* Body wrapper */}
      <div
        style={{
          maxWidth: 880,
          margin: '0 auto',
          padding: '32px 24px 64px',
          animation: 'fadeUp .45s ease both',
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '14px 0 8px' }}>تسجيل فريق العمل</h1>
        <p
          style={{
            color: '#8A97AD',
            fontSize: 13.5,
            fontWeight: 500,
            maxWidth: 560,
            lineHeight: 1.8,
          }}
        >
          عرّف الفريق المسؤول عن أعمال التحول بالذكاء الاصطناعي في جهتك.
        </p>

        {/* Stepper */}
        <div
          style={{
            maxWidth: 540,
            margin: '30px auto 26px',
            display: 'flex',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                fontWeight: 800,
                fontSize: 14,
                background: '#2563EB',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              1
            </div>
            <div
              style={{
                width: 130,
                fontSize: 12,
                fontWeight: 700,
                color: '#33405A',
                marginTop: 8,
              }}
            >
              ممثل الجهة
            </div>
          </div>
          <div
            style={{
              flex: 1,
              height: 2,
              background: s2color,
              margin: '18px 4px 0',
              borderRadius: 2,
            }}
          />
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                fontWeight: 800,
                fontSize: 14,
                background: s2color,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              2
            </div>
            <div
              style={{
                width: 130,
                fontSize: 12,
                fontWeight: 700,
                color: '#33405A',
                marginTop: 8,
              }}
            >
              مسؤولو المسارات
            </div>
          </div>
        </div>

        {/* Card container */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #E7ECF4',
            borderRadius: 20,
            padding: 30,
            boxShadow: '0 18px 40px -26px rgba(15,31,61,.4)',
          }}
        >
          {step1 && (
            <div style={{ animation: 'fadeUp .35s ease both' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#54627B', marginBottom: 7 }}>
                الجهة الحكومية
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#F4F7FC',
                  border: '1px solid #E1E7F1',
                  borderRadius: 12,
                  padding: '13px 15px',
                }}
              >
                <span style={{ fontWeight: 800, fontSize: 14, color: '#1F2D49' }}>
                  {vm.entityName}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#8A97AD',
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="11" width="16" height="9" rx="2" stroke="#8A97AD" strokeWidth="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#8A97AD" strokeWidth="2" />
                  </svg>
                  محدّدة تلقائياً
                </span>
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: '#9AA6BC',
                  marginTop: 8,
                  marginBottom: 24,
                }}
              >
                تُحدّد الجهة تلقائياً من ملفك في الهوية الرقمية ولا يمكن تغييرها.
              </div>

              <div style={{ fontSize: 14, fontWeight: 800, color: '#1F2D49', marginBottom: 14 }}>
                بيانات ممثل الجهة
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>الاسم الكامل {star}</label>
                  <input
                    style={inputStyle}
                    value={s.setup.rep.name}
                    onChange={(e) => s.updRep('name', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>المسمى الوظيفي</label>
                  <input
                    style={inputStyle}
                    value={s.setup.rep.position}
                    onChange={(e) => s.updRep('position', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>البريد الإلكتروني {star}</label>
                  <input
                    type="email"
                    style={{ ...inputStyle, direction: 'ltr', textAlign: 'right' }}
                    value={s.setup.rep.email}
                    onChange={(e) => s.updRep('email', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>رقم الهاتف {star}</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    style={{ ...inputStyle, direction: 'ltr', textAlign: 'right' }}
                    value={s.setup.rep.phone}
                    onChange={(e) => s.updRep('phone', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {PATHS.map((path) => {
                const owner = s.setup.owners[path.id];
                return (
                  <div
                    key={path.id}
                    style={{
                      border: '1px solid #E7ECF4',
                      borderRadius: 16,
                      padding: 16,
                      background: '#FBFCFE',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div
                          style={{
                            width: 10,
                            height: 38,
                            borderRadius: 6,
                            background: path.color,
                            flex: 'none',
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#1F2D49' }}>
                            {path.name}
                          </div>
                          <div
                            style={{
                              fontSize: 11.5,
                              color: '#9AA6BC',
                              maxWidth: 430,
                            }}
                          >
                            {path.desc}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 12,
                          marginTop: 14,
                        }}
                      >
                        <input
                          style={{
                            width: '100%',
                            border: '1px solid #DCE3EE',
                            background: '#fff',
                            borderRadius: 11,
                            padding: '11px 13px',
                            fontSize: 13,
                            outline: 'none',
                          }}
                          placeholder="الاسم الكامل *"
                          value={owner?.name || ''}
                          onChange={(e) => s.updOwner(path.id, 'name', e.target.value)}
                        />
                        <input
                          style={{
                            width: '100%',
                            border: '1px solid #DCE3EE',
                            background: '#fff',
                            borderRadius: 11,
                            padding: '11px 13px',
                            fontSize: 13,
                            outline: 'none',
                          }}
                          placeholder="المسمى الوظيفي"
                          value={owner?.position || ''}
                          onChange={(e) => s.updOwner(path.id, 'position', e.target.value)}
                        />
                        <input
                          type="tel"
                          inputMode="tel"
                          style={{
                            width: '100%',
                            border: '1px solid #DCE3EE',
                            background: '#fff',
                            borderRadius: 11,
                            padding: '11px 13px',
                            fontSize: 13,
                            outline: 'none',
                            direction: 'ltr',
                            textAlign: 'right',
                          }}
                          placeholder={'⁧رقم الهاتف *⁩'}
                          value={owner?.phone || ''}
                          onChange={(e) => s.updOwner(path.id, 'phone', e.target.value)}
                        />
                        <input
                          type="email"
                          style={{
                            width: '100%',
                            border: '1px solid #DCE3EE',
                            background: '#fff',
                            borderRadius: 11,
                            padding: '11px 13px',
                            fontSize: 13,
                            outline: 'none',
                            direction: 'ltr',
                            textAlign: 'right',
                          }}
                          placeholder="البريد الإلكتروني"
                          value={owner?.email || ''}
                          onChange={(e) => s.updOwner(path.id, 'email', e.target.value)}
                        />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Nav row */}
        <div
          style={{
            marginTop: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {step2 && (
              <button
                onClick={() => s.setSetupStep(1)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#fff',
                  border: '1px solid #DCE3EE',
                  borderRadius: 12,
                  padding: '13px 22px',
                  color: '#54627B',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 6l6 6-6 6" stroke="#54627B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                السابق
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => s.skipSetup()}
              style={{
                background: '#F4F7FC',
                border: '1px solid #E7ECF4',
                color: '#54627B',
                borderRadius: 12,
                padding: '13px 22px',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              أكمل لاحقاً
            </button>
            {step1 && (
              <button onClick={() => s.setSetupStep(2)} style={gradientBtn}>
                التالي
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M15 6l-6 6 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {step2 && (
              <button onClick={() => s.finishSetup()} style={gradientBtn}>
                اعتماد
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
