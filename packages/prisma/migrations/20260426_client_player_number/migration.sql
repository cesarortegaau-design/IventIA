-- Add player number field to clients
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "player_number" VARCHAR(10);
