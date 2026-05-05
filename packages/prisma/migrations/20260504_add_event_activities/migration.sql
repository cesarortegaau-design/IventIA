-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('TASK', 'MILESTONE', 'PHASE', 'MEETING', 'REHEARSAL', 'LOGISTICS', 'CATERING', 'TECHNICAL', 'SECURITY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ActivityPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "event_activities" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "activity_type" "ActivityType" NOT NULL DEFAULT 'TASK',
    "status" "ActivityStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "ActivityPriority" NOT NULL DEFAULT 'MEDIUM',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "duration_mins" INTEGER,
    "assigned_to_id" TEXT,
    "space_id" TEXT,
    "order_id" TEXT,
    "crm_task_id" TEXT,
    "color" VARCHAR(30),
    "position" INTEGER NOT NULL DEFAULT 0,
    "parent_id" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_activities_tenant_id_event_id_idx" ON "event_activities"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "event_activities_tenant_id_assigned_to_id_status_idx" ON "event_activities"("tenant_id", "assigned_to_id", "status");

-- AddForeignKey
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "event_spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_crm_task_id_fkey" FOREIGN KEY ("crm_task_id") REFERENCES "client_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "event_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
