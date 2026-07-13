// ============================================================================
// Workplan report (.xlsx) importer — parses the official خطة العمل template
// the entities fill (sample: sample_workplan_report.xlsx) into bulk rows the
// coordinator reviews before submitting. Anything the file doesn't carry is
// left blank for manual completion on the website.
// ============================================================================
import { PATHS, type Item, type ItemType } from './domain';

export type WorkplanRow = {
  type: ItemType;
  path: string;
  title: string;
  desc: string;
  extra: Partial<Item>;
};

export type WorkplanLaunch = { batch: string; title: string; ltype: string; date: string; desc: string };

export type WorkplanResult = { rows: WorkplanRow[]; launches: WorkplanLaunch[] };

const cellStr = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'object') {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (o.richText) return o.richText.map((t) => t.text).join('');
    if (o.text != null) return String(o.text);
    if (o.result != null) return String(o.result);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  }
  return String(v).trim();
};

const normDate = (s: string): string => s.replace(/\//g, '-');

// path by stream name mentioned in the file (loose contains-match)
function pathByName(name: string): string {
  const n = (name || '').trim();
  if (!n) return '';
  const hit = PATHS.find((p) => n.includes(p.name) || p.name.includes(n));
  return hit?.id || '';
}

// vocabulary normalisation: file wording → form wording
const mapStatus = (s: string): string => {
  if (!s) return '';
  if (s.includes('تصميم') || s.includes('جديد')) return 'مشروع جديد';
  if (s.includes('تنفيذ')) return 'قيد التنفيذ';
  if (s.includes('مكتمل')) return 'مكتمل';
  if (s.includes('قائم')) return 'قائم';
  return s;
};
const mapAutoLevel = (s: string): string => {
  if (s.startsWith('نعم')) return 'كلياً';
  if (s.includes('جزئ')) return 'جزئياً';
  if (s.startsWith('لا')) return 'لا';
  return s;
};
const mapIntensity = (s: string): string => {
  if (s.includes('عالية')) return 'عالية';
  if (s.includes('متوسطة')) return 'متوسطة';
  if (s.includes('منخفضة')) return 'منخفضة';
  return s;
};
const mapComplexity = (s: string): string => {
  const t = s.trim();
  if (t.startsWith('عالي') || t.startsWith('عالٍ')) return 'عالٍ';
  if (t.startsWith('متوسط')) return 'متوسط';
  if (t.startsWith('منخفض')) return 'منخفض';
  return t;
};
const mapImpact = (s: string): string => mapComplexity(s) === 'عالٍ' ? 'مرتفع' : s.includes('متوسط') ? 'متوسط' : s.includes('منخفض') ? 'منخفض' : s.trim();
const mapReadiness = (s: string): string => s.replace('جاهزة للتحول', 'الجاهزية للتحول').trim();
const pctOf = (s: string): number | undefined => {
  const m = (s || '').match(/(\d{1,3})/);
  return m ? Math.min(100, parseInt(m[1], 10)) : undefined;
};

type Sheet = {
  name: string;
  rowCount: number;
  getRow: (r: number) => { getCell: (c: number) => { value: unknown } };
  columnCount: number;
};

function rowVals(ws: Sheet, r: number, max: number): string[] {
  const out: string[] = [];
  for (let c = 1; c <= max; c++) out.push(cellStr(ws.getRow(r).getCell(c).value));
  return out;
}

// find the header row (first cell '#', 'م', or a known header word)
function headerRow(ws: Sheet, maxScan = 6): number {
  for (let r = 1; r <= Math.min(maxScan, ws.rowCount); r++) {
    const first = cellStr(ws.getRow(r).getCell(1).value);
    if (first === '#' || first === 'م' || first === 'المرحلة') return r;
  }
  return -1;
}

// header keyword → item field mapping (applies across all data sheets)
function fieldFor(header: string): keyof Item | 'title' | 'path' | null {
  const h = header.replace(/\s+/g, ' ').trim();
  if (!h || h === '#' || h === 'م') return null;
  if (
    h.includes('اسم المشروع') ||
    h.includes('العملية الرئيسية') ||
    h.includes('اسم الخدمة') ||
    h.includes('الخدمة الرئيسية') ||
    h.includes('المهمة والعملية والخدمة')
  )
    return 'title';
  if (h === 'الوصف') return 'desc';
  if (h.includes('ملاحظات')) return 'desc';
  if (h.includes('المخرجات')) return 'expectedOutputs';
  if (h.includes('مستوى') && h.includes('الأثر')) return 'impact';
  if (h.includes('الأثر المتوقع')) return 'expectedImpact';
  if (h.includes('تاريخ الانتهاء')) return 'endDate';
  if (h === 'الحالة') return 'status';
  if (h === 'المسار' || h === 'المسار المعني') return 'path';
  if (h.includes('الأنشطة الفرعية') || h.includes('الأنشطة والخدمات الفرعية')) return 'subActivities';
  if (h === 'التصنيف') return 'opType';
  if (h.includes('أولوية التحول')) return 'transformPriority';
  if (h.includes('القطاع')) return 'sector';
  if (h.includes('الوحدة التنظيمية') || h.includes('الإدارة')) return 'dept';
  if (h.includes('القسم المعني')) return 'section';
  if (h.includes('نظام الأتمتة')) return 'automationSystem';
  if (h.includes('نسبة الأتمتة')) return 'automationPct';
  if (h.includes('مؤتمت') || h === 'مستوى الأتمتة') return 'automationLevel';
  if (h.includes('كثافة')) return 'usageIntensity';
  if (h.includes('الجاهزية') || h.includes('جاهزية')) return 'readiness';
  if (h.includes('التعقيد')) return 'complexityLevel';
  if (h.includes('القابلية للتحول')) return 'transformability';
  if (h.includes('مالك الخدمة')) return 'serviceOwner';
  if (h.includes('الفئة المستهدفة') || h.includes('المستخدمون')) return 'targetUsers';
  return null;
}

function parseDataSheet(ws: Sheet, fallbackType: ItemType, fallbackPath: string): WorkplanRow[] {
  const hr = headerRow(ws);
  if (hr < 0) return [];
  const headers = rowVals(ws, hr, Math.min(ws.columnCount, 20));
  const rows: WorkplanRow[] = [];
  for (let r = hr + 1; r <= ws.rowCount; r++) {
    const vals = rowVals(ws, r, headers.length);
    const extra: Partial<Item> = {};
    let title = '';
    let desc = '';
    let path = '';
    headers.forEach((h, i) => {
      const f = fieldFor(h);
      const v = (vals[i] || '').trim();
      if (!f || !v) return;
      if (f === 'title') title = v;
      else if (f === 'desc') desc = desc ? desc + ' — ' + v : v;
      else if (f === 'path') path = pathByName(v);
      else if (f === 'status') extra.status = mapStatus(v);
      else if (f === 'automationLevel') extra.automationLevel = mapAutoLevel(v);
      else if (f === 'usageIntensity') extra.usageIntensity = mapIntensity(v);
      else if (f === 'complexityLevel') {
        extra.complexityLevel = mapComplexity(v);
        extra.complexity = mapComplexity(v);
      } else if (f === 'impact') extra.impact = mapImpact(v);
      else if (f === 'readiness') extra.readiness = mapReadiness(v);
      else if (f === 'automationPct') extra.automationPct = pctOf(v);
      else if (f === 'endDate') extra.endDate = normDate(v);
      else if (f === 'transformability') extra.transformability = v;
      else (extra as Record<string, unknown>)[f] = v;
    });
    if (!title) continue;
    rows.push({ type: fallbackType, path: path || fallbackPath, title, desc, extra });
  }
  return rows;
}

// timeline phases (البرنامج الزمني) → date-range → batch name for launches
function parseTimeline(ws: Sheet | undefined): { name: string; start: string; end: string }[] {
  if (!ws) return [];
  const hr = headerRow(ws);
  if (hr < 0) return [];
  const out: { name: string; start: string; end: string }[] = [];
  for (let r = hr + 1; r <= ws.rowCount; r++) {
    const v = rowVals(ws, r, 6);
    // real export: [المرحلة (مع الفترة), الفترة, النشاط, تاريخ البدء, تاريخ الانتهاء]
    const rawName = (v[0] || '').replace(/\s*\(.*\)\s*$/, '').trim();
    if (!rawName) continue;
    out.push({ name: normBatchName(rawName), start: normDate(v[3] || ''), end: normDate(v[4] || '') });
  }
  return out;
}

// legacy wording → this portal's batch names (المراحل الأربع)
function normBatchName(n: string): string {
  let s = n.replace(/الدفعة/g, 'المرحلة').trim();
  // the old plan had six batches + a closing phase — fold the tail into الرابعة
  if (/(الخامسة|السادسة|التحسين والتوسع)/.test(s)) s = 'إطلاق المرحلة الرابعة';
  return s;
}

function batchForDate(date: string, timeline: { name: string; start: string; end: string }[]): string {
  const launchable = timeline.filter((t) => t.name !== 'التقييم والتهيئة');
  for (const t of launchable) {
    if (t.start && t.end && date >= t.start && date <= t.end) return t.name;
  }
  return launchable[0]?.name || 'إطلاق المرحلة الأولى';
}

export async function parseWorkplan(buf: ArrayBuffer): Promise<WorkplanResult> {
  const mod = await import('exceljs');
  const ExcelJS = (mod as { default?: typeof import('exceljs') }).default || mod;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const rows: WorkplanRow[] = [];
  const launches: WorkplanLaunch[] = [];
  let timelineWs: Sheet | undefined;
  let launchWs: Sheet | undefined;

  // the real export declares its track in sheet 1 (المعلومات العامة):
  // a row like ["المسار", "<track name>"] — it types the section-4 rows
  let trackPath = '';
  wb.eachSheet((ws) => {
    if (!ws.name.includes('المعلومات العامة')) return;
    const sheet = ws as unknown as Sheet;
    for (let r = 1; r <= Math.min(sheet.rowCount, 12); r++) {
      const v = rowVals(sheet, r, 2);
      if (v[0].trim() === 'المسار') trackPath = pathByName(v[1]);
    }
  });
  const trackType: ItemType =
    trackPath === 'services' ? 'service' : trackPath === 'ops' || trackPath === 'strategy' ? 'operation' : 'project';

  wb.eachSheet((ws) => {
    const name = ws.name.trim();
    const sheet = ws as unknown as Sheet;
    if (name.includes('المعلومات العامة') || name.includes('فريق العمل') || name.includes('المستهدفات')) return;
    if (name.includes('البرنامج الزمني')) timelineWs = sheet;
    else if (name.includes('الإطلاقات')) launchWs = sheet;
    else if (name.includes('المشاريع القائمة') || name.includes('المشاريع الجديدة')) {
      const parsed = parseDataSheet(sheet, 'project', trackPath);
      for (const p of parsed) {
        if (name.includes('الجديدة') && !p.extra.status) p.extra.status = 'مشروع جديد';
        // stream is mandatory later; leave blank path for manual pick if unmatched
        rows.push(p);
      }
    } else if (name.includes('مسار العمليات')) {
      rows.push(...parseDataSheet(sheet, 'operation', 'ops'));
    } else if (name.includes('العمل الحكومي الاستراتيجي')) {
      rows.push(...parseDataSheet(sheet, 'operation', 'strategy'));
    } else if (name.includes('مسار الخدمات')) {
      rows.push(...parseDataSheet(sheet, 'service', 'services'));
    } else if (name.includes('العمليات والدعم المؤسسي')) {
      // section 4 of the real export — items typed by the declared track
      rows.push(...parseDataSheet(sheet, trackType, trackPath || 'ops'));
    }
  });

  const timeline = parseTimeline(timelineWs);
  if (launchWs) {
    const hr = headerRow(launchWs);
    if (hr > 0) {
      for (let r = hr + 1; r <= launchWs.rowCount; r++) {
        const v = rowVals(launchWs, r, 3);
        const date = normDate(v[1] || '');
        const desc = (v[2] || '').trim();
        if (!desc && !date) continue;
        launches.push({
          batch: batchForDate(date, timeline),
          title: desc || 'إطلاق ' + date,
          ltype: 'إطلاق منتج / خدمة',
          date,
          desc: '',
        });
      }
    }
  }

  return { rows, launches };
}
