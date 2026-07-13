import type { Config } from 'tailwindcss';

// Design tokens lifted verbatim from the handoff spec so the whole app draws
// from one palette (blue + neutrals, colour reserved for statuses).
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Primary blue
        primary: {
          DEFAULT: '#2E74EE',
          600: '#1F5FE0',
          accent: '#2563EB',
        },
        // Navy banners / chrome
        navy: {
          DEFAULT: '#0F1F3D',
          banner: '#0B2A66',
          banner2: '#123f93',
          deep: '#071A40',
          deeper: '#04102A',
        },
        // Funded / approved green
        approve: {
          DEFAULT: '#0B8A4B',
          bg: '#E3F6EC',
        },
        // Basket teal (nomination accents)
        teal: {
          DEFAULT: '#0E7C86',
          bright: '#12A0AC',
          bg: '#DCF3F5',
        },
        // Status
        reject: { DEFAULT: '#C0303B', alt: '#D23B45' },
        pending: { DEFAULT: '#B45309' },
        // Neutrals / text
        ink: { DEFAULT: '#13213C', soft: '#33405A' },
        muted: {
          DEFAULT: '#54627B',
          2: '#8A97AD',
          3: '#9AA6BC',
        },
        line: { DEFAULT: '#E7ECF4', 2: '#DCE3EE' },
        surface: {
          DEFAULT: '#ffffff',
          2: '#F7F9FD',
          3: '#F1F4F9',
        },
        page: '#EEF2F9',
      },
      borderRadius: {
        card: '16px',
        inner: '13px',
        inner2: '14px',
        input: '11px',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'none' },
        },
        pulseGlow: {
          '0%,100%': { opacity: '.5' },
          '50%': { opacity: '1' },
        },
        spin: { to: { transform: 'rotate(360deg)' } },
        slideIn: {
          from: { transform: 'translateX(-40px)', opacity: '0' },
          to: { transform: 'none', opacity: '1' },
        },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideInRight: {
          from: { transform: 'translateX(40px)', opacity: '0' },
          to: { transform: 'none', opacity: '1' },
        },
      },
      animation: {
        fadeUp: 'fadeUp .5s ease both',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
        spin: 'spin 1s linear infinite',
        slideIn: 'slideIn .35s ease both',
        fadeIn: 'fadeIn .3s ease both',
        slideInRight: 'slideInRight .3s ease both',
      },
    },
  },
  plugins: [],
};

export default config;
