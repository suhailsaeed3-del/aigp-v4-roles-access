// ============================================================================
// Rich-text helpers for the long-form fields (الوصف، نطاق العمل، الأثر…).
// The editors store a small HTML subset; everything that leaves the browser
// (Excel/PPT exports, card summaries) goes through stripHtml().
// ============================================================================

const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'DIV', 'P', 'SPAN']);

/** Keep only harmless formatting tags and drop every attribute. */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  if (typeof document === 'undefined') return html;
  const root = document.createElement('div');
  root.innerHTML = html;
  const walk = (node: Element) => {
    [...node.children].forEach((el) => {
      walk(el);
      [...el.attributes].forEach((a) => el.removeAttribute(a.name));
      if (!ALLOWED.has(el.tagName)) {
        const parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
    });
  };
  walk(root);
  return root.innerHTML;
}

/** Plain text for exports, cards and scoring: list items become lines. */
export function stripHtml(html: string): string {
  if (!html) return '';
  if (!/[<&]/.test(html)) return html;
  if (typeof document === 'undefined')
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const root = document.createElement('div');
  root.innerHTML = html
    .replace(/<\/(li|p|div)>/gi, '$&\n')
    .replace(/<br\s*\/?>/gi, '\n');
  return (root.textContent || '').replace(/ /g, ' ').replace(/\n{2,}/g, '\n').trim();
}

/** True when the stored value has no visible content (e.g. "<div><br></div>"). */
export function isRichEmpty(html: string): boolean {
  return stripHtml(html || '').length === 0;
}
