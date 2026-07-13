-- Centrally managed launch plans (إدارة خطط الإطلاق)
CREATE TABLE "launch_plans" (
    "id" TEXT NOT NULL,
    "batch" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ltype" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL DEFAULT '',
    "desc" TEXT NOT NULL DEFAULT '',
    "scope" TEXT NOT NULL DEFAULT '',
    "budget" TEXT NOT NULL DEFAULT '',
    "budget_amount" BIGINT,
    CONSTRAINT "launch_plans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "launch_plans_batch_idx" ON "launch_plans"("batch");

ALTER TABLE "items" ADD COLUMN "launch_plan_id" TEXT;

CREATE INDEX "items_launch_plan_id_idx" ON "items"("launch_plan_id");

ALTER TABLE "items" ADD CONSTRAINT "items_launch_plan_id_fkey"
    FOREIGN KEY ("launch_plan_id") REFERENCES "launch_plans"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
