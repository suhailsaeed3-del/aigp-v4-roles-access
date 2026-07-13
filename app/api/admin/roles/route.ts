import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/security/auth';
import { assertPermission } from '@/lib/security/rbac';
import { handleApiError } from '@/lib/security/http';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) { try { const u = await requireAuthUser(req); assertPermission(u, 'roles:view'); const roles = await prisma.role.findMany({ include: { permissions: { include: { permission: true } } }, orderBy: { code: 'asc' } }); return NextResponse.json({ roles: roles.map((r) => ({ id: r.id, code: r.code, nameAr: r.nameAr, permissions: r.permissions.map((p) => p.permission.code) })) }); } catch(e) { return handleApiError(e); } }
