import { NextRequest, NextResponse } from 'next/server';
import { jsonError, messages } from './errors';

export function getIp(req: NextRequest): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip');
}

export function handleApiError(error: unknown) {
  const e = error as { status?: number; message?: string };
  if (e.status === 401 || e.message === 'unauthenticated') {
    return jsonError('UNAUTHENTICATED', messages.unauthenticated, 401);
  }
  if (e.message === 'disabled') {
    return jsonError('ACCESS_NOT_ENABLED', messages.disabled, 403);
  }
  if (e.status === 403 || e.message?.startsWith('forbidden')) {
    return jsonError('FORBIDDEN', messages.forbidden, 403);
  }
  if (e.status === 404) return jsonError('NOT_FOUND', messages.notFound, 404);
  console.error(error);
  return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.' }, { status: 500 });
}
