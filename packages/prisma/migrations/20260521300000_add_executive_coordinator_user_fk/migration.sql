-- Cleanup: drop incorrectly typed columns added by a previous failed migration (if they exist)
ALTER TABLE "events" DROP COLUMN IF EXISTS "executive_user_id";
ALTER TABLE "events" DROP COLUMN IF EXISTS "coordinator_user_id";
