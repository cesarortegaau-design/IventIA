-- AlterTable
ALTER TABLE "budget_lines" ADD COLUMN "direct_cost_budgeted" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "budget_lines" ADD COLUMN "indirect_cost_budgeted" DECIMAL(12,2) NOT NULL DEFAULT 0;
