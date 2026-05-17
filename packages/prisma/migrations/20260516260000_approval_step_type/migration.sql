-- Add step type (APPROVAL | NOTIFICATION) to approval_flow_steps
ALTER TABLE "approval_flow_steps" ADD COLUMN "step_type" VARCHAR(20) NOT NULL DEFAULT 'APPROVAL';
