-- CreateTable: ticket_buyer_users
CREATE TABLE IF NOT EXISTS "ticket_buyer_users" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_buyer_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_buyer_users_tenant_id_email_key" ON "ticket_buyer_users"("tenant_id", "email");
CREATE INDEX IF NOT EXISTS "ticket_buyer_users_tenant_id_idx" ON "ticket_buyer_users"("tenant_id");

-- AddForeignKey: ticket_buyer_users → tenants
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_buyer_users_tenant_id_fkey'
  ) THEN
    ALTER TABLE "ticket_buyer_users"
      ADD CONSTRAINT "ticket_buyer_users_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable: ticket_buyer_password_resets
CREATE TABLE IF NOT EXISTS "ticket_buyer_password_resets" (
    "id" TEXT NOT NULL,
    "buyer_user_id" TEXT NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_buyer_password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_buyer_password_resets_token_key" ON "ticket_buyer_password_resets"("token");
CREATE INDEX IF NOT EXISTS "ticket_buyer_password_resets_buyer_user_id_idx" ON "ticket_buyer_password_resets"("buyer_user_id");

-- AddForeignKey: ticket_buyer_password_resets → ticket_buyer_users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_buyer_password_resets_buyer_user_id_fkey'
  ) THEN
    ALTER TABLE "ticket_buyer_password_resets"
      ADD CONSTRAINT "ticket_buyer_password_resets_buyer_user_id_fkey"
      FOREIGN KEY ("buyer_user_id") REFERENCES "ticket_buyer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Add ticket_buyer_user_id to ticket_orders
ALTER TABLE "ticket_orders" ADD COLUMN IF NOT EXISTS "ticket_buyer_user_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ticket_orders_ticket_buyer_user_id_idx" ON "ticket_orders"("ticket_buyer_user_id");

-- AddForeignKey: ticket_orders → ticket_buyer_users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_orders_ticket_buyer_user_id_fkey'
  ) THEN
    ALTER TABLE "ticket_orders"
      ADD CONSTRAINT "ticket_orders_ticket_buyer_user_id_fkey"
      FOREIGN KEY ("ticket_buyer_user_id") REFERENCES "ticket_buyer_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
