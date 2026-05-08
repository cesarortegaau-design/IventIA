-- CreateTable: TicketGuest
CREATE TABLE "ticket_guests" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "ticket_event_id" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "paternal_last_name" VARCHAR(100) NOT NULL,
    "maternal_last_name" VARCHAR(100),
    "email" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(30),
    "ticket_count" INTEGER NOT NULL DEFAULT 1,
    "ticket_access_code_id" TEXT NOT NULL,
    "email_sent_at" TIMESTAMP(3),
    "whatsapp_sent_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_guests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_guests_ticket_access_code_id_key" ON "ticket_guests"("ticket_access_code_id");

-- CreateIndex
CREATE INDEX "ticket_guests_tenant_id_ticket_event_id_idx" ON "ticket_guests"("tenant_id", "ticket_event_id");

-- AddForeignKey
ALTER TABLE "ticket_guests" ADD CONSTRAINT "ticket_guests_ticket_event_id_fkey" FOREIGN KEY ("ticket_event_id") REFERENCES "ticket_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_guests" ADD CONSTRAINT "ticket_guests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_guests" ADD CONSTRAINT "ticket_guests_ticket_access_code_id_fkey" FOREIGN KEY ("ticket_access_code_id") REFERENCES "ticket_access_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_guests" ADD CONSTRAINT "ticket_guests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;
