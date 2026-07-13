import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from './session';
import type { AuthUser } from './rbac';

export async function loadAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const session = getSession(req);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      entityScopes: true,
      streamScopes: true,
    },
  });
  if (!user) return null;

  const roleCodes = user.roles.map((ur) => ur.role.code);
  const permissionCodes = Array.from(
    new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code)))
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    accessEnabled: user.accessEnabled,
    entityId: user.entityId,
    streamId: user.streamId,
    roles: roleCodes,
    permissions: permissionCodes,
    entityScopes: user.entityScopes.map((s) => s.entityId),
    streamScopes: user.streamScopes.map((s) => s.streamId),
  };
}

export async function requireAuthUser(req: NextRequest): Promise<AuthUser> {
  const user = await loadAuthUser(req);
  if (!user) throw Object.assign(new Error('unauthenticated'), { status: 401 });
  if (user.status !== 'active' || !user.accessEnabled) {
    throw Object.assign(new Error('disabled'), { status: 403 });
  }
  return user;
}
