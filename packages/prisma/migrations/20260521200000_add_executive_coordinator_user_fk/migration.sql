-- AddColumn: executive_user_id and coordinator_user_id on events
ALTER TABLE "events" ADD COLUMN "executive_user_id" UUID;
ALTER TABLE "events" ADD COLUMN "coordinator_user_id" UUID;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_executive_user_id_fkey"
  FOREIGN KEY ("executive_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "events" ADD CONSTRAINT "events_coordinator_user_id_fkey"
  FOREIGN KEY ("coordinator_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
