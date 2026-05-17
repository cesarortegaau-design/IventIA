-- CreateEnum
CREATE TYPE "ApprovalObjectType" AS ENUM ('PRICE_LIST', 'CLIENT', 'SUPPLIER', 'SUPPLIER_PRICE_LIST', 'EVENT', 'ORDER', 'PURCHASE_ORDER', 'COLLAB_TASK');

CREATE TYPE "ApprovalRequestStatus" AS ENUM ('IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TYPE "ApprovalStepStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TYPE "ApprovalAssigneeType" AS ENUM ('USER', 'PROFILE');

-- CreateTable
CREATE TABLE "approval_flows" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "object_type" "ApprovalObjectType" NOT NULL,
    "target_status" VARCHAR(100) NOT NULL,
    "activation_conditions_text" TEXT,
    "final_effects_text" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "approval_flows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "approval_flow_steps" (
    "id" TEXT NOT NULL,
    "flow_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "assignee_type" "ApprovalAssigneeType" NOT NULL,
    "assignee_user_id" TEXT,
    "assignee_profile_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "approval_flow_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "flow_id" TEXT NOT NULL,
    "object_type" "ApprovalObjectType" NOT NULL,
    "object_id" TEXT NOT NULL,
    "current_step" INTEGER,
    "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "triggered_by_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "approval_request_steps" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "ApprovalStepStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reason" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "task_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "approval_request_steps_pkey" PRIMARY KEY ("id")
);

-- Unique
ALTER TABLE "approval_request_steps" ADD CONSTRAINT "approval_request_steps_task_id_key" UNIQUE ("task_id");

-- Indexes
CREATE INDEX "approval_flows_tenant_id_object_type_idx" ON "approval_flows"("tenant_id", "object_type");
CREATE INDEX "approval_flows_tenant_id_is_active_idx" ON "approval_flows"("tenant_id", "is_active");
CREATE INDEX "approval_flow_steps_flow_id_order_idx" ON "approval_flow_steps"("flow_id", "order");
CREATE INDEX "approval_requests_tenant_id_object_type_object_id_idx" ON "approval_requests"("tenant_id", "object_type", "object_id");
CREATE INDEX "approval_requests_tenant_id_status_idx" ON "approval_requests"("tenant_id", "status");
CREATE INDEX "approval_request_steps_request_id_order_idx" ON "approval_request_steps"("request_id", "order");

-- FKs
ALTER TABLE "approval_flows" ADD CONSTRAINT "approval_flows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_flows" ADD CONSTRAINT "approval_flows_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_flow_steps" ADD CONSTRAINT "approval_flow_steps_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "approval_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_flow_steps" ADD CONSTRAINT "approval_flow_steps_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_flow_steps" ADD CONSTRAINT "approval_flow_steps_assignee_profile_id_fkey" FOREIGN KEY ("assignee_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "approval_flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_triggered_by_id_fkey" FOREIGN KEY ("triggered_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_request_steps" ADD CONSTRAINT "approval_request_steps_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_request_steps" ADD CONSTRAINT "approval_request_steps_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "approval_flow_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_request_steps" ADD CONSTRAINT "approval_request_steps_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_request_steps" ADD CONSTRAINT "approval_request_steps_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "collab_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
