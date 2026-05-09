-- CreateEnum CollabTaskStatus
CREATE TYPE "CollabTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'ON_HOLD', 'DONE', 'CANCELLED');

-- CreateEnum CollabTaskPriority
CREATE TYPE "CollabTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable collab_tasks
CREATE TABLE "collab_tasks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" "CollabTaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "CollabTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "assigned_to_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "event_id" TEXT,
    "client_id" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collab_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable collab_task_departments
CREATE TABLE "collab_task_departments" (
    "task_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,

    CONSTRAINT "collab_task_departments_pkey" PRIMARY KEY ("task_id","department_id")
);

-- CreateTable collab_task_orders
CREATE TABLE "collab_task_orders" (
    "task_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,

    CONSTRAINT "collab_task_orders_pkey" PRIMARY KEY ("task_id","order_id")
);

-- CreateTable collab_task_documents
CREATE TABLE "collab_task_documents" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "file_name" VARCHAR(500) NOT NULL,
    "blob_key" VARCHAR(1000) NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collab_task_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable collab_task_comments
CREATE TABLE "collab_task_comments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collab_task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on collab_tasks
CREATE INDEX "collab_tasks_tenant_id_status_idx" ON "collab_tasks"("tenant_id", "status");
CREATE INDEX "collab_tasks_tenant_id_assigned_to_id_status_idx" ON "collab_tasks"("tenant_id", "assigned_to_id", "status");

-- CreateIndex on collab_task_documents
CREATE INDEX "collab_task_documents_task_id_idx" ON "collab_task_documents"("task_id");

-- CreateIndex on collab_task_comments
CREATE INDEX "collab_task_comments_task_id_created_at_idx" ON "collab_task_comments"("task_id", "created_at");

-- AddForeignKey collab_tasks
ALTER TABLE "collab_tasks" ADD CONSTRAINT "collab_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "collab_tasks" ADD CONSTRAINT "collab_tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "collab_tasks" ADD CONSTRAINT "collab_tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "collab_tasks" ADD CONSTRAINT "collab_tasks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "collab_tasks" ADD CONSTRAINT "collab_tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey collab_task_departments
ALTER TABLE "collab_task_departments" ADD CONSTRAINT "collab_task_departments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "collab_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collab_task_departments" ADD CONSTRAINT "collab_task_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey collab_task_orders
ALTER TABLE "collab_task_orders" ADD CONSTRAINT "collab_task_orders_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "collab_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collab_task_orders" ADD CONSTRAINT "collab_task_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey collab_task_documents
ALTER TABLE "collab_task_documents" ADD CONSTRAINT "collab_task_documents_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "collab_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collab_task_documents" ADD CONSTRAINT "collab_task_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "collab_task_documents" ADD CONSTRAINT "collab_task_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey collab_task_comments
ALTER TABLE "collab_task_comments" ADD CONSTRAINT "collab_task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "collab_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collab_task_comments" ADD CONSTRAINT "collab_task_comments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "collab_task_comments" ADD CONSTRAINT "collab_task_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
