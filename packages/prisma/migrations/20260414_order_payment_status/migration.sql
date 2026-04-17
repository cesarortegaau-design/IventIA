-- CreateEnum: PaymentStatus
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'IN_PAYMENT', 'PAID', 'IN_REVIEW');

-- Step 1: Create new OrderStatus enum WITH all old + new values (for transition)
CREATE TYPE "OrderStatus_new" AS ENUM ('QUOTED', 'CONFIRMED', 'EXECUTED', 'IN_EXECUTION', 'IN_PAYMENT', 'PAID', 'INVOICED', 'CANCELLED', 'CREDIT_NOTE');

-- Step 2: Drop defaults before type change, then switch columns to new enum
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "order_status_history" ALTER COLUMN "from_status" DROP DEFAULT;
ALTER TABLE "order_status_history" ALTER COLUMN "to_status" DROP DEFAULT;

ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TABLE "order_status_history" ALTER COLUMN "from_status" TYPE "OrderStatus_new" USING ("from_status"::text::"OrderStatus_new");
ALTER TABLE "order_status_history" ALTER COLUMN "to_status" TYPE "OrderStatus_new" USING ("to_status"::text::"OrderStatus_new");

-- Step 3: Add new columns
ALTER TABLE "orders" ADD COLUMN "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "order_line_items" ADD COLUMN "delivery_date" TIMESTAMP(3);

-- Step 4: Change checkDuplicate default to true
ALTER TABLE "resources" ALTER COLUMN "check_duplicate" SET DEFAULT true;

-- Step 5: Migrate data - set paymentStatus and remap statuses
-- Orders with status IN_PAYMENT → CONFIRMED + paymentStatus IN_PAYMENT
UPDATE "orders" SET "payment_status" = 'IN_PAYMENT', "status" = 'CONFIRMED'
WHERE "status" = 'IN_PAYMENT';

-- Orders with status PAID → CONFIRMED + paymentStatus PAID
UPDATE "orders" SET "payment_status" = 'PAID', "status" = 'CONFIRMED'
WHERE "status" = 'PAID';

-- Orders with status IN_EXECUTION → EXECUTED
UPDATE "orders" SET "status" = 'EXECUTED'
WHERE "status" = 'IN_EXECUTION';

-- Calculate paymentStatus for remaining orders based on paidAmount vs total
UPDATE "orders" SET "payment_status" = 'PAID'
WHERE "payment_status" = 'PENDING' AND "paid_amount" > 0 AND "paid_amount" >= "total" AND "total" > 0;

UPDATE "orders" SET "payment_status" = 'IN_PAYMENT'
WHERE "payment_status" = 'PENDING' AND "paid_amount" > 0 AND "paid_amount" < "total";

-- Step 6: Update status history records
UPDATE "order_status_history" SET "from_status" = 'EXECUTED' WHERE "from_status" = 'IN_EXECUTION';
UPDATE "order_status_history" SET "to_status" = 'EXECUTED' WHERE "to_status" = 'IN_EXECUTION';

-- Step 6b: Remove history records referencing payment statuses (now tracked via paymentStatus field)
DELETE FROM "order_status_history" WHERE "from_status" IN ('IN_PAYMENT', 'PAID');
DELETE FROM "order_status_history" WHERE "to_status" IN ('IN_PAYMENT', 'PAID');

-- Step 7: Now create the final clean enum (without old values)
DROP TYPE "OrderStatus";
CREATE TYPE "OrderStatus" AS ENUM ('QUOTED', 'CONFIRMED', 'EXECUTED', 'INVOICED', 'CANCELLED', 'CREDIT_NOTE');

-- Step 8: Switch to final clean enum and restore defaults
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus" USING ("status"::text::"OrderStatus");
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'QUOTED'::"OrderStatus";
ALTER TABLE "order_status_history" ALTER COLUMN "from_status" TYPE "OrderStatus" USING ("from_status"::text::"OrderStatus");
ALTER TABLE "order_status_history" ALTER COLUMN "to_status" TYPE "OrderStatus" USING ("to_status"::text::"OrderStatus");

-- Step 9: Drop transition enum
DROP TYPE "OrderStatus_new";

-- Step 10: Add index for paymentStatus
CREATE INDEX "orders_tenant_id_payment_status_idx" ON "orders"("tenant_id", "payment_status");
