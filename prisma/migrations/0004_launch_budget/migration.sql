-- Launch-level informational cost (funding totals keep using the execution budget)
ALTER TABLE "launch_plans" ADD COLUMN "launch_budget" TEXT NOT NULL DEFAULT '';
