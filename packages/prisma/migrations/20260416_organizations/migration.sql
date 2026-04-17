-- Create organizations table
CREATE TABLE "organizations" (
  "id"                 VARCHAR(36)  NOT NULL DEFAULT gen_random_uuid()::text,
  "tenant_id"          VARCHAR(50)  NOT NULL,
  "clave"              VARCHAR(50)  NOT NULL,
  "descripcion"        VARCHAR(300) NOT NULL,
  "datos_fiscales"     JSONB        NOT NULL DEFAULT '{}',
  "datos_demograficos" JSONB        NOT NULL DEFAULT '{}',
  "is_active"          BOOLEAN      NOT NULL DEFAULT true,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organizations_tenant_id_clave_key" ON "organizations"("tenant_id", "clave");
CREATE INDEX "organizations_tenant_id_is_active_idx" ON "organizations"("tenant_id", "is_active");

-- Create department_organizations junction table
CREATE TABLE "department_organizations" (
  "department_id"   VARCHAR(36) NOT NULL,
  "organization_id" VARCHAR(36) NOT NULL,
  CONSTRAINT "department_organizations_pkey" PRIMARY KEY ("department_id", "organization_id")
);

-- Add organizacion_id to orders
ALTER TABLE "orders" ADD COLUMN "organizacion_id" VARCHAR(36);

-- Add organizacion_id to purchase_orders
ALTER TABLE "purchase_orders" ADD COLUMN "organizacion_id" VARCHAR(36);

-- Foreign keys
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "department_organizations" ADD CONSTRAINT "department_organizations_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "department_organizations" ADD CONSTRAINT "department_organizations_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders" ADD CONSTRAINT "orders_organizacion_id_fkey"
  FOREIGN KEY ("organizacion_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_organizacion_id_fkey"
  FOREIGN KEY ("organizacion_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
