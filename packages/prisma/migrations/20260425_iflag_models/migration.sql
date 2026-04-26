-- Migration: Add I-Flag football game models and client/event sport fields

-- Add logoUrl and isTeam to clients
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "logo_url" VARCHAR(500);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "is_team" BOOLEAN NOT NULL DEFAULT false;

-- Add sport team fields to events
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "sport_local_team_id" UUID;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "sport_visiting_team_id" UUID;

-- Create GameStatus enum
DO $$ BEGIN
  CREATE TYPE "GameStatus" AS ENUM ('PENDING', 'ATTENDANCE', 'IN_PROGRESS', 'HALFTIME', 'FINISHED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create GameEventType enum
DO $$ BEGIN
  CREATE TYPE "GameEventType" AS ENUM (
    'TOUCHDOWN', 'EXTRA_POINT', 'SAFETY', 'FLAG_PENALTY',
    'DOWN_UPDATE', 'POSSESSION_CHANGE',
    'GAME_START', 'GAME_END', 'HALFTIME_START', 'HALFTIME_END',
    'TIMER_START', 'TIMER_STOP'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create football_games table
CREATE TABLE IF NOT EXISTS "football_games" (
  "id"                  UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           UUID        NOT NULL,
  "event_id"            UUID        NOT NULL,
  "local_team_id"       UUID        NOT NULL,
  "visiting_team_id"    UUID        NOT NULL,
  "status"              "GameStatus" NOT NULL DEFAULT 'PENDING',
  "local_score"         INTEGER     NOT NULL DEFAULT 0,
  "visiting_score"      INTEGER     NOT NULL DEFAULT 0,
  "current_quarter"     INTEGER     NOT NULL DEFAULT 1,
  "offense_team_id"     UUID,
  "current_down"        INTEGER     NOT NULL DEFAULT 1,
  "yards_to_first"      INTEGER     NOT NULL DEFAULT 10,
  "timer_seconds"       INTEGER     NOT NULL DEFAULT 0,
  "timer_running"       BOOLEAN     NOT NULL DEFAULT false,
  "timer_last_started"  TIMESTAMP(3),
  "notes"               TEXT,
  "started_at"          TIMESTAMP(3),
  "finished_at"         TIMESTAMP(3),
  "created_by_id"       UUID        NOT NULL,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL,

  CONSTRAINT "football_games_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "football_games_tenant_id_event_id_idx"
  ON "football_games"("tenant_id", "event_id");

ALTER TABLE "football_games"
  ADD CONSTRAINT "football_games_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "football_games_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "football_games_local_team_id_fkey"
    FOREIGN KEY ("local_team_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "football_games_visiting_team_id_fkey"
    FOREIGN KEY ("visiting_team_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "football_games_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create player_attendance table
CREATE TABLE IF NOT EXISTS "player_attendance" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "game_id"    UUID         NOT NULL,
  "player_id"  UUID         NOT NULL,
  "team_id"    UUID         NOT NULL,
  "present"    BOOLEAN      NOT NULL DEFAULT false,
  "number"     VARCHAR(10),
  "position"   VARCHAR(50),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "player_attendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "player_attendance_game_id_player_id_key"
  ON "player_attendance"("game_id", "player_id");

CREATE INDEX IF NOT EXISTS "player_attendance_game_id_team_id_idx"
  ON "player_attendance"("game_id", "team_id");

ALTER TABLE "player_attendance"
  ADD CONSTRAINT "player_attendance_game_id_fkey"
    FOREIGN KEY ("game_id") REFERENCES "football_games"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "player_attendance_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create game_events table
CREATE TABLE IF NOT EXISTS "game_events" (
  "id"           UUID           NOT NULL DEFAULT gen_random_uuid(),
  "game_id"      UUID           NOT NULL,
  "tenant_id"    UUID           NOT NULL,
  "type"         "GameEventType" NOT NULL,
  "team_id"      UUID,
  "player_id"    UUID,
  "quarter"      INTEGER,
  "down"         INTEGER,
  "points"       INTEGER        NOT NULL DEFAULT 0,
  "description"  VARCHAR(500),
  "metadata"     JSONB          NOT NULL DEFAULT '{}',
  "created_by_id" UUID          NOT NULL,
  "created_at"   TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "game_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "game_events_game_id_idx" ON "game_events"("game_id");
CREATE INDEX IF NOT EXISTS "game_events_tenant_id_idx" ON "game_events"("tenant_id");

ALTER TABLE "game_events"
  ADD CONSTRAINT "game_events_game_id_fkey"
    FOREIGN KEY ("game_id") REFERENCES "football_games"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "game_events_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "game_events_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
