-- Enum SportCategory
DO $$ BEGIN
  CREATE TYPE "SportCategory" AS ENUM ('FEMENIL', 'VARONIL', 'MIXTO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum ActivityType - create fresh with all values if not exists, otherwise add missing values
DO $$ BEGIN
  CREATE TYPE "ActivityType" AS ENUM ('TASK', 'MILESTONE', 'PHASE', 'MEETING', 'REHEARSAL', 'LOGISTICS', 'CATERING', 'TECHNICAL', 'SECURITY', 'CUSTOM', 'ROUND', 'GAME');
EXCEPTION WHEN duplicate_object THEN
  ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'ROUND';
  ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'GAME';
END $$;

-- TournamentConfig
CREATE TABLE IF NOT EXISTS "TournamentConfig" (
  "id"                  VARCHAR(36)  NOT NULL PRIMARY KEY,
  "tenant_id"           TEXT         NOT NULL,
  "event_id"            TEXT         NOT NULL UNIQUE,
  "num_rounds"          INT          NOT NULL DEFAULT 1,
  "has_playoffs"        BOOLEAN      NOT NULL DEFAULT false,
  "qualification_system" VARCHAR(200),
  "reg_fee_per_person"  DECIMAL(12,2),
  "reg_fee_per_team"    DECIMAL(12,2),
  "settings"            JSONB        NOT NULL DEFAULT '{}',
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "TournamentConfig_event_id_key" ON "TournamentConfig"("event_id");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TournamentConfig_event_id_fkey') THEN
    ALTER TABLE "TournamentConfig" ADD CONSTRAINT "TournamentConfig_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- TournamentVenue
CREATE TABLE IF NOT EXISTS "TournamentVenue" (
  "id"        VARCHAR(36)  NOT NULL PRIMARY KEY,
  "tenant_id" TEXT         NOT NULL,
  "event_id"  TEXT         NOT NULL,
  "name"      VARCHAR(200) NOT NULL,
  "address"   VARCHAR(400),
  "capacity"  INT,
  "notes"     TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "TournamentVenue_tenant_id_event_id_idx" ON "TournamentVenue"("tenant_id", "event_id");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TournamentVenue_event_id_fkey') THEN
    ALTER TABLE "TournamentVenue" ADD CONSTRAINT "TournamentVenue_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- TeamEventRegistration
CREATE TABLE IF NOT EXISTS "TeamEventRegistration" (
  "id"              VARCHAR(36)     NOT NULL PRIMARY KEY,
  "tenant_id"       TEXT            NOT NULL,
  "event_id"        TEXT            NOT NULL,
  "team_client_id"  TEXT            NOT NULL,
  "category"        "SportCategory" NOT NULL,
  "created_at"      TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "TeamEventRegistration_event_id_team_client_id_category_key"
  ON "TeamEventRegistration"("event_id", "team_client_id", "category");
CREATE INDEX IF NOT EXISTS "TeamEventRegistration_tenant_id_event_id_idx"
  ON "TeamEventRegistration"("tenant_id", "event_id");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamEventRegistration_event_id_fkey') THEN
    ALTER TABLE "TeamEventRegistration" ADD CONSTRAINT "TeamEventRegistration_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamEventRegistration_team_client_id_fkey') THEN
    ALTER TABLE "TeamEventRegistration" ADD CONSTRAINT "TeamEventRegistration_team_client_id_fkey"
    FOREIGN KEY ("team_client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- SportMatchData
CREATE TABLE IF NOT EXISTS "SportMatchData" (
  "id"              VARCHAR(36)     NOT NULL PRIMARY KEY,
  "activity_id"     TEXT            NOT NULL UNIQUE,
  "home_team_id"    TEXT            NOT NULL,
  "visiting_team_id" TEXT           NOT NULL,
  "category"        "SportCategory" NOT NULL,
  "venue_id"        TEXT,
  "round"           INT             NOT NULL DEFAULT 1,
  "home_score"      INT,
  "visiting_score"  INT,
  "stats"           JSONB           NOT NULL DEFAULT '{}',
  "created_at"      TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "SportMatchData_activity_id_key" ON "SportMatchData"("activity_id");
CREATE INDEX IF NOT EXISTS "SportMatchData_home_team_id_idx"     ON "SportMatchData"("home_team_id");
CREATE INDEX IF NOT EXISTS "SportMatchData_visiting_team_id_idx" ON "SportMatchData"("visiting_team_id");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SportMatchData_activity_id_fkey') THEN
    ALTER TABLE "SportMatchData" ADD CONSTRAINT "SportMatchData_activity_id_fkey"
    FOREIGN KEY ("activity_id") REFERENCES "EventActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SportMatchData_home_team_id_fkey') THEN
    ALTER TABLE "SportMatchData" ADD CONSTRAINT "SportMatchData_home_team_id_fkey"
    FOREIGN KEY ("home_team_id") REFERENCES "Client"("id") ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SportMatchData_visiting_team_id_fkey') THEN
    ALTER TABLE "SportMatchData" ADD CONSTRAINT "SportMatchData_visiting_team_id_fkey"
    FOREIGN KEY ("visiting_team_id") REFERENCES "Client"("id") ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SportMatchData_venue_id_fkey') THEN
    ALTER TABLE "SportMatchData" ADD CONSTRAINT "SportMatchData_venue_id_fkey"
    FOREIGN KEY ("venue_id") REFERENCES "TournamentVenue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
