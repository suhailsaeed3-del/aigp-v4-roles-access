import { NextResponse } from 'next/server';

export function jsonError(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json({ code, message, details: details ?? [] }, { status });
}

export const messages = {
  unauthenticated: 'يرجى تسجيل الدخول للمتابعة.',
  disabled: 'تم تسجيل دخولك بنجاح، ولكن لم يتم تفعيل حسابك لاستخدام هذا التطبيق بعد. يرجى التواصل مع مسؤول النظام.',
  forbidden: 'لا تملك الصلاحية المطلوبة لتنفيذ هذا الإجراء.',
  validation: 'حدث خطأ في التحقق من البيانات.',
  notFound: 'لم يتم العثور على السجل المطلوب.',
};
