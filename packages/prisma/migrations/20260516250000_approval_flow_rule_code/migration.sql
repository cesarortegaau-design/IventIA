-- Add compiled rule code to approval_flows
ALTER TABLE "approval_flows" ADD COLUMN "rule_code" TEXT;
