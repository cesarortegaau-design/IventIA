-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('EN_FIRMA', 'FIRMADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "contract_number" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'EN_FIRMA',
    "signing_date" TIMESTAMP(3),
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_scheduled_payments" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "expected_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_scheduled_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_payments" (
    "id" TEXT NOT NULL,
    "scheduled_payment_id" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "reference" VARCHAR(200),
    "notes" TEXT,
    "voucher_key" VARCHAR(500),
    "recorded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_payments_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "contract_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contract_number_key" ON "contracts"("contract_number");
CREATE INDEX "contracts_tenant_id_status_idx" ON "contracts"("tenant_id", "status");
CREATE INDEX "contracts_client_id_idx" ON "contracts"("client_id");
CREATE INDEX "contract_scheduled_payments_contract_id_idx" ON "contract_scheduled_payments"("contract_id");
CREATE INDEX "contract_payments_scheduled_payment_id_idx" ON "contract_payments"("scheduled_payment_id");
CREATE INDEX "orders_contract_id_idx" ON "orders"("contract_id");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contract_scheduled_payments" ADD CONSTRAINT "contract_scheduled_payments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_payments" ADD CONSTRAINT "contract_payments_scheduled_payment_id_fkey" FOREIGN KEY ("scheduled_payment_id") REFERENCES "contract_scheduled_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_payments" ADD CONSTRAINT "contract_payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
