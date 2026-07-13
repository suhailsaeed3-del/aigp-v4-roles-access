-- Items may participate in several launch plans within their single batch
CREATE TABLE "item_launch_plans" (
    "item_id" TEXT NOT NULL,
    "launch_plan_id" TEXT NOT NULL,
    CONSTRAINT "item_launch_plans_pkey" PRIMARY KEY ("item_id", "launch_plan_id")
);

ALTER TABLE "item_launch_plans" ADD CONSTRAINT "item_launch_plans_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_launch_plans" ADD CONSTRAINT "item_launch_plans_launch_plan_id_fkey"
    FOREIGN KEY ("launch_plan_id") REFERENCES "launch_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- carry over the legacy single-plan links
INSERT INTO "item_launch_plans" ("item_id", "launch_plan_id")
SELECT "id", "launch_plan_id" FROM "items" WHERE "launch_plan_id" IS NOT NULL;

DROP INDEX IF EXISTS "items_launch_plan_id_idx";
ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "items_launch_plan_id_fkey";
ALTER TABLE "items" DROP COLUMN IF EXISTS "launch_plan_id";
