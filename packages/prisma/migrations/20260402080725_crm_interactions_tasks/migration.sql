-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('CALL', 'EMAIL', 'WHATSAPP', 'MEETING', 'NOTE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "client_interactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "subject" VARCHAR(300) NOT NULL,
    "notes" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_tasks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "interaction_id" TEXT,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "assigned_to_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_interactions_tenant_id_client_id_idx" ON "client_interactions"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "client_interactions_tenant_id_occurred_at_idx" ON "client_interactions"("tenant_id", "occurred_at");

-- CreateIndex
CREATE INDEX "client_tasks_tenant_id_client_id_idx" ON "client_tasks"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "client_tasks_tenant_id_assigned_to_id_status_idx" ON "client_tasks"("tenant_id", "assigned_to_id", "status");

-- AddForeignKey
ALTER TABLE "client_interactions" ADD CONSTRAINT "client_interactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_interactions" ADD CONSTRAINT "client_interactions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_interactions" ADD CONSTRAINT "client_interactions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_tasks" ADD CONSTRAINT "client_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_tasks" ADD CONSTRAINT "client_tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_tasks" ADD CONSTRAINT "client_tasks_interaction_id_fkey" FOREIGN KEY ("interaction_id") REFERENCES "client_interactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_tasks" ADD CONSTRAINT "client_tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_tasks" ADD CONSTRAINT "client_tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
