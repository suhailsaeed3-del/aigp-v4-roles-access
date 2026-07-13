// ============================================================================
// AI review — calls the internal, self-hosted model through /api/ai-review
// (OpenAI-compatible on the server). Falls back to the exact deterministic
// Arabic heuristics from the prototype when the endpoint is unavailable.
// ============================================================================
import type { Item } from './domain';
import { typeLabel, pathById } from './domain';

export type ReviewResult = { ready: string[]; improve: string[]; notes: string[] };
export type ScopeReview = { ready: string[]; improve: string[] };
export type BulkVerdict = { i: number; verdict: string; note: string };

async function callModel(prompt: string): Promise<string> {
  const res = await fetch('/api/ai-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error('ai-http-' + res.status);
  const data = await res.json();
  if (typeof data.text !== 'string') throw new Error('ai-bad');
  return data.text as string;
}

function extractJson(raw: string): unknown {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no-json');
  return JSON.parse(m[0]);
}

// ---- 10.1 Create-item review ----------------------------------------------
export async function runItemReview(it: Item): Promise<ReviewResult> {
  const tLabel = typeLabel(it.type);
  const prompt =
    `أنت مدقّق محتوى خبير في منصة حكومية إماراتية لحصر أعمال التحول بالذكاء الاصطناعي. راجع "${tLabel}" التالي قبل إرساله للاعتماد، وتحقق من: اكتمال الحقول المطلوبة، وضوح الوصف، قوة النتائج المتوقعة، صحة التصنيف، تحديد المسار والأولوية والتعقيد، اتساق التواريخ، واحتمال التكرار أو الحاجة للربط بمشروع/مبادرة.\n` +
    `البيانات: ${JSON.stringify({
      type: tLabel,
      path: it.path,
      title: it.title,
      desc: it.desc,
      expectedOutcomes: it.expectedOutcomes,
      expectedImpact: it.expectedImpact,
      priority: it.priority,
      complexity: it.complexity,
      endDate: it.endDate,
      transformability: it.transformability,
      readiness: it.readiness,
    })}\n` +
    `أعد JSON فقط بدون أي نص آخر بالشكل: {"ready":["..."],"improve":["..."],"notes":["..."]} حيث ready=نقاط جاهزة، improve=تحسينات بسيطة مقترحة، notes=ملاحظات مهمة قد تعيق الاعتماد. كل عنصر جملة عربية قصيرة.`;
  try {
    const raw = await callModel(prompt);
    try {
      const p = extractJson(raw) as ReviewResult;
      return { ready: p.ready || [], improve: p.improve || [], notes: p.notes || [] };
    } catch {
      return { ready: [], improve: [], notes: [raw.slice(0, 300)] };
    }
  } catch {
    return itemHeuristic(it);
  }
}

function itemHeuristic(it: Item): ReviewResult {
  const ready: string[] = [];
  const improve: string[] = [];
  const notes: string[] = [];
  if (it.title)
    ready.push('العنوان والتصنيف ضمن مسار «' + pathById(it.path).name + '» محدّدان بوضوح.');
  else notes.push('اسم العنصر مفقود ويجب تعبئته.');
  if ((it.desc || '').length > 40) ready.push('الوصف كافٍ وواضح.');
  else improve.push('يُفضّل توسيع الوصف ليشمل النطاق والهدف.');
  if (!it.expectedOutcomes) notes.push('النتائج المتوقعة غير معبّأة وقد تؤخّر الاعتماد.');
  else ready.push('النتائج المتوقعة محدّدة.');
  if (!it.endDate) improve.push('لم يتم تحديد تاريخ الانتهاء المتوقع.');
  return { ready, improve, notes };
}

// ---- 10.2 Pre-submission scope review -------------------------------------
export async function runScopeReview(it: Item): Promise<ScopeReview> {
  const tLabel = typeLabel(it.type);
  const fb = scopeHeuristic(it);
  const prompt =
    `أنت مراجع تحول رقمي حكومي. راجع بيانات ${tLabel} التالية قبل إرسالها لاعتماد ممثل الجهة، وأعد JSON فقط بالشكل {"ready":[".."],"improve":[".."]} باللغة العربية. الميزانية: ${it.budget || '—'} — نطاق العمل: ${it.scopeOfWork || '—'}`;
  try {
    const raw = await callModel(prompt);
    const p = extractJson(raw) as ScopeReview;
    return { ready: p.ready || fb.ready, improve: p.improve || fb.improve };
  } catch {
    return fb;
  }
}

function scopeHeuristic(it: Item): ScopeReview {
  const ready: string[] = [];
  const improve: string[] = [];
  const sw = (it.scopeOfWork || '').trim();
  const bg = (it.budget || '').trim();
  if (sw.length >= 60) ready.push('نطاق العمل مفصّل ويوضّح حدود العمل.');
  else improve.push('نطاق العمل مختصر — أضف حدود العمل والمخرجات والاستثناءات بوضوح.');
  if (bg) ready.push('الميزانية التقديرية محدّدة.');
  else improve.push('لم تُحدّد الميزانية التقديرية.');
  if (it.scopeFile) ready.push('تم إرفاق مستند نطاق العمل / الميزانية.');
  else improve.push('يُفضّل إرفاق مستند تفصيلي لنطاق العمل والميزانية.');
  if ((it.phases || []).some((p) => p.start && p.end)) ready.push('الجدول الزمني للمراحل معبّأ.');
  else improve.push('حدّد تواريخ بدء وانتهاء مراحل التنفيذ.');
  return { ready, improve };
}

// ---- 10.3 Bulk import review ----------------------------------------------
export async function runBulkReview(
  type: string,
  rows: { title: string; desc: string }[]
): Promise<BulkVerdict[]> {
  const tl = typeLabel(type);
  const prompt =
    `أنت مدقّق محتوى في منصة حكومية إماراتية لحصر أعمال التحول بالذكاء الاصطناعي. راجع قائمة "${tl}" المرفوعة عبر ملف، وصنّف كل عنصر إلى إحدى ثلاث حالات: "جاهز" (مكتمل وواضح وصالح للإرسال)، "بحاجة إلى مراجعة" (ناقص أو يحتاج تحسيناً بسيطاً)، "يوجد خطأ" (بيانات مفقودة أساسية كالاسم أو وصف غير صالح).\n` +
    `العناصر: ${JSON.stringify(rows.map((r, i) => ({ i, title: r.title, desc: r.desc })))}\n` +
    `أعد JSON فقط بالشكل: {"results":[{"i":0,"verdict":"جاهز","note":"..."}]} بدون أي نص آخر. note جملة عربية قصيرة جداً تشرح السبب.`;
  let results: BulkVerdict[] = [];
  try {
    const raw = await callModel(prompt);
    const p = extractJson(raw) as { results?: BulkVerdict[] };
    results = p.results || [];
  } catch {
    results = [];
  }
  const valid = ['جاهز', 'بحاجة إلى مراجعة', 'يوجد خطأ'];
  return rows.map((r, i) => {
    const found = results.find((x) => x.i === i && valid.includes(x.verdict));
    if (found) return found;
    if (!r.title) return { i, verdict: 'يوجد خطأ', note: 'اسم العنصر مفقود.' };
    if ((r.desc || '').length < 25)
      return { i, verdict: 'بحاجة إلى مراجعة', note: 'الوصف مختصر ويحتاج توضيحاً.' };
    return { i, verdict: 'جاهز', note: 'مكتمل وصالح للإرسال.' };
  });
}

export const BULK_VERDICT_STYLE: Record<string, { bg: string; c: string }> = {
  جاهز: { bg: '#E3F6EC', c: '#0B8A4B' },
  'بحاجة إلى مراجعة': { bg: '#FFF3DE', c: '#B45309' },
  'يوجد خطأ': { bg: '#FCEEEF', c: '#D23B45' },
};
