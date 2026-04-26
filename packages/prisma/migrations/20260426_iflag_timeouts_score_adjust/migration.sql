-- Add timeout counters to football_games
ALTER TABLE "football_games" ADD COLUMN IF NOT EXISTS "local_timeouts_h1" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "football_games" ADD COLUMN IF NOT EXISTS "local_timeouts_h2" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "football_games" ADD COLUMN IF NOT EXISTS "visiting_timeouts_h1" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "football_games" ADD COLUMN IF NOT EXISTS "visiting_timeouts_h2" INTEGER NOT NULL DEFAULT 0;

-- Add TIMEOUT and SCORE_ADJUST to GameEventType enum
ALTER TYPE "GameEventType" ADD VALUE IF NOT EXISTS 'TIMEOUT';
ALTER TYPE "GameEventType" ADD VALUE IF NOT EXISTS 'SCORE_ADJUST';
