-- Access roles, auth sessions, and persisted notifications.
-- Adds referential integrity for users.role and the tables IT needs to wire
-- real sign-in (sessions) and server-pushed notifications.

-- 1) Roles reference table (الأدوار) ---------------------------------------
CREATE TABLE "roles" (
    "key"         TEXT NOT NULL,
    "name_ar"     TEXT NOT NULL,
    "desc_ar"     TEXT NOT NULL DEFAULT '',
    "scope"       TEXT NOT NULL DEFAULT '',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "sort_order"  INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("key")
);

-- Seed the four fixed roles so users.role always resolves to a valid row.
INSERT INTO "roles" ("key","name_ar","desc_ar","scope","permissions","sort_order") VALUES
  ('coord',  'منسق المسار في الجهة', 'يضيف ويحدّث مدخلات مسار واحد داخل جهته.',              'entity+stream', '["item.create","item.update","item.submit","plan.edit"]', 1),
  ('entity', 'ممثل الجهة',           'يتابع كل مسارات جهته ويعتمد المدخلات الجاهزة.',        'entity',        '["item.view.entity","item.approve","item.return","team.manage"]', 2),
  ('path',   'رئيس المسار',          'يراجع مدخلات كل الجهات ضمن مساره ويرشّح للتمويل.',      'stream',        '["item.view.stream","item.nominate","plan.view"]', 3),
  ('ai',     'اللجنة الوطنية',        'إشراف وطني على كل الجهات والمسارات واعتماد التمويل النهائي.', 'national',   '["item.view.all","nomination.review","funding.approve","funding.cancel","phase.edit","budget.set"]', 4);

-- 2) users additions -------------------------------------------------------
ALTER TABLE "users" ADD COLUMN "last_login" TIMESTAMP(3);
CREATE INDEX "users_entity_id_idx" ON "users"("entity_id");
CREATE INDEX "users_stream_id_idx" ON "users"("stream_id");
ALTER TABLE "users" ADD CONSTRAINT "users_role_fkey"
  FOREIGN KEY ("role") REFERENCES "roles"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3) Sessions (UAE PASS / IdP) ---------------------------------------------
CREATE TABLE "sessions" (
    "id"         TEXT NOT NULL,
    "user_id"    TEXT NOT NULL,
    "token"      TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip"         TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Notifications (الإشعارات) ---------------------------------------------
CREATE TABLE "notifications" (
    "id"         TEXT NOT NULL,
    "user_id"    TEXT,
    "role"       TEXT,
    "entity_id"  TEXT,
    "stream_id"  TEXT,
    "item_id"    TEXT,
    "kind"       TEXT NOT NULL,
    "title"      TEXT NOT NULL,
    "body"       TEXT NOT NULL DEFAULT '',
    "read_at"    TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id","read_at");
CREATE INDEX "notifications_role_idx" ON "notifications"("role");
CREATE INDEX "notifications_entity_id_idx" ON "notifications"("entity_id");
CREATE INDEX "notifications_stream_id_idx" ON "notifications"("stream_id");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
