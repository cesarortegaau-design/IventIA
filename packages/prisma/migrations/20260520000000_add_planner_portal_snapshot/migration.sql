CREATE TABLE "planner_portal_snapshots" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "data" JSONB NOT NULL,
    "published_by_id" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planner_portal_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "planner_portal_snapshots_event_id_key" ON "planner_portal_snapshots"("event_id");

CREATE INDEX "planner_portal_snapshots_tenant_id_idx" ON "planner_portal_snapshots"("tenant_id");

ALTER TABLE "planner_portal_snapshots" ADD CONSTRAINT "planner_portal_snapshots_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "planner_portal_snapshots" ADD CONSTRAINT "planner_portal_snapshots_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "planner_portal_snapshots" ADD CONSTRAINT "planner_portal_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
