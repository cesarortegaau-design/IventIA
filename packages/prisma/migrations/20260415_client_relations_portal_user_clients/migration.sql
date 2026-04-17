-- CreateTable
CREATE TABLE "client_relations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "related_client_id" TEXT NOT NULL,
    "relation_type" VARCHAR(50) NOT NULL,
    "notes" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_user_clients" (
    "id" TEXT NOT NULL,
    "portal_user_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_user_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_relations_tenant_id_idx" ON "client_relations"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_relations_client_id_related_client_id_relation_type_key" ON "client_relations"("client_id", "related_client_id", "relation_type");

-- CreateIndex
CREATE UNIQUE INDEX "portal_user_clients_portal_user_id_client_id_key" ON "portal_user_clients"("portal_user_id", "client_id");

-- AddForeignKey
ALTER TABLE "client_relations" ADD CONSTRAINT "client_relations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_relations" ADD CONSTRAINT "client_relations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_relations" ADD CONSTRAINT "client_relations_related_client_id_fkey" FOREIGN KEY ("related_client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_user_clients" ADD CONSTRAINT "portal_user_clients_portal_user_id_fkey" FOREIGN KEY ("portal_user_id") REFERENCES "portal_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_user_clients" ADD CONSTRAINT "portal_user_clients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
