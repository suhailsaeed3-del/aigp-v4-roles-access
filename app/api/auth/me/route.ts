import { NextRequest, NextResponse } from 'next/server';
import { loadAuthUser } from '@/lib/security/auth';
import { jsonError, messages } from '@/lib/security/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await loadAuthUser(req);
  if (!user) return jsonError('UNAUTHENTICATED', messages.unauthenticated, 401);
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.name,
      legacyRole: user.role,
      status: user.status,
      accessEnabled: user.accessEnabled,
      entityId: user.entityId,
      streamId: user.streamId,
      entityScopes: user.entityScopes,
      streamScopes: user.streamScopes,
    },
    roles: user.roles,
    permissions: user.permissions,
  });
}
