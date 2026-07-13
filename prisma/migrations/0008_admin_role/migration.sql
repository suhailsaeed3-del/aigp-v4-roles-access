-- System administrator role (مشرف النظام): manages users & roles and assigns
-- the stream heads (رؤساء المسارات) and national committee (اللجنة الوطنية).
-- Idempotent so it is safe on databases that already ran the seed.
INSERT INTO "roles" ("key","name_ar","desc_ar","scope","permissions","sort_order")
VALUES ('admin', 'مشرف النظام', 'يدير المستخدمين والأدوار، ويعيّن رؤساء المسارات وأعضاء اللجنة الوطنية.', 'system', '["users.manage","roles.view","streamhead.assign","committee.assign"]', 0)
ON CONFLICT ("key") DO NOTHING;
