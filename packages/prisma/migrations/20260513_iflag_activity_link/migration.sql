ALTER TABLE "football_games" ADD COLUMN "activity_id" TEXT UNIQUE;
ALTER TABLE "football_games" ADD CONSTRAINT "football_games_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "event_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
