-- Add auto_trigger and blocks_transition columns to approval_flows
ALTER TABLE "approval_flows" ADD COLUMN "auto_trigger" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "approval_flows" ADD COLUMN "blocks_transition" BOOLEAN NOT NULL DEFAULT true;
