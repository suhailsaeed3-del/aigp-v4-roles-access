-- Extend the workflow enum to the full pipeline used by the client
-- (draft → ent1 → pm1 → pm2 → ent2 → budget → exec → launch → done).
-- Requires PostgreSQL 12+ (ALTER TYPE ... ADD VALUE inside a transaction).
ALTER TYPE "wf_state" ADD VALUE IF NOT EXISTS 'pm1';
ALTER TYPE "wf_state" ADD VALUE IF NOT EXISTS 'pm2';
ALTER TYPE "wf_state" ADD VALUE IF NOT EXISTS 'ent2';
ALTER TYPE "wf_state" ADD VALUE IF NOT EXISTS 'budget';

-- Stage-move marker (نُقل بين المراحل): recorded when an item is moved to a
-- different execution stage so every stakeholder can be notified.
ALTER TABLE "items" ADD COLUMN "stage_move_from" TEXT;
ALTER TABLE "items" ADD COLUMN "stage_move_to" TEXT;
ALTER TABLE "items" ADD COLUMN "stage_move_at" TIMESTAMP(3);
ALTER TABLE "items" ADD COLUMN "stage_move_by" TEXT;
