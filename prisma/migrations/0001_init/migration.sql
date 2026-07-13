-- CreateEnum
CREATE TYPE "wf_state" AS ENUM ('draft', 'ent1', 'exec', 'launch', 'done');

-- CreateEnum
CREATE TYPE "item_type" AS ENUM ('project', 'initiative', 'operation', 'service');

-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streams" (
    "id" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "desc_ar" TEXT NOT NULL,
    "head_name" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_phases" (
    "idx" INTEGER NOT NULL,
    "name_ar" TEXT NOT NULL,
    "desc_ar" TEXT NOT NULL,
    "deadline" TEXT NOT NULL,

    CONSTRAINT "program_phases_pkey" PRIMARY KEY ("idx")
);

-- CreateTable
CREATE TABLE "exec_batches" (
    "id" INTEGER NOT NULL,
    "name_ar" TEXT NOT NULL,
    "period_ar" TEXT NOT NULL,
    "desc_ar" TEXT NOT NULL,
    "starts_on" TEXT NOT NULL,
    "ends_on" TEXT NOT NULL,

    CONSTRAINT "exec_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "entity_reps" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "entity_reps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_owners" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "stream_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "position" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "is_self" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "stream_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "type" "item_type" NOT NULL,
    "stream_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT NOT NULL DEFAULT '',
    "wf" "wf_state" NOT NULL DEFAULT 'draft',
    "approval" TEXT NOT NULL DEFAULT 'مسودة',
    "priority" TEXT,
    "rank" INTEGER,
    "complexity" TEXT,
    "impact" TEXT,
    "status" TEXT,
    "transformability" TEXT,
    "readiness" TEXT,
    "usage_intensity" TEXT,
    "transform_priority" TEXT,
    "automation_pct" INTEGER,
    "automation_level" TEXT,
    "automation_system" TEXT,
    "complexity_level" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "scope_of_work" TEXT,
    "budget" TEXT,
    "budget_amount" BIGINT,
    "scope_approval" TEXT,
    "scope_file" TEXT,
    "expected_outputs" TEXT,
    "expected_outcomes" TEXT,
    "expected_impact" TEXT,
    "ai_models" INTEGER,
    "target_pct" INTEGER,
    "end_date" TEXT,
    "op_type" TEXT,
    "sub_activities" TEXT,
    "sector" TEXT,
    "dept" TEXT,
    "section" TEXT,
    "service_owner" TEXT,
    "target_users" TEXT,
    "current_journey" TEXT,
    "pain_points" TEXT,
    "expected_improvement" TEXT,
    "exec_batch" TEXT,
    "ret_type" TEXT,
    "ret_from" TEXT,
    "ret_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exec_checklist_items" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'لم تبدأ',
    "new_date" TEXT,
    "reason" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "exec_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_milestones" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "batch_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "starts_on" TEXT,
    "ends_on" TEXT,

    CONSTRAINT "sub_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "launches" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ltype" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "desc" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'مخطط',
    "done" BOOLEAN NOT NULL DEFAULT false,
    "done_at" TIMESTAMP(3),

    CONSTRAINT "launches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_launches" (
    "item_id" TEXT NOT NULL,
    "launch_id" TEXT NOT NULL,
    "shared" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "item_launches_pkey" PRIMARY KEY ("item_id","launch_id")
);

-- CreateTable
CREATE TABLE "log_entries" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "by_name" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nominations" (
    "item_id" TEXT NOT NULL,
    "by_name" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "stream_id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "direct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "nominations_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "fundings" (
    "item_id" TEXT NOT NULL,
    "by_name" TEXT NOT NULL DEFAULT 'اللجنة الوطنية',
    "at" TIMESTAMP(3) NOT NULL,
    "direct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "fundings_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "funding_cancellations" (
    "item_id" TEXT NOT NULL,
    "by_name" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "funding_cancellations_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "app_state" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "data" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entities_name_ar_key" ON "entities"("name_ar");

-- CreateIndex
CREATE UNIQUE INDEX "streams_name_ar_key" ON "streams"("name_ar");

-- CreateIndex
CREATE UNIQUE INDEX "exec_batches_name_ar_key" ON "exec_batches"("name_ar");

-- CreateIndex
CREATE UNIQUE INDEX "entity_reps_entity_id_key" ON "entity_reps"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "stream_owners_entity_id_stream_id_key" ON "stream_owners"("entity_id", "stream_id");

-- CreateIndex
CREATE INDEX "items_entity_id_idx" ON "items"("entity_id");

-- CreateIndex
CREATE INDEX "items_stream_id_idx" ON "items"("stream_id");

-- CreateIndex
CREATE INDEX "items_wf_idx" ON "items"("wf");

-- CreateIndex
CREATE UNIQUE INDEX "exec_checklist_items_item_id_key_key" ON "exec_checklist_items"("item_id", "key");

-- CreateIndex
CREATE INDEX "sub_milestones_item_id_idx" ON "sub_milestones"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "launches_title_date_key" ON "launches"("title", "date");

-- CreateIndex
CREATE INDEX "log_entries_item_id_at_idx" ON "log_entries"("item_id", "at");

-- AddForeignKey
ALTER TABLE "entity_reps" ADD CONSTRAINT "entity_reps_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_owners" ADD CONSTRAINT "stream_owners_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_owners" ADD CONSTRAINT "stream_owners_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exec_checklist_items" ADD CONSTRAINT "exec_checklist_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_milestones" ADD CONSTRAINT "sub_milestones_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_launches" ADD CONSTRAINT "item_launches_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_launches" ADD CONSTRAINT "item_launches_launch_id_fkey" FOREIGN KEY ("launch_id") REFERENCES "launches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nominations" ADD CONSTRAINT "nominations_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fundings" ADD CONSTRAINT "fundings_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding_cancellations" ADD CONSTRAINT "funding_cancellations_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

