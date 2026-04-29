-- Add TICKET to ResourceType enum
ALTER TYPE "ResourceType" ADD VALUE 'TICKET';

-- TicketMode enum
CREATE TYPE "TicketMode" AS ENUM ('SECTION', 'SEAT');

-- TicketOrderStatus enum
CREATE TYPE "TicketOrderStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED');

-- ticket_events
CREATE TABLE "ticket_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "mode" "TicketMode" NOT NULL DEFAULT 'SECTION',
    "price_list_id" TEXT,
    "slug" VARCHAR(100) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "image_url" VARCHAR(500),
    "map_image_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ticket_events_pkey" PRIMARY KEY ("id")
);

-- ticket_sections
CREATE TABLE "ticket_sections" (
    "id" TEXT NOT NULL,
    "ticket_event_id" TEXT NOT NULL,
    "resource_id" TEXT,
    "name" VARCHAR(200) NOT NULL,
    "color_hex" VARCHAR(7) NOT NULL DEFAULT '#6B46C1',
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "map_polygon" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_sections_pkey" PRIMARY KEY ("id")
);

-- ticket_seats
CREATE TABLE "ticket_seats" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "row" VARCHAR(10) NOT NULL,
    "number" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_seats_pkey" PRIMARY KEY ("id")
);

-- ticket_orders
CREATE TABLE "ticket_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "ticket_event_id" TEXT NOT NULL,
    "buyer_email" VARCHAR(300) NOT NULL,
    "buyer_name" VARCHAR(300) NOT NULL,
    "buyer_phone" VARCHAR(50),
    "stripe_session_id" VARCHAR(300),
    "stripe_payment_id" VARCHAR(300),
    "status" "TicketOrderStatus" NOT NULL DEFAULT 'PENDING',
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ticket_orders_pkey" PRIMARY KEY ("id")
);

-- ticket_order_items
CREATE TABLE "ticket_order_items" (
    "id" TEXT NOT NULL,
    "ticket_order_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "seat_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "ticket_order_items_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_event_id_key" UNIQUE ("event_id");
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_slug_key" UNIQUE ("slug");
ALTER TABLE "ticket_orders" ADD CONSTRAINT "ticket_orders_token_key" UNIQUE ("token");
ALTER TABLE "ticket_seats" ADD CONSTRAINT "ticket_seats_section_id_row_number_key" UNIQUE ("section_id", "row", "number");

-- Indexes
CREATE INDEX "ticket_events_tenant_id_idx" ON "ticket_events"("tenant_id");
CREATE INDEX "ticket_events_slug_idx" ON "ticket_events"("slug");
CREATE INDEX "ticket_sections_ticket_event_id_idx" ON "ticket_sections"("ticket_event_id");
CREATE INDEX "ticket_seats_section_id_idx" ON "ticket_seats"("section_id");
CREATE INDEX "ticket_orders_tenant_id_status_idx" ON "ticket_orders"("tenant_id", "status");
CREATE INDEX "ticket_orders_stripe_session_id_idx" ON "ticket_orders"("stripe_session_id");
CREATE INDEX "ticket_orders_token_idx" ON "ticket_orders"("token");
CREATE INDEX "ticket_order_items_ticket_order_id_idx" ON "ticket_order_items"("ticket_order_id");

-- Foreign keys
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ticket_sections" ADD CONSTRAINT "ticket_sections_ticket_event_id_fkey" FOREIGN KEY ("ticket_event_id") REFERENCES "ticket_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_sections" ADD CONSTRAINT "ticket_sections_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ticket_seats" ADD CONSTRAINT "ticket_seats_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "ticket_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_orders" ADD CONSTRAINT "ticket_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_orders" ADD CONSTRAINT "ticket_orders_ticket_event_id_fkey" FOREIGN KEY ("ticket_event_id") REFERENCES "ticket_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_order_items" ADD CONSTRAINT "ticket_order_items_ticket_order_id_fkey" FOREIGN KEY ("ticket_order_id") REFERENCES "ticket_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_order_items" ADD CONSTRAINT "ticket_order_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "ticket_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_order_items" ADD CONSTRAINT "ticket_order_items_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "ticket_seats"("id") ON DELETE SET NULL ON UPDATE CASCADE;
