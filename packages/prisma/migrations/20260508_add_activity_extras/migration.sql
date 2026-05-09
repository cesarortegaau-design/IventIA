-- CreateTable: EventActivityDocument
CREATE TABLE "event_activity_documents" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "file_name" VARCHAR(500) NOT NULL,
    "blob_key" VARCHAR(1000) NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_activity_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EventActivityDepartment
CREATE TABLE "event_activity_departments" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    CONSTRAINT "event_activity_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EventActivityOrder
CREATE TABLE "event_activity_orders" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    CONSTRAINT "event_activity_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_activity_documents_activity_id_idx" ON "event_activity_documents"("activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_activity_departments_activity_id_department_id_key" ON "event_activity_departments"("activity_id", "department_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_activity_orders_activity_id_order_id_key" ON "event_activity_orders"("activity_id", "order_id");

-- AddForeignKey
ALTER TABLE "event_activity_documents" ADD CONSTRAINT "event_activity_documents_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "event_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_activity_documents" ADD CONSTRAINT "event_activity_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON UPDATE CASCADE;
ALTER TABLE "event_activity_documents" ADD CONSTRAINT "event_activity_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;

ALTER TABLE "event_activity_departments" ADD CONSTRAINT "event_activity_departments_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "event_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_activity_departments" ADD CONSTRAINT "event_activity_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_activity_orders" ADD CONSTRAINT "event_activity_orders_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "event_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_activity_orders" ADD CONSTRAINT "event_activity_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
