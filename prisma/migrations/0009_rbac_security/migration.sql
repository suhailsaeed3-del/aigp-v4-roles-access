-- Production RBAC hardening (ported from the V4 roles-access reference):
-- code-based roles + permissions, per-user entity/stream scopes, audit logs,
-- and pre-configured role-assignment rules. Sessions become stateless
-- HMAC-signed cookies (lib/security/session.ts), so the sessions table is
-- dropped. Idempotent so it is safe on databases in any intermediate state.

-- 1) users: production access-management fields ------------------------------
-- users.role keeps its legacy UI key values (admin|coord|entity|path|ai) but
-- is no longer a FK — the restructured roles table is keyed by code instead.
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_fkey";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "access_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_provider" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "external_sub" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users"("status");
CREATE INDEX IF NOT EXISTS "users_auth_provider_external_sub_idx" ON "users"("auth_provider", "external_sub");

-- 2) sessions: superseded by stateless HMAC cookie tokens --------------------
DROP TABLE IF EXISTS "sessions";

-- 3) roles: legacy key/permissions shape → code-based reference shape --------
-- The 0007 table was keyed by "key" with a JSON permissions column; the new
-- shape is id + unique code with a role_permissions join. Only drop when the
-- legacy shape is detected so re-runs never destroy seeded RBAC data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'roles' AND column_name = 'key'
  ) THEN
    DROP TABLE "roles" CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "roles" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name_ar" TEXT NOT NULL,
  "description" TEXT,
  "is_system" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "roles_code_key" ON "roles"("code");

-- 4) permissions + role_permissions ------------------------------------------
CREATE TABLE IF NOT EXISTS "permissions" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_code_key" ON "permissions"("code");

CREATE TABLE IF NOT EXISTS "role_permissions" (
  "role_id" TEXT NOT NULL,
  "permission_id" TEXT NOT NULL,
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id"),
  CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id")
    REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id")
    REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 5) user_roles ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "user_roles" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id")
    REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");
CREATE INDEX IF NOT EXISTS "user_roles_role_id_idx" ON "user_roles"("role_id");

-- 6) per-user entity / stream scopes ------------------------------------------
CREATE TABLE IF NOT EXISTS "user_entity_scopes" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_entity_scopes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_entity_scopes_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_entity_scopes_entity_id_fkey" FOREIGN KEY ("entity_id")
    REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_entity_scopes_user_id_entity_id_key" ON "user_entity_scopes"("user_id", "entity_id");
CREATE INDEX IF NOT EXISTS "user_entity_scopes_entity_id_idx" ON "user_entity_scopes"("entity_id");

CREATE TABLE IF NOT EXISTS "user_stream_scopes" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "stream_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_stream_scopes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_stream_scopes_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_stream_scopes_stream_id_fkey" FOREIGN KEY ("stream_id")
    REFERENCES "streams"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_stream_scopes_user_id_stream_id_key" ON "user_stream_scopes"("user_id", "stream_id");
CREATE INDEX IF NOT EXISTS "user_stream_scopes_stream_id_idx" ON "user_stream_scopes"("stream_id");

-- 7) audit_logs ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "action" TEXT NOT NULL,
  "resource_type" TEXT,
  "resource_id" TEXT,
  "entity_id" TEXT,
  "stream_id" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id")
    REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");
CREATE INDEX IF NOT EXISTS "audit_logs_stream_id_idx" ON "audit_logs"("stream_id");
CREATE INDEX IF NOT EXISTS "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- 8) role_assignment_rules -------------------------------------------------------
-- No FKs on entity_id/stream_id (rules may pre-date the referenced rows);
-- the application layer validates these references at runtime.
CREATE TABLE IF NOT EXISTS "role_assignment_rules" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role_code" TEXT NOT NULL,
  "entity_id" TEXT,
  "stream_id" TEXT,
  "display_name" TEXT,
  "is_consumed" BOOLEAN NOT NULL DEFAULT false,
  "consumed_at" TIMESTAMP(3),
  "consumed_by" TEXT,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "role_assignment_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "role_assignment_rules_email_key" ON "role_assignment_rules"("email");
CREATE INDEX IF NOT EXISTS "role_assignment_rules_role_code_idx" ON "role_assignment_rules"("role_code");
CREATE INDEX IF NOT EXISTS "role_assignment_rules_is_consumed_idx" ON "role_assignment_rules"("is_consumed");
