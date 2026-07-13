import { stripHtml } from './richtext';
// ============================================================================
// Real client-side Excel (.xlsx) and PowerPoint (.pptx) export of the item
// list — replaces the prototype's CDN SheetJS / PptxGenJS with bundled deps.
// Libraries are dynamically imported so they stay out of the initial bundle.
// ============================================================================
import { type Item, typeLabel, pathById, wfMeta, transformScore, stageWeight, entOf, parseBudget, formatMoney, execMilestones, isEntityApproved, isProjInit } from './domain';

const argb = (hex: string) => 'FF' + hex.replace('#', '').toUpperCase();
const today = () => new Date().toLocaleDateString('ar-AE', { year: 'numeric', month: 'long', day: 'numeric' });

function row(i: Item, entityName: string) {
  return {
    النوع: typeLabel(i.type),
    العنوان: i.title,
    المسار: pathById(i.path).name,
    الجهة: entOf(i, entityName),
    الحالة: wfMeta(i).label,
    الأولوية: i.priority || '',
    الميزانية: i.budget || '',
    'نطاق العمل': stripHtml(i.scopeOfWork || ''),
    'نسبة الإنجاز': stageWeight(i) + '%',
    'درجة التحول': transformScore(i).v,
    'تمويل اللجنة': i.funded ? 'نعم' : 'لا',
  };
}

// ---- shared workbook styling (government-report look) ----------------------
const BRAND = 'FF1D4ED8'; // primary blue
const BRAND_DARK = 'FF0F1F3D';
const HEAD_TXT = 'FFFFFFFF';
const ZEBRA = 'FFF6F9FD';
const BORDER = 'FFE2E8F2';
const NOTE_BG = 'FFEAF1FE';

type XLWorksheet = import('exceljs').Worksheet;
type XLColor = { argb: string };

const thin = (c: string) => ({ style: 'thin' as const, color: { argb: c } });
function boxAll(ws: XLWorksheet, r1: number, r2: number, cols: number) {
  for (let r = r1; r <= r2; r++)
    for (let c = 1; c <= cols; c++) {
      const cell = ws.getCell(r, c);
      cell.border = { top: thin(BORDER), bottom: thin(BORDER), left: thin(BORDER), right: thin(BORDER) };
    }
}
// Title banner + subtitle across `cols`, returns the next free row.
function banner(ws: XLWorksheet, cols: number, title: string, subtitle: string) {
  ws.mergeCells(1, 1, 1, cols);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
  t.alignment = { horizontal: 'right', vertical: 'middle' };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } as XLColor };
  ws.getRow(1).height = 30;
  ws.mergeCells(2, 1, 2, cols);
  const sub = ws.getCell(2, 1);
  sub.value = subtitle;
  sub.font = { size: 10.5, color: { argb: 'FF54627B' } };
  sub.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(2).height = 18;
  return 3;
}
function headerRow(ws: XLWorksheet, rowIdx: number, headers: string[], widths: number[]) {
  headers.forEach((h, i) => {
    ws.getColumn(i + 1).width = widths[i] || 16;
    const cell = ws.getCell(rowIdx, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: HEAD_TXT }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } as XLColor };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { top: thin(BRAND), bottom: thin(BRAND), left: thin('FFFFFFFF'), right: thin('FFFFFFFF') };
  });
  ws.getRow(rowIdx).height = 24;
}

// The report follows the official workplan template (public/assets/
// workplan_template.xlsx) that entities already know: the same sheets and
// sections, filled with the live data. Falls back to the styled report
// workbook if the template asset cannot be fetched.
export async function exportExcel(items: Item[], entityName: string) {
  const mod = await import('exceljs');
  const ExcelJS = (mod as { default?: typeof import('exceljs') }).default || mod;
  try {
    const res = await fetch((process.env.NEXT_PUBLIC_BASE_PATH || '') + '/assets/workplan_template.xlsx');
    if (!res.ok) throw new Error('template fetch failed');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await res.arrayBuffer());
    fillWorkplan(wb, items, entityName);
    const buf = await wb.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      'تقرير_المدخلات.xlsx'
    );
  } catch {
    await exportExcelStyled(items, entityName);
  }
}

// Fill the 8 template sections from the live items (RTL sheets, layout kept).
function fillWorkplan(wb: import('exceljs').Workbook, items: Item[], entityName: string) {
  const put = (ws: XLWorksheet | undefined, r: number, c: number, v: string | number) => {
    if (!ws) return;
    if (v !== '' && v != null) ws.getCell(r, c).value = v;
  };
  const wrap = (ws: XLWorksheet | undefined, r: number, c: number) => {
    if (ws) ws.getCell(r, c).alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
  };

  // 1) المعلومات العامة
  const info = wb.getWorksheet('المعلومات العامة');
  const streams = [...new Set(items.map((i) => pathById(i.path).name))].join('، ');
  put(info, 4, 2, streams);
  put(info, 7, 2, entityName);
  const ms = execMilestones();
  put(info, 8, 2, ms[0]?.start || '');
  put(info, 9, 2, ms[ms.length - 1]?.end || '');

  // 2) المشاريع القائمة وقيد التنفيذ · 3) المشاريع الجديدة
  const projs = items.filter((i) => isProjInit(i.type));
  const existing = projs.filter((i) => isEntityApproved(i));
  const fresh = projs.filter((i) => !isEntityApproved(i));
  const cur = wb.getWorksheet('المشاريع القائمة');
  existing.forEach((i, k) => {
    const r = 4 + k;
    put(cur, r, 1, k + 1);
    put(cur, r, 2, i.title);
    put(cur, r, 3, stripHtml(i.desc || ''));
    put(cur, r, 4, i.expectedOutputs || '');
    put(cur, r, 5, i.endDate || '');
    put(cur, r, 6, wfMeta(i).label);
    put(cur, r, 7, pathById(i.path).name);
    wrap(cur, r, 3); wrap(cur, r, 4);
  });
  const nw = wb.getWorksheet('المشاريع الجديدة');
  fresh.forEach((i, k) => {
    const r = 4 + k;
    put(nw, r, 1, k + 1);
    put(nw, r, 2, i.title);
    put(nw, r, 3, stripHtml(i.desc || ''));
    put(nw, r, 4, i.expectedOutputs || '');
    put(nw, r, 5, i.expectedImpact || '');
    put(nw, r, 6, pathById(i.path).name);
    wrap(nw, r, 3); wrap(nw, r, 4);
  });

  // 4) العمليات والدعم المؤسسي — العمليات والخدمات معًا (نفس أعمدة القالب)
  const ops = items.filter((i) => i.type === 'operation' || i.type === 'service');
  const op = wb.getWorksheet('العمليات والدعم المؤسسي');
  ops.forEach((i, k) => {
    const r = 4 + k;
    put(op, r, 1, k + 1);
    put(op, r, 2, i.title);
    put(op, r, 3, i.opType || typeLabel(i.type));
    put(op, r, 4, i.subActivities || '');
    put(op, r, 6, i.sector || '');
    put(op, r, 7, i.dept || '');
    put(op, r, 8, i.section || '');
    put(op, r, 9, i.automationLevel || '');
    put(op, r, 10, i.automationPct != null ? i.automationPct + '%' : '');
    put(op, r, 11, i.automationSystem || '');
    put(op, r, 12, i.usageIntensity || '');
    put(op, r, 14, i.transformability || '');
    put(op, r, 15, i.readiness != null ? String(i.readiness) : '');
    put(op, r, 16, i.transformPriority || '');
    put(op, r, 17, i.impact || '');
    put(op, r, 18, i.complexityLevel || i.complexity || '');
    put(op, r, 19, pathById(i.path).name);
  });

  // 5) المستهدفات والنتائج — مجمّعة من مدخلات الجهة
  const tg = wb.getWorksheet('المستهدفات والنتائج');
  const outputs = items.map((i) => i.expectedOutputs).filter(Boolean).slice(0, 8);
  const outcomes = items.map((i) => i.expectedOutcomes).filter(Boolean).slice(0, 8);
  if (outputs.length) { put(tg, 4, 1, outputs.map((o) => '• ' + o).join('\n')); wrap(tg, 4, 1); if (tg) tg.getRow(4).height = Math.min(120, 16 * outputs.length + 6); }
  if (outcomes.length) { put(tg, 7, 1, outcomes.map((o) => '• ' + o).join('\n')); wrap(tg, 7, 1); if (tg) tg.getRow(7).height = Math.min(120, 16 * outcomes.length + 6); }
  const models = items.reduce((a, i) => a + (i.aiModels || 0), 0);
  const targets = items.map((i) => i.targetPct).filter((v): v is number => v != null);
  put(tg, 9, 2, models || '');
  put(tg, 10, 2, targets.length ? Math.round(targets.reduce((a, b) => a + b, 0) / targets.length) + '%' : '');

  // 6) البرنامج الزمني — أنشطة كل مرحلة من المدخلات المخطط لها
  const sch = wb.getWorksheet('البرنامج الزمني');
  ms.forEach((b, k) => {
    const inBatch = items.filter((i) => i.execBatch === b.name);
    if (!inBatch.length) return;
    const r = 4 + k;
    put(sch, r, 3, inBatch.map((i) => i.title).join('، '));
    put(sch, r, 4, b.start || '');
    put(sch, r, 5, b.end || '');
    wrap(sch, r, 3);
  });

  // 7) الإطلاقات — من إطلاقات المدخلات (بدون تكرار)
  const la = wb.getWorksheet('الإطلاقات');
  const seen = new Set<string>();
  let n = 0;
  items.forEach((i) =>
    (i.launches || []).forEach((l) => {
      const key = (l.title || '') + '|' + (l.date || '');
      if (!(l.title || '').trim() || seen.has(key)) return;
      seen.add(key);
      n++;
      const r = 3 + n;
      put(la, r, 1, n);
      put(la, r, 2, l.date || '');
      put(la, r, 3, l.title + (l.desc ? ' — ' + l.desc : ''));
      wrap(la, r, 3);
    })
  );

  // the report doesn't carry the team-entry section — drop the sheet
  const team = wb.getWorksheet('فريق العمل');
  if (team) wb.removeWorksheet(team.id);

  // ---- layout pass: sized columns, styled headers, borders -------------------
  // The raw template ships with default column widths; make every sheet read
  // like a finished report while keeping its structure untouched.
  const layout: Record<string, { widths: number[]; headerRow?: number; dataRows?: number }> = {
    'المعلومات العامة': { widths: [30, 60] },
    'المشاريع القائمة': { widths: [5, 30, 44, 34, 15, 20, 24], headerRow: 3, dataRows: existing.length },
    'المشاريع الجديدة': { widths: [5, 30, 44, 34, 34, 24], headerRow: 3, dataRows: fresh.length },
    'العمليات والدعم المؤسسي': { widths: [5, 30, 18, 30, 14, 18, 22, 16, 15, 12, 18, 15, 14, 15, 15, 14, 16, 14, 24, 28], headerRow: 3, dataRows: ops.length },
    'المستهدفات والنتائج': { widths: [50, 26] },
    'البرنامج الزمني': { widths: [40, 26, 60, 13, 13], headerRow: 3, dataRows: ms.length },
    'الإطلاقات': { widths: [5, 15, 80], headerRow: 3, dataRows: n },
  };
  for (const [name, cfg] of Object.entries(layout)) {
    const ws = wb.getWorksheet(name);
    if (!ws) continue;
    cfg.widths.forEach((w, c) => (ws.getColumn(c + 1).width = w));
    // section title (row 1)
    const t = ws.getCell(1, 1);
    t.font = { bold: true, size: 13, color: { argb: BRAND_DARK } };
    // header row: brand blue, white bold, centered + wrapped
    if (cfg.headerRow) {
      const hr = ws.getRow(cfg.headerRow);
      for (let c = 1; c <= cfg.widths.length; c++) {
        const cell = hr.getCell(c);
        if (cell.value == null || String(cell.value).trim() === '') continue;
        cell.font = { bold: true, size: 10.5, color: { argb: HEAD_TXT } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } as XLColor };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: thin(BRAND), bottom: thin(BRAND), left: thin('FFFFFFFF'), right: thin('FFFFFFFF') };
      }
      hr.height = 30;
      // data rows: wrapped, top-aligned, bordered, zebra
      const first = cfg.headerRow + 1;
      const last = cfg.headerRow + Math.max(cfg.dataRows || 0, 0);
      for (let r = first; r <= last; r++) {
        for (let c = 1; c <= cfg.widths.length; c++) {
          const cell = ws.getCell(r, c);
          const horiz = c === 1 ? 'center' : 'right';
          cell.alignment = { horizontal: horiz, vertical: 'top', wrapText: true };
          cell.border = { top: thin(BORDER), bottom: thin(BORDER), left: thin(BORDER), right: thin(BORDER) };
          if ((r - first) % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } as XLColor };
        }
      }
      ws.views = [{ rightToLeft: true, state: 'frozen', ySplit: cfg.headerRow }];
    }
  }
  // المعلومات العامة: label column as light chips
  if (info) {
    for (const r of [4, 7, 8, 9, 10, 11, 12]) {
      const lc = info.getCell(r, 1);
      lc.font = { bold: true, size: 10.5, color: { argb: 'FF33405A' } };
      lc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F5FA' } as XLColor };
      lc.border = { top: thin(BORDER), bottom: thin(BORDER), left: thin(BORDER), right: thin(BORDER) };
      const vc = info.getCell(r, 2);
      vc.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
      vc.border = { top: thin(BORDER), bottom: thin(BORDER), left: thin(BORDER), right: thin(BORDER) };
    }
    info.getCell(6, 1).font = { bold: true, size: 12, color: { argb: BRAND } };
  }
  // المستهدفات والنتائج: bold section labels
  if (tg) {
    for (const r of [3, 6, 9, 10]) {
      tg.getCell(r, 1).font = { bold: true, size: 11, color: { argb: 'FF33405A' } };
    }
  }
}

// Fallback: the styled standalone report workbook (summary + detailed table).
async function exportExcelStyled(items: Item[], entityName: string) {
  const mod = await import('exceljs');
  const ExcelJS = (mod as { default?: typeof import('exceljs') }).default || mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'منصة التحول للذكاء الاصطناعي المساعد';

  // ---- sheet 1: الملخص — mirrors the PPT summary slide -----------------------
  const sm = wb.addWorksheet('الملخص', { views: [{ rightToLeft: true, showGridLines: false }] });
  {
    const totalBudget = items.reduce((a, i) => a + parseBudget(i.budget), 0);
    const avgDone = items.length ? Math.round(items.reduce((a, i) => a + stageWeight(i), 0) / items.length) : 0;
    for (let c = 1; c <= 9; c++) sm.getColumn(c).width = 15;
    banner(sm, 9, 'منصة التحول للذكاء الاصطناعي المساعد — ملخص المدخلات', `الجهة: ${entityName}  ·  ${today()}`);

    // KPI cards: big value + label, styled like the dashboard cards
    const kpis: [string, string][] = [
      ['إجمالي المدخلات', String(items.length)],
      ['معتمدة للتمويل', String(items.filter((i) => i.funded).length)],
      ['إجمالي الميزانية', totalBudget ? formatMoney(totalBudget) : '—'],
      ['متوسط نسبة الإنجاز', avgDone + '%'],
    ];
    const kSpans: [number, number][] = [[1, 2], [3, 4], [5, 6], [7, 8]];
    sm.getRow(4).height = 34;
    sm.getRow(5).height = 20;
    kpis.forEach(([label, value], k) => {
      const [c1, c2] = kSpans[k];
      sm.mergeCells(4, c1, 4, c2);
      sm.mergeCells(5, c1, 5, c2);
      const v = sm.getCell(4, c1);
      v.value = value;
      v.font = { bold: true, size: k === 2 ? 14 : 20, color: { argb: k === 2 ? 'FF1D4ED8' : 'FF13213C' } };
      v.alignment = { horizontal: 'center', vertical: 'middle' };
      const l = sm.getCell(5, c1);
      l.value = label;
      l.font = { size: 10.5, color: { argb: 'FF54627B' } };
      l.alignment = { horizontal: 'center', vertical: 'middle' };
      for (const r of [4, 5])
        for (let c = c1; c <= c2; c++) {
          sm.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } as XLColor };
          sm.getCell(r, c).border = {
            top: r === 4 ? thin(BORDER) : undefined,
            bottom: r === 5 ? thin(BORDER) : undefined,
            left: c === c1 ? thin(BORDER) : undefined,
            right: c === c2 ? thin(BORDER) : undefined,
          };
        }
    });

    // distribution tables: by type (right) + by status (left)
    const countBy = (f: (i: Item) => string) => {
      const m = new Map<string, number>();
      items.forEach((i) => m.set(f(i), (m.get(f(i)) || 0) + 1));
      return [...m.entries()];
    };
    const dist = (c1: number, titleTxt: string, rows: [string, number][]) => {
      const c2 = c1 + 2;
      sm.mergeCells(7, c1, 7, c2);
      const h = sm.getCell(7, c1);
      h.value = titleTxt;
      h.font = { bold: true, size: 11.5, color: { argb: 'FF54627B' } };
      h.alignment = { horizontal: 'right', vertical: 'middle' };
      rows.forEach(([k, n], j) => {
        const r = 8 + j;
        sm.mergeCells(r, c1, r, c2 - 1);
        const kc = sm.getCell(r, c1);
        kc.value = k;
        kc.font = { size: 10.5, color: { argb: 'FF16233F' } };
        kc.alignment = { horizontal: 'right', vertical: 'middle' };
        const nc = sm.getCell(r, c2);
        nc.value = n;
        nc.font = { bold: true, size: 10.5, color: { argb: 'FF1D4ED8' } };
        nc.alignment = { horizontal: 'center', vertical: 'middle' };
        for (let c = c1; c <= c2; c++)
          sm.getCell(r, c).border = { top: thin(BORDER), bottom: thin(BORDER), left: thin(BORDER), right: thin(BORDER) };
        sm.getRow(r).height = 20;
      });
    };
    dist(1, 'التوزيع حسب النوع', countBy((i) => typeLabel(i.type)));
    dist(5, 'التوزيع حسب الحالة', countBy((i) => wfMeta(i).label));
  }

  // ---- sheet 2: المدخلات — the detailed table --------------------------------
  const ws = wb.addWorksheet('المدخلات', { views: [{ rightToLeft: true, showGridLines: false }] });

  const headers = Object.keys(row(items[0] || ({} as Item), entityName));
  const widths = [16, 38, 24, 26, 26, 12, 18, 46, 14, 13, 14];
  const cols = headers.length;

  banner(ws, cols, 'منصة التحول للذكاء الاصطناعي المساعد — تقرير المدخلات', `الجهة: ${entityName}  ·  عدد المدخلات: ${items.length}  ·  ${today()}`);

  // KPI strip: totals the reader needs before the table
  const totalBudget = items.reduce((a, i) => a + parseBudget(i.budget), 0);
  const avgDone = items.length ? Math.round(items.reduce((a, i) => a + stageWeight(i), 0) / items.length) : 0;
  const stats: [string, string][] = [
    ['إجمالي المدخلات', String(items.length)],
    ['معتمدة للتمويل', String(items.filter((i) => i.funded).length)],
    ['إجمالي الميزانية', totalBudget ? formatMoney(totalBudget) : '—'],
    ['متوسط نسبة الإنجاز', avgDone + '%'],
  ];
  const spans: [number, number][] = [[1, 3], [4, 5], [6, 8], [9, 11]];
  stats.forEach(([label, value], k) => {
    const [c1, c2] = spans[k];
    ws.mergeCells(3, c1, 3, c2);
    const cell = ws.getCell(3, c1);
    cell.value = `${label}:  ${value}`;
    cell.font = { bold: true, size: 10.5, color: { argb: 'FF1D4ED8' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NOTE_BG } as XLColor };
    cell.border = { top: thin(BORDER), bottom: thin(BORDER), left: thin('FFFFFFFF'), right: thin('FFFFFFFF') };
  });
  ws.getRow(3).height = 24;

  const headRow = 4;
  headerRow(ws, headRow, headers, widths);

  items.forEach((it, i) => {
    const data = row(it, entityName);
    const meta = wfMeta(it);
    const r = headRow + 1 + i;
    headers.forEach((h, c) => {
      const cell = ws.getCell(r, c + 1);
      cell.value = (data as Record<string, string | number>)[h] as string;
      cell.alignment = { horizontal: c === 1 || c === 7 ? 'right' : 'center', vertical: 'middle', wrapText: c === 1 || c === 7 };
      cell.font = { size: 10.5, color: { argb: 'FF16233F' } };
      if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } as XLColor };
      // status pill: workflow chip colors from the app
      if (h === 'الحالة') {
        cell.font = { size: 10, bold: true, color: { argb: argb(meta.chip) } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(meta.bg) } as XLColor };
      }
      // completion: green when done, blue in delivery, amber early
      if (h === 'نسبة الإنجاز') {
        const w = stageWeight(it);
        cell.font = { size: 10.5, bold: true, color: { argb: w >= 100 ? 'FF0B8A4B' : w >= 60 ? 'FF2563EB' : w > 0 ? 'FFB45309' : 'FF64748B' } };
      }
      if (h === 'تمويل اللجنة') {
        cell.font = { size: 10.5, bold: true, color: { argb: it.funded ? 'FF0B8A4B' : 'FF9AA6BC' } };
      }
    });
    ws.getRow(r).height = 22;
  });

  boxAll(ws, headRow, headRow + items.length, cols);

  // footer: generation stamp
  const fr = headRow + items.length + 2;
  ws.mergeCells(fr, 1, fr, cols);
  const foot = ws.getCell(fr, 1);
  foot.value = `أُنشئ هذا التقرير آليًا من منصة التحول للذكاء الاصطناعي المساعد — ${today()}`;
  foot.font = { size: 9.5, italic: true, color: { argb: 'FF9AA6BC' } };
  foot.alignment = { horizontal: 'right', vertical: 'middle' };

  ws.views = [{ rightToLeft: true, showGridLines: false, state: 'frozen', ySplit: headRow }];
  ws.autoFilter = { from: { row: headRow, column: 1 }, to: { row: headRow, column: cols } };

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'تقرير_المدخلات.xlsx'
  );
}

// Bulk-upload template: النوع (dropdown limited to the stream's types) + العنوان
// + الوصف, laid out as a proper branded, guided sheet.
export async function downloadBulkTemplate(types: { key: string; label: string }[]) {
  const mod = await import('exceljs');
  const ExcelJS = (mod as { default?: typeof import('exceljs') }).default || mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'منصة التحول للذكاء الاصطناعي المساعد';
  const ws = wb.addWorksheet('القالب', { views: [{ rightToLeft: true, showGridLines: false }] });

  const headers = ['النوع', 'العنوان', 'الوصف'];
  const widths = [22, 40, 60];
  const cols = 3;

  banner(ws, cols, 'قالب رفع المدخلات', 'اختر «النوع» من القائمة المنسدلة، ثم أدخل «العنوان» و«الوصف». احذف الصف التوضيحي قبل الرفع.');
  // guidance note row
  ws.mergeCells(3, 1, 3, cols);
  const note = ws.getCell(3, 1);
  note.value = 'ملاحظة: العنوان والوصف حقلان إلزاميان لكل مدخل. يمكن إضافة عدة مدخلات، صفٌّ لكل مدخل.';
  note.font = { size: 10, color: { argb: 'FF1D4ED8' }, italic: true };
  note.alignment = { horizontal: 'right', vertical: 'middle' };
  note.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NOTE_BG } as XLColor };
  ws.getRow(3).height = 20;

  const headRow = 4;
  headerRow(ws, headRow, headers, widths);

  // example row (light, italic) — a filled-in sample
  const ex = headRow + 1;
  const sample = [types[0]?.label || 'مشروع / مبادرة', 'مثال: مساعد ذكي لخدمة المتعاملين', 'وصف مختصر للمدخل وأهدافه ونطاقه.'];
  sample.forEach((v, c) => {
    const cell = ws.getCell(ex, c + 1);
    cell.value = v;
    cell.font = { italic: true, color: { argb: 'FF9AA6BC' }, size: 10.5 };
    cell.alignment = { horizontal: c === 0 ? 'center' : 'right', vertical: 'middle', wrapText: true };
  });

  const list = '"' + types.map((t) => t.label).join(',') + '"';
  for (let r = ex; r <= 60; r++) {
    ws.getCell(r, 1).dataValidation = { type: 'list', allowBlank: true, formulae: [list] };
    ws.getRow(r).height = 20;
  }
  boxAll(ws, headRow, 60, cols);
  ws.views = [{ rightToLeft: true, showGridLines: false, state: 'frozen', ySplit: headRow }];

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'قالب_رفع_المدخلات.xlsx'
  );
}

// ---- Admin: users bulk template + reader -----------------------------------
export async function downloadUsersTemplate(roleLabels: string[], entities: string[], streamNames: string[]) {
  const mod = await import('exceljs');
  const ExcelJS = (mod as { default?: typeof import('exceljs') }).default || mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'منصة التحول للذكاء الاصطناعي المساعد';
  const ws = wb.addWorksheet('المستخدمون', { views: [{ rightToLeft: true, showGridLines: false }] });

  const headers = ['الاسم الكامل', 'البريد الإلكتروني', 'الدور', 'الجهة', 'المسار'];
  const widths = [30, 34, 26, 34, 26];
  const cols = headers.length;

  banner(ws, cols, 'قالب رفع المستخدمين', 'عبّئ صفًّا لكل مستخدم. «الاسم» و«البريد» إلزاميان. اختر «الدور» من القائمة؛ «الجهة»/«المسار» حسب الدور.');
  ws.mergeCells(3, 1, 3, cols);
  const note = ws.getCell(3, 1);
  note.value = 'ملاحظة: منسق المسار يحتاج الجهة والمسار · ممثل الجهة يحتاج الجهة · رئيس المسار يحتاج المسار · المشرف واللجنة لا يحتاجان أيًّا منهما. احذف الصف التوضيحي قبل الرفع.';
  note.font = { size: 10, color: { argb: 'FF1D4ED8' }, italic: true };
  note.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
  note.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NOTE_BG } as XLColor };
  ws.getRow(3).height = 30;

  const headRow = 4;
  headerRow(ws, headRow, headers, widths);

  const ex = headRow + 1;
  const sample = ['محمد أحمد العامري', 'm.alameri@aigp.gov.ae', roleLabels[0] || 'منسق المسار في الجهة', entities[0] || '', streamNames[0] || ''];
  sample.forEach((v, c) => {
    const cell = ws.getCell(ex, c + 1);
    cell.value = v;
    cell.font = { italic: true, color: { argb: 'FF9AA6BC' }, size: 10.5 };
    cell.alignment = { horizontal: c === 1 ? 'left' : 'right', vertical: 'middle' };
  });

  const listOf = (arr: string[]) => '"' + arr.join(',').slice(0, 250) + '"';
  for (let r = ex; r <= 80; r++) {
    ws.getCell(r, 3).dataValidation = { type: 'list', allowBlank: true, formulae: [listOf(roleLabels)] };
    if (entities.length) ws.getCell(r, 4).dataValidation = { type: 'list', allowBlank: true, formulae: [listOf(entities)] };
    ws.getCell(r, 5).dataValidation = { type: 'list', allowBlank: true, formulae: [listOf(streamNames)] };
    ws.getRow(r).height = 20;
  }
  boxAll(ws, headRow, 80, cols);
  ws.views = [{ rightToLeft: true, showGridLines: false, state: 'frozen', ySplit: headRow }];

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'قالب_رفع_المستخدمين.xlsx'
  );
}

// Read a filled .xlsx (or .csv) into rows of trimmed cell strings, skipping the
// title/note/header/example rows heuristically (caller filters further).
export async function readSheetRows(file: File): Promise<string[][]> {
  const buf = await file.arrayBuffer();
  if (/\.csv$/i.test(file.name)) {
    const text = new TextDecoder('utf-8').decode(buf).replace(/^﻿/, '');
    return text.split(/\r?\n/).map((l) => l.split(/[,\t]/).map((c) => c.trim())).filter((r) => r.some((c) => c));
  }
  const mod = await import('exceljs');
  const ExcelJS = (mod as { default?: typeof import('exceljs') }).default || mod;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  const rows: string[][] = [];
  ws.eachRow((r) => {
    const cells: string[] = [];
    r.eachCell({ includeEmpty: true }, (c) => {
      const v = c.value as unknown;
      cells.push(v == null ? '' : typeof v === 'object' && v && 'text' in (v as object) ? String((v as { text: string }).text).trim() : String(v).trim());
    });
    if (cells.some((c) => c)) rows.push(cells);
  });
  return rows;
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportPpt(items: Item[], entityName: string) {
  const Pptx = (await import('pptxgenjs')).default;
  const p = new Pptx();
  p.layout = 'LAYOUT_WIDE'; // 13.33 × 7.5 in
  p.rtlMode = true;
  const RR = p.ShapeType.roundRect;
  const RECT = p.ShapeType.rect;
  const NAVY = '0F1F3D';
  const BLUE = '2563EB';
  const INK = '13213C';
  const MUTE = '54627B';
  const LINE = 'E7ECF4';
  const CARD = 'F7F9FC';

  const footer = (s: ReturnType<typeof p.addSlide>, page: string) => {
    s.addShape(RECT, { x: 0.5, y: 7.06, w: 12.33, h: 0.008, fill: { color: LINE }, line: { color: LINE, width: 0 } });
    s.addText('منصة التحول للذكاء الاصطناعي المساعد', { x: 8.3, y: 7.12, w: 4.53, h: 0.3, align: 'right', color: '9AA6BC', fontSize: 9 });
    s.addText(page, { x: 0.5, y: 7.12, w: 1.2, h: 0.3, align: 'left', color: '9AA6BC', fontSize: 9 });
  };

  // ---- 1) title slide -------------------------------------------------------
  const title = p.addSlide();
  title.background = { color: NAVY };
  // accent shapes
  title.addShape(RECT, { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: BLUE }, line: { color: BLUE, width: 0 } });
  title.addShape(RR, { x: 5.47, y: 1.55, w: 2.4, h: 0.55, rectRadius: 0.27, fill: { color: '1B3A75' }, line: { color: '2E5AAE', width: 0.75 } });
  title.addText('تقرير المدخلات', { x: 5.47, y: 1.55, w: 2.4, h: 0.55, align: 'center', valign: 'middle', color: 'AFC6E8', fontSize: 13, bold: true });
  title.addText('مشروع الذكاء الاصطناعي المساعد', {
    x: 0.5, y: 2.5, w: 12.33, h: 1, align: 'center', color: 'FFFFFF', fontSize: 34, bold: true,
  });
  title.addText('حصر أعمال التحول بالذكاء الاصطناعي', {
    x: 0.5, y: 3.55, w: 12.33, h: 0.55, align: 'center', color: 'AFC6E8', fontSize: 17,
  });
  title.addShape(RECT, { x: 6.06, y: 4.35, w: 1.2, h: 0.02, fill: { color: BLUE }, line: { color: BLUE, width: 0 } });
  title.addText(`${entityName}   ·   ${items.length} مدخلًا   ·   ${today()}`, {
    x: 0.5, y: 4.6, w: 12.33, h: 0.5, align: 'center', color: '7E97C4', fontSize: 13,
  });

  // ---- 2) summary slide -----------------------------------------------------
  const totalBudget = items.reduce((a, i) => a + parseBudget(i.budget), 0);
  const avgDone = items.length ? Math.round(items.reduce((a, i) => a + stageWeight(i), 0) / items.length) : 0;
  const sum = p.addSlide();
  sum.background = { color: 'FFFFFF' };
  sum.addText('ملخص المدخلات', { x: 0.5, y: 0.4, w: 12.33, h: 0.6, align: 'right', color: INK, fontSize: 24, bold: true });
  sum.addShape(RECT, { x: 12.13, y: 1.05, w: 0.7, h: 0.045, fill: { color: BLUE }, line: { color: BLUE, width: 0 } });

  const kpis: [string, string][] = [
    ['إجمالي المدخلات', String(items.length)],
    ['معتمدة للتمويل', String(items.filter((i) => i.funded).length)],
    ['إجمالي الميزانية', totalBudget ? formatMoney(totalBudget) : '—'],
    ['متوسط نسبة الإنجاز', avgDone + '%'],
  ];
  // RTL: first KPI sits at the right edge
  kpis.forEach(([label, value], k) => {
    const w = 3.0, gap = 0.11;
    const x = 12.83 - w - k * (w + gap);
    sum.addShape(RR, { x, y: 1.45, w, h: 1.45, rectRadius: 0.09, fill: { color: CARD }, line: { color: LINE, width: 1 } });
    sum.addText(value, { x, y: 1.62, w, h: 0.65, align: 'center', color: k === 2 ? BLUE : INK, fontSize: k === 2 ? 20 : 26, bold: true });
    sum.addText(label, { x, y: 2.32, w, h: 0.4, align: 'center', color: MUTE, fontSize: 12 });
  });

  // distribution tables: by type (right) + by status (left)
  const countBy = (f: (i: Item) => string) => {
    const m = new Map<string, number>();
    items.forEach((i) => m.set(f(i), (m.get(f(i)) || 0) + 1));
    return [...m.entries()];
  };
  const distTable = (x: number, w: number, titleTxt: string, rows: [string, number][]) => {
    sum.addText(titleTxt, { x, y: 3.35, w, h: 0.4, align: 'right', color: MUTE, fontSize: 13, bold: true });
    sum.addTable(
      rows.map(([k, n]) => [
        { text: k, options: { align: 'right' as const, color: INK, fill: { color: 'FFFFFF' } } },
        { text: String(n), options: { align: 'center' as const, bold: true, color: BLUE, fill: { color: 'FFFFFF' } } },
      ]),
      { x, y: 3.8, w, colW: [w - 1.1, 1.1], fontSize: 12, border: { pt: 0.5, color: LINE }, rowH: 0.38 }
    );
  };
  distTable(6.93, 5.9, 'التوزيع حسب النوع', countBy((i) => typeLabel(i.type)));
  distTable(0.5, 5.9, 'التوزيع حسب الحالة', countBy((i) => wfMeta(i).label));
  footer(sum, '2');

  // ---- 3) one slide per item ------------------------------------------------
  items.forEach((i, idx) => {
    const s = p.addSlide();
    s.background = { color: 'FFFFFF' };
    const meta = wfMeta(i);

    // header: title + chips row + divider
    s.addText(i.title, { x: 0.5, y: 0.35, w: 12.33, h: 0.65, align: 'right', color: INK, fontSize: 21, bold: true });
    const chip = (x: number, w: number, txt: string, bg: string, col: string) => {
      s.addShape(RR, { x, y: 1.08, w, h: 0.42, rectRadius: 0.21, fill: { color: bg }, line: { color: bg, width: 0 } });
      s.addText(txt, { x, y: 1.08, w, h: 0.42, align: 'center', valign: 'middle', color: col, fontSize: 10.5, bold: true });
    };
    chip(10.93, 1.9, typeLabel(i.type), 'E5EEFF', '2563EB');
    chip(8.13, 2.7, meta.label, meta.bg.replace('#', ''), meta.chip.replace('#', ''));
    if (i.funded) chip(6.03, 2.0, 'معتمد للتمويل ✓', 'E3F6EC', '0B8A4B');
    s.addShape(RECT, { x: 0.5, y: 1.72, w: 12.33, h: 0.01, fill: { color: LINE }, line: { color: LINE, width: 0 } });

    // right card: details
    s.addShape(RR, { x: 6.93, y: 1.95, w: 5.9, h: 4.85, rectRadius: 0.09, fill: { color: CARD }, line: { color: LINE, width: 1 } });
    s.addText('بيانات المدخل', { x: 7.13, y: 2.1, w: 5.5, h: 0.4, align: 'right', color: MUTE, fontSize: 12.5, bold: true });
    const rows: [string, string][] = [
      ['المسار', pathById(i.path).name],
      ['الجهة', entOf(i, entityName)],
      ['الأولوية', i.priority || '—'],
      ['الميزانية', i.budget || '—'],
      ['درجة التحول', transformScore(i).v + ' / 5'],
      ['تمويل اللجنة', i.funded ? 'نعم' : 'لا'],
    ];
    s.addTable(
      rows.map(([k, v]) => [
        { text: k, options: { bold: true, color: MUTE, align: 'right' as const, fill: { color: CARD } } },
        { text: v, options: { color: INK, align: 'right' as const, fill: { color: CARD } } },
      ]),
      { x: 7.13, y: 2.55, w: 5.5, colW: [1.7, 3.8], fontSize: 11.5, border: { pt: 0.5, color: LINE }, rowH: 0.42 }
    );
    // progress bar (fills from the right — RTL)
    const frac = Math.max(0, Math.min(1, stageWeight(i) / 100));
    s.addText('نسبة الإنجاز', { x: 7.13, y: 5.62, w: 3.4, h: 0.35, align: 'right', color: MUTE, fontSize: 11, bold: true });
    s.addText(stageWeight(i) + '%', { x: 7.13, y: 5.62, w: 1.0, h: 0.35, align: 'left', color: BLUE, fontSize: 11, bold: true });
    s.addShape(RR, { x: 7.13, y: 6.02, w: 5.5, h: 0.2, rectRadius: 0.1, fill: { color: LINE }, line: { color: LINE, width: 0 } });
    if (frac > 0)
      s.addShape(RR, { x: 7.13 + 5.5 * (1 - frac), y: 6.02, w: Math.max(0.2, 5.5 * frac), h: 0.2, rectRadius: 0.1, fill: { color: BLUE }, line: { color: BLUE, width: 0 } });

    // left card: scope of work
    s.addShape(RR, { x: 0.5, y: 1.95, w: 6.23, h: 4.85, rectRadius: 0.09, fill: { color: 'FFFFFF' }, line: { color: LINE, width: 1 } });
    s.addText('نطاق العمل', { x: 0.7, y: 2.1, w: 5.83, h: 0.4, align: 'right', color: MUTE, fontSize: 12.5, bold: true });
    const scope = stripHtml(i.scopeOfWork || '') || stripHtml(i.desc || '') || '—';
    s.addText(scope.length > 900 ? scope.slice(0, 900) + '…' : scope, {
      x: 0.7, y: 2.55, w: 5.83, h: 4.05, align: 'right', valign: 'top', color: '33405A', fontSize: 11.5, lineSpacingMultiple: 1.25,
    });

    footer(s, String(idx + 3));
  });

  await p.writeFile({ fileName: 'عرض_التحول_الذكي.pptx' });
}
