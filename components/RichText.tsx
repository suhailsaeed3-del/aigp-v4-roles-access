'use client';
// ---------------------------------------------------------------------------
// Lightweight rich-text editor for the long-form fields: bold / italic /
// underline / bullet & numbered lists. Stores a sanitized HTML subset.
// RichTextView renders stored values back with the same sanitizer.
// ---------------------------------------------------------------------------
import { useEffect, useRef, type CSSProperties } from 'react';
import { sanitizeHtml, isRichEmpty } from '@/lib/richtext';

const TOOLS: { cmd: string; title: string; render: React.ReactNode }[] = [
  { cmd: 'bold', title: 'غامق', render: <span style={{ fontWeight: 800 }}>B</span> },
  { cmd: 'italic', title: 'مائل', render: <span style={{ fontStyle: 'italic', fontWeight: 700 }}>I</span> },
  {
    cmd: 'underline',
    title: 'تسطير',
    render: <span style={{ textDecoration: 'underline', fontWeight: 700 }}>U</span>,
  },
  { cmd: 'insertUnorderedList', title: 'قائمة نقطية', render: <span style={{ fontWeight: 800 }}>•≡</span> },
  { cmd: 'insertOrderedList', title: 'قائمة مرقمة', render: <span style={{ fontWeight: 800 }}>١≡</span> },
];

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 110,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // sync external value in without stealing the caret while typing
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== (value || '') && document.activeElement !== el) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const html = isRichEmpty(el.innerHTML) ? '' : sanitizeHtml(el.innerHTML);
    onChange(html);
  };

  return (
    <div
      style={{
        border: '1px solid #E7ECF4',
        borderRadius: 12,
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 2,
          padding: '6px 8px',
          borderBottom: '1px solid #F0F3F8',
          background: '#FAFCFF',
        }}
      >
        {TOOLS.map((t) => (
          <button
            key={t.cmd}
            type="button"
            title={t.title}
            onMouseDown={(e) => {
              e.preventDefault(); // keep the selection inside the editor
              document.execCommand(t.cmd);
              emit();
            }}
            style={{
              width: 30,
              height: 28,
              border: 'none',
              borderRadius: 7,
              background: 'transparent',
              color: '#54627B',
              cursor: 'pointer',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#EDF2FA')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
          >
            {t.render}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        data-rte
        data-placeholder={placeholder || ''}
        dir="rtl"
        onInput={emit}
        onBlur={emit}
        style={{
          minHeight,
          padding: '11px 13px',
          fontSize: 13.5,
          fontWeight: 400,
          color: '#13213C',
          lineHeight: 1.8,
          outline: 'none',
        }}
        suppressContentEditableWarning
      />
    </div>
  );
}

export function RichTextView({ html, style }: { html?: string; style?: CSSProperties }) {
  return (
    <div
      className="rte-view"
      dir="rtl"
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html || '') }}
    />
  );
}
