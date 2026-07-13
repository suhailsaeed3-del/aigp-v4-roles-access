import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/security/auth';
import { assertPermission } from '@/lib/security/rbac';
import { handleApiError, getIp } from '@/lib/security/http';
import { writeAuditLog } from '@/lib/security/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Proxies the "مراجعة ذكية" prompt to the internal, self-hosted model.
// Protected by ai_review:run and audited. If AI is not configured, the client
// can still use its deterministic Arabic heuristic fallback.
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    assertPermission(user, 'ai_review:run');

    const len = Number(req.headers.get('content-length') || 0);
    if (len > 64_000) return NextResponse.json({ error: 'payload-too-large' }, { status: 413 });

    let prompt = '';
    try {
      const body = await req.json();
      prompt = typeof body?.prompt === 'string' ? body.prompt : '';
    } catch {
      return NextResponse.json({ error: 'bad-request' }, { status: 400 });
    }
    if (!prompt) return NextResponse.json({ error: 'empty-prompt' }, { status: 400 });
    if (prompt.length > 20_000) return NextResponse.json({ error: 'prompt-too-long' }, { status: 413 });

    if (process.env.AI_REVIEW_ENABLED === 'false') return NextResponse.json({ error: 'ai-disabled' }, { status: 503 });
    const base = process.env.AI_API_BASE_URL;
    if (!base) return NextResponse.json({ error: 'no-model' }, { status: 503 });

    const res = await fetch(base.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.AI_API_KEY ? { Authorization: `Bearer ${process.env.AI_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'default',
        messages: [
          { role: 'system', content: 'أنت مساعد تدقيق محتوى حكومي. تُعيد إجابات موجزة بصيغة JSON عربية فقط.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 700,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return NextResponse.json({ error: 'upstream' }, { status: 502 });
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    await writeAuditLog({ actorUserId: user.id, action: 'ai_review_run', resourceType: 'ai_review', ipAddress: getIp(req), userAgent: req.headers.get('user-agent'), metadata: { promptLength: prompt.length } });
    return NextResponse.json({ text });
  } catch (e) {
    return handleApiError(e);
}
}
