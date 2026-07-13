import type { Prisma } from '@prisma/client';

// ============================================================================
// RBAC — Role-Based Access Control aligned with the UX Roles & Access spec.
//
// Four UI roles map to backend role codes:
//   coord  → entity_coordinator   (own entity + own stream, including drafts)
//   entity → entity_representative (own entity, all streams, no drafts)
//   path   → stream_owner          (own stream, ALL entities, approved only)
//   ai     → ai_committee / system_admin / program_admin (everything approved)
//
// Scope enforcement:
//   - system_admin / program_admin / ai_committee → global (no entity/stream filter)
//   - stream_owner → stream-scoped across all entities
//   - entity_representative → entity-scoped across all streams
//   - entity_coordinator → entity-scoped AND stream-scoped
// ============================================================================

export type AuthUser = {
  id: string;
  email: string | null;
  name: string;
  role: string;
  status: string;
  accessEnabled: boolean;
  entityId: string | null;
  streamId: string | null;
  roles: string[];
  permissions: string[];
  entityScopes: string[];
  streamScopes: string[];
};

// Roles with full global access (no entity/stream filtering)
const GLOBAL_ROLES = new Set(['system_admin', 'program_admin', 'ai_committee']);

// Roles that are stream-scoped across ALL entities (no entity filter)
const STREAM_GLOBAL_ROLES = new Set(['stream_owner']);

// Roles that are entity-scoped across ALL streams (no stream filter)
const ENTITY_GLOBAL_ROLES = new Set(['entity_representative', 'entity_admin']);

// ---------------------------------------------------------------------------
// Role checks
// ---------------------------------------------------------------------------

export function hasRole(user: AuthUser, code: string): boolean {
  return user.roles.includes(code);
}

export function hasPermission(user: AuthUser, permission: string): boolean {
  // Only system_admin bypasses all permission checks.
  // program_admin and ai_committee rely on their seeded role_permissions.
  return user.permissions.includes(permission) || isSuperAdmin(user);
}

/** User is system_admin → bypasses all permission checks */
export function isSuperAdmin(user: AuthUser): boolean {
  return user.roles.includes('system_admin');
}

/** User has one of the global (committee/admin) roles → sees everything */
export function isGlobalRole(user: AuthUser): boolean {
  return user.roles.some((r) => GLOBAL_ROLES.has(r));
}

/** Backward-compatible alias for isGlobalRole */
export const canAccessAllEntities = isGlobalRole;

/** User is a stream owner → sees their stream across all entities */
export function isStreamGlobalRole(user: AuthUser): boolean {
  return user.roles.some((r) => STREAM_GLOBAL_ROLES.has(r));
}

/** User is an entity representative → sees their entity across all streams */
export function isEntityGlobalRole(user: AuthUser): boolean {
  return user.roles.some((r) => ENTITY_GLOBAL_ROLES.has(r));
}

// ---------------------------------------------------------------------------
// Entity / stream access checks (for individual resource assertions)
// ---------------------------------------------------------------------------

export function canAccessEntity(user: AuthUser, entityId?: string | null): boolean {
  if (!entityId) return false;
  if (isGlobalRole(user)) return true;
  // Stream owners see all entities for their stream
  if (isStreamGlobalRole(user)) return true;
  // Entity rep / coordinator: check entity scope
  return user.entityScopes.includes(entityId) || user.entityId === entityId;
}

export function canAccessStream(user: AuthUser, streamId?: string | null): boolean {
  if (!streamId) return false;
  if (isGlobalRole(user)) return true;
  // Entity reps see all streams within their entity
  if (isEntityGlobalRole(user)) return true;
  // Stream owner / coordinator: check stream scope
  return user.streamScopes.includes(streamId) || user.streamId === streamId;
}

// ---------------------------------------------------------------------------
// Assertion helpers (throw 403 on failure)
// ---------------------------------------------------------------------------

export function assertPermission(user: AuthUser, permission: string): void {
  if (!hasPermission(user, permission))
    throw Object.assign(new Error('forbidden'), { status: 403 });
}

export function assertEntity(user: AuthUser, entityId?: string | null): void {
  if (!canAccessEntity(user, entityId))
    throw Object.assign(new Error('forbidden-scope'), { status: 403 });
}

export function assertStream(user: AuthUser, streamId?: string | null): void {
  if (!canAccessStream(user, streamId))
    throw Object.assign(new Error('forbidden-scope'), { status: 403 });
}

/**
 * Assert that the user can access an item given its entity AND stream.
 * The logic depends on the user's role:
 *   - Global roles → always pass
 *   - Stream owners → only check stream (they see all entities for their stream)
 *   - Entity reps → only check entity (they see all streams for their entity)
 *   - Coordinators → check BOTH entity and stream
 */
export function assertItemAccess(
  user: AuthUser,
  entityId?: string | null,
  streamId?: string | null
): void {
  if (isGlobalRole(user)) return;
  if (isStreamGlobalRole(user)) {
    assertStream(user, streamId);
    return;
  }
  if (isEntityGlobalRole(user)) {
    assertEntity(user, entityId);
    return;
  }
  // Coordinator or other: check both
  assertEntity(user, entityId);
  assertStream(user, streamId);
}

// ---------------------------------------------------------------------------
// Prisma scope filters for listing queries
// ---------------------------------------------------------------------------

export function buildEntityScopeWhere(user: AuthUser): Prisma.ItemWhereInput {
  if (isGlobalRole(user)) return {};
  if (isStreamGlobalRole(user)) return {}; // stream owners see all entities
  const ids = Array.from(
    new Set([user.entityId, ...user.entityScopes].filter(Boolean))
  ) as string[];
  return { entityId: { in: ids.length ? ids : ['__no_scope__'] } };
}

export function buildStreamScopeWhere(user: AuthUser): Prisma.ItemWhereInput {
  if (isGlobalRole(user)) return {};
  if (isEntityGlobalRole(user)) return {}; // entity reps see all streams
  const ids = Array.from(
    new Set([user.streamId, ...user.streamScopes].filter(Boolean))
  ) as string[];
  return ids.length ? { streamId: { in: ids } } : {};
}

/**
 * Combined item scope filter. The composition depends on the user's role:
 *   - Global → no filter
 *   - Stream owner → stream filter only (across all entities)
 *   - Entity rep → entity filter only (across all streams)
 *   - Coordinator → AND of entity + stream filters
 *
 * Additionally, workflow visibility is enforced:
 *   - Stream owners & committee → only approved items (no drafts, no pending)
 *   - Entity reps → no drafts (submissions onward)
 *   - Coordinators → everything including drafts
 */
export function buildItemScopeWhere(
  user: AuthUser,
  options?: { includeAllWorkflowStates?: boolean }
): Prisma.ItemWhereInput {
  const scopeFilter: Prisma.ItemWhereInput = {
    AND: [buildEntityScopeWhere(user), buildStreamScopeWhere(user)],
  };

  if (options?.includeAllWorkflowStates) return scopeFilter;

  // Workflow visibility per role
  const wfFilter = buildWorkflowVisibilityFilter(user);
  if (wfFilter) {
    return { AND: [scopeFilter, wfFilter] };
  }
  return scopeFilter;
}

/**
 * Returns a Prisma where clause that filters items based on the user's role
 * and which workflow states they are allowed to see:
 *   - Coordinator → sees everything (drafts, pending, approved)
 *   - Entity rep → sees submissions onward (no drafts)
 *   - Stream owner → sees approved items only
 *   - Committee → sees approved items only
 */
function buildWorkflowVisibilityFilter(user: AuthUser): Prisma.ItemWhereInput | null {
  // Coordinators see everything
  if (user.roles.includes('entity_coordinator')) return null;

  // Entity reps: no drafts (wf !== 'draft')
  if (isEntityGlobalRole(user)) {
    return { wf: { not: 'draft' } };
  }

  // Stream owners and committee: only approved items
  // (approved = past entity approval, i.e., wf in exec/launch/done/budget)
  if (isStreamGlobalRole(user) || isGlobalRole(user)) {
    return { wf: { notIn: ['draft', 'ent1'] } };
  }

  return null;
}
