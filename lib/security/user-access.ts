import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { env } from './env';
import { writeAuditLog } from './audit';

type Identity = {
  provider: string;
  externalSub?: string;
  email?: string;
  name?: string;
};

/**
 * Maps role codes from RoleAssignmentRule to the legacy `role` field
 * on the User model (entity | coord | path | ai).
 */
function legacyRoleFromCode(roleCode: string): string {
  switch (roleCode) {
    case 'system_admin':
    case 'program_admin':
    case 'ai_committee':
      return 'ai';
    case 'stream_owner':
      return 'path';
    case 'entity_coordinator':
      return 'coord';
    case 'entity_admin':
      return 'entity_admin';
    case 'entity_representative':
    case 'viewer':
    default:
      return 'entity';
  }
}

/**
 * Checks if there's a pre-configured RoleAssignmentRule for this email.
 * If found and not yet consumed, applies the role + scopes to the user.
 * Returns true if a rule was applied.
 */
async function applyAutoRoleAssignment(
  tx: Prisma.TransactionClient,
  userId: string,
  email: string
): Promise<boolean> {
  if (!email) return false;

  const rule = await (tx as any).roleAssignmentRule.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!rule || rule.isConsumed) return false;

  // Find the role by code
  const role = await tx.role.findUnique({ where: { code: rule.roleCode } });
  if (!role) return false;

  // Remove any existing roles (single-role-per-user enforcement)
  await tx.userRole.deleteMany({ where: { userId } });

  // Assign the new role
  await tx.userRole.create({
    data: { userId, roleId: role.id },
  });

  // Assign entity scope if specified
  if (rule.entityId) {
    await tx.userEntityScope.upsert({
      where: { userId_entityId: { userId, entityId: rule.entityId } },
      update: {},
      create: { userId, entityId: rule.entityId },
    });
    // Also set the legacy entityId on the user
    await tx.user.update({
      where: { id: userId },
      data: { entityId: rule.entityId },
    });
  }

  // Assign stream scope if specified
  if (rule.streamId) {
    await tx.userStreamScope.upsert({
      where: { userId_streamId: { userId, streamId: rule.streamId } },
      update: {},
      create: { userId, streamId: rule.streamId },
    });
    // Also set the legacy streamId on the user
    await tx.user.update({
      where: { id: userId },
      data: { streamId: rule.streamId },
    });
  }

  // Update the user's legacy role field and activate account
  await tx.user.update({
    where: { id: userId },
    data: {
      role: legacyRoleFromCode(rule.roleCode),
      status: 'active',
      accessEnabled: true,
      isActive: true,
      lastLogin: new Date(),
      ...(rule.displayName ? { name: rule.displayName } : {}),
    },
  });

  // Mark the rule as consumed
  await (tx as any).roleAssignmentRule.update({
    where: { id: rule.id },
    data: {
      isConsumed: true,
      consumedAt: new Date(),
      consumedBy: userId,
    },
  });

  // Audit log
  await writeAuditLog(
    {
      actorUserId: userId,
      action: 'auto_role_assigned',
      resourceType: 'user',
      resourceId: userId,
      metadata: {
        ruleId: rule.id,
        roleCode: rule.roleCode,
        entityId: rule.entityId,
        streamId: rule.streamId,
      },
    },
    tx
  );

  return true;
}

export async function ensureUserFromIdentity(identity: Identity) {
  const email = (identity.email || '').trim().toLowerCase();
  const isBootstrap = !!email && env.bootstrapAdminEmails.includes(email);

  return prisma.$transaction(async (tx) => {
    const existing = email
      ? await tx.user.findUnique({ where: { email } })
      : identity.externalSub
        ? await tx.user.findFirst({ where: { authProvider: identity.provider, externalSub: identity.externalSub } })
        : null;

    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            name: identity.name || existing.name,
            email: email || existing.email,
            authProvider: identity.provider,
            externalSub: identity.externalSub || existing.externalSub,
            ...(isBootstrap ? { status: 'active', accessEnabled: true, isActive: true, role: 'ai' } : {}),
            lastLogin: isBootstrap || existing.accessEnabled ? new Date() : existing.lastLogin,
          },
        })
      : await tx.user.create({
          data: {
            role: isBootstrap ? 'ai' : 'entity',
            name: identity.name || email || 'مستخدم جديد',
            email: email || null,
            authProvider: identity.provider,
            externalSub: identity.externalSub || null,
            status: isBootstrap ? 'active' : 'pending',
            accessEnabled: isBootstrap,
            isActive: isBootstrap,
            lastLogin: isBootstrap ? new Date() : null,
          },
        });

    // 1. Bootstrap admin (highest priority)
    if (isBootstrap) {
      const role = await tx.role.findUnique({ where: { code: 'system_admin' } });
      if (role) {
        await tx.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: role.id } },
          update: {},
          create: { userId: user.id, roleId: role.id },
        });
      }
      await writeAuditLog({ actorUserId: user.id, action: 'bootstrap_admin_login', resourceType: 'user', resourceId: user.id }, tx);
      return user;
    }

    // 2. Auto-role assignment from pre-configured rules
    //    Applies on first login (when user has no roles yet) OR for new users
    const existingRoles = await tx.userRole.findMany({ where: { userId: user.id } });
    if (existingRoles.length === 0 && email) {
      const applied = await applyAutoRoleAssignment(tx, user.id, email);
      if (applied) {
        // Re-fetch user with updated fields
        return tx.user.findUniqueOrThrow({ where: { id: user.id } });
      }
    }

    return user;
  });
}

export async function assignRole(tx: Prisma.TransactionClient | PrismaClient, userId: string, roleCode: string) {
  const role = await tx.role.findUnique({ where: { code: roleCode } });
  if (!role) throw new Error(`role-not-found:${roleCode}`);
  return tx.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    update: {},
    create: { userId, roleId: role.id },
  });
}
