-- Add REGISTRO to TicketMode enum
ALTER TYPE "TicketMode" ADD VALUE IF NOT EXISTS 'REGISTRO';

-- Add columns to ticket_orders
ALTER TABLE "ticket_orders"
  ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(20) NOT NULL DEFAULT 'STRIPE',
  ADD COLUMN IF NOT EXISTS "ticket_access_code_id" TEXT;

-- CreateTable ticket_attendees
CREATE TABLE IF NOT EXISTS "ticket_attendees" (
    "id" TEXT NOT NULL,
    "ticket_order_item_id" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "paternal_last_name" VARCHAR(100) NOT NULL,
    "maternal_last_name" VARCHAR(100),
    "phone" VARCHAR(30),
    "email" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_attendees_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ticket_attendees_ticket_order_item_id_key" ON "ticket_attendees"("ticket_order_item_id");
CREATE INDEX IF NOT EXISTS "ticket_attendees_ticket_order_item_id_idx" ON "ticket_attendees"("ticket_order_item_id");

-- CreateTable ticket_access_codes
CREATE TABLE IF NOT EXISTS "ticket_access_codes" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "ticket_event_id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "max_uses" INTEGER NOT NULL DEFAULT 1,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_access_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ticket_access_codes_code_key" ON "ticket_access_codes"("code");
CREATE INDEX IF NOT EXISTS "ticket_access_codes_tenant_id_ticket_event_id_idx" ON "ticket_access_codes"("tenant_id", "ticket_event_id");
CREATE INDEX IF NOT EXISTS "ticket_access_codes_code_idx" ON "ticket_access_codes"("code");

-- AddForeignKeys (idempotent via DO blocks)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_attendees_ticket_order_item_id_fkey'
  ) THEN
    ALTER TABLE "ticket_attendees"
      ADD CONSTRAINT "ticket_attendees_ticket_order_item_id_fkey"
      FOREIGN KEY ("ticket_order_item_id") REFERENCES "ticket_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_access_codes_ticket_event_id_fkey'
  ) THEN
    ALTER TABLE "ticket_access_codes"
      ADD CONSTRAINT "ticket_access_codes_ticket_event_id_fkey"
      FOREIGN KEY ("ticket_event_id") REFERENCES "ticket_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_access_codes_tenant_id_fkey'
  ) THEN
    ALTER TABLE "ticket_access_codes"
      ADD CONSTRAINT "ticket_access_codes_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_access_codes_created_by_id_fkey'
  ) THEN
    ALTER TABLE "ticket_access_codes"
      ADD CONSTRAINT "ticket_access_codes_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_orders_ticket_access_code_id_fkey'
  ) THEN
    ALTER TABLE "ticket_orders"
      ADD CONSTRAINT "ticket_orders_ticket_access_code_id_fkey"
      FOREIGN KEY ("ticket_access_code_id") REFERENCES "ticket_access_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
