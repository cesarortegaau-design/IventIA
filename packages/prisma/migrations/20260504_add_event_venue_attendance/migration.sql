-- Add venue and expected_attendance to events table
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venue" VARCHAR(300);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "expected_attendance" INTEGER;
