'use client';
import { useEffect } from 'react';

// Applies the global density zoom responsively. It lives in JS (not CSS)
// because the production CSS minifier collapses a `zoom` declaration inside a
// media query back into the unconditional base rule, so a CSS-only breakpoint
// can't reliably scale it down on small screens.
//   ≥1101px  → 1.15 (desktop density)
//   ≤1100    → 1    (tablet + phones: natural scale — zoom < 1 shrinks text
//                    and makes Chrome misplace native <select> popups)
export function ResponsiveZoom() {
  useEffect(() => {
    const apply = () => {
      const w = window.innerWidth;
      const z = w >= 1101 ? 1.15 : 1;
      // setProperty keeps it as an inline style that beats the stylesheet
      document.body.style.setProperty('zoom', String(z));
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);
  return null;
}
