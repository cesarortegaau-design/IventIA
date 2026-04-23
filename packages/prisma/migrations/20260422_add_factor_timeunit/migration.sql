-- Add factor to resources
ALTER TABLE "resources" ADD COLUMN "factor" DECIMAL(10,2) NOT NULL DEFAULT 1;

-- Add timeUnit and detail to price_list_items
ALTER TABLE "price_list_items" ADD COLUMN "time_unit" VARCHAR(20);
ALTER TABLE "price_list_items" ADD COLUMN "detail" TEXT;

-- Add timeUnit to order_line_items
ALTER TABLE "order_line_items" ADD COLUMN "time_unit" VARCHAR(20);
