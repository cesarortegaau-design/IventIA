-- CreateTable: EventActivityAssignee
CREATE TABLE "event_activity_assignees" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_activity_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "event_activity_assignees_activity_id_user_id_key" ON "event_activity_assignees"("activity_id", "user_id");

-- AddForeignKey
ALTER TABLE "event_activity_assignees" ADD CONSTRAINT "event_activity_assignees_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "event_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_activity_assignees" ADD CONSTRAINT "event_activity_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE;
