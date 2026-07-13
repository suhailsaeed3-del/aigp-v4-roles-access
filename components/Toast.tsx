'use client';

export function Toast({ msg }: { msg: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 26,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 80,
        background: '#0F1F3D',
        color: '#fff',
        padding: '13px 22px',
        borderRadius: 13,
        fontSize: 13,
        fontWeight: 700,
        boxShadow: '0 18px 40px -16px rgba(2,12,35,.6)',
        animation: 'fadeUp .25s',
      }}
    >
      {msg}
    </div>
  );
}
