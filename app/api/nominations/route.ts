import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import { assertPermission, buildItemScopeWhere } from '@/lib/security/rbac';
import { handleApiError } from '@/lib/security/http';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) { try { const u = await requireAuthUser(req); assertPermission(u, 'nominations:view'); const nominations = await prisma.nomination.findMany({ where: { item: buildItemScopeWhere(u) }, include: { item: true }, take: 500 }); return NextResponse.json({ nominations }); } catch(e) { return handleApiError(e); } }
