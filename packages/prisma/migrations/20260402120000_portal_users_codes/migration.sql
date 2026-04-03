-- CreateTable
CREATE TABLE "portal_users" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_access_codes" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL,
    "event_id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "client_id" TEXT,
    "max_uses" INTEGER NOT NULL DEFAULT 1,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_access_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_user_events" (
    "id" TEXT NOT NULL,
    "portal_user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "access_code_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_user_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "portal_users_email_key" ON "portal_users"("email");

-- CreateIndex
CREATE INDEX "portal_users_tenant_id_idx" ON "portal_users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "portal_access_codes_code_key" ON "portal_access_codes"("code");

-- CreateIndex
CREATE INDEX "portal_access_codes_tenant_id_event_id_idx" ON "portal_access_codes"("tenant_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "portal_user_events_portal_user_id_event_id_key" ON "portal_user_events"("portal_user_id", "event_id");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_portal_user_id_fkey" FOREIGN KEY ("portal_user_id") REFERENCES "portal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_users" ADD CONSTRAINT "portal_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_access_codes" ADD CONSTRAINT "portal_access_codes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_access_codes" ADD CONSTRAINT "portal_access_codes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_access_codes" ADD CONSTRAINT "portal_access_codes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_access_codes" ADD CONSTRAINT "portal_access_codes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_user_events" ADD CONSTRAINT "portal_user_events_portal_user_id_fkey" FOREIGN KEY ("portal_user_id") REFERENCES "portal_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_user_events" ADD CONSTRAINT "portal_user_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_user_events" ADD CONSTRAINT "portal_user_events_access_code_id_fkey" FOREIGN KEY ("access_code_id") REFERENCES "portal_access_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
