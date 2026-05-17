-- Add min_amount condition to approval_flows
ALTER TABLE "approval_flows" ADD COLUMN "min_amount" DECIMAL(12,2);
