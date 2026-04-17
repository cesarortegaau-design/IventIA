-- AlterEnum
ALTER TYPE "ResourceType" ADD VALUE 'PERSONAL';

-- AlterTable
ALTER TABLE "resources" ADD COLUMN "is_package" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "is_substitute" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "package_components" (
    "id" TEXT NOT NULL,
    "package_resource_id" TEXT NOT NULL,
    "component_resource_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "package_components_package_resource_id_component_resource_id_key" ON "package_components"("package_resource_id", "component_resource_id");

-- CreateIndex
CREATE INDEX "package_components_package_resource_id_idx" ON "package_components"("package_resource_id");

-- CreateIndex
CREATE INDEX "package_components_component_resource_id_idx" ON "package_components"("component_resource_id");

-- CreateIndex
CREATE INDEX "resources_tenant_id_is_package_idx" ON "resources"("tenant_id", "is_package");

-- AddForeignKey
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_package_resource_id_fkey" FOREIGN KEY ("package_resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_component_resource_id_fkey" FOREIGN KEY ("component_resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
