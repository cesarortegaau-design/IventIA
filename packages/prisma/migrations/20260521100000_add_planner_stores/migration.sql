-- CreateTable
CREATE TABLE IF NOT EXISTS "planner_stores" (
    "id"         TEXT NOT NULL,
    "event_id"   TEXT NOT NULL,
    "store_key"  VARCHAR(50) NOT NULL,
    "data"       JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planner_stores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "planner_stores_event_id_store_key_key" ON "planner_stores"("event_id", "store_key");

-- AddForeignKey
ALTER TABLE "planner_stores" ADD CONSTRAINT "planner_stores_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
