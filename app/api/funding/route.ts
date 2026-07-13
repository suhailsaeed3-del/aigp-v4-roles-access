import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import { assertPermission, buildItemScopeWhere } from '@/lib/security/rbac';
import { handleApiError } from '@/lib/security/http';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) { try { const u = await requireAuthUser(req); assertPermission(u, 'funding:view'); const funding = await prisma.funding.findMany({ where: { item: buildItemScopeWhere(u) }, include: { item: true }, take: 500 }); return NextResponse.json({ funding }); } catch(e) { return handleApiError(e); } }
