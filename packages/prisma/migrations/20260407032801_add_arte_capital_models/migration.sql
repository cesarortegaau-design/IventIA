-- CreateEnum
CREATE TYPE "ArtCapitalUserRole" AS ENUM ('ARTIST', 'COLLECTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ArtCapitalOrderStatus" AS ENUM ('QUOTED', 'CONFIRMED', 'IN_PAYMENT', 'PAID', 'INVOICED', 'CANCELLED', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "ArtCapitalProductStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "art_capital_users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "user_role" "ArtCapitalUserRole" NOT NULL DEFAULT 'COLLECTOR',
    "bio" TEXT,
    "profile_image" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "art_capital_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "art_capital_artists" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gallery_name" VARCHAR(200),
    "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 15,
    "bank_account" VARCHAR(100),
    "bank_name" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "art_capital_artists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "art_capital_products" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "artist_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "status" "ArtCapitalProductStatus" NOT NULL DEFAULT 'DRAFT',
    "membership_tier_id" TEXT,
    "category" VARCHAR(100),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,

    CONSTRAINT "art_capital_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "art_capital_product_images" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_main_image" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "art_capital_product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "art_capital_membership_tiers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "monthly_price" DECIMAL(12,2) NOT NULL,
    "yearly_price" DECIMAL(12,2) NOT NULL,
    "benefits" JSONB NOT NULL DEFAULT '[]',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "art_capital_membership_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "art_capital_memberships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "renewal_date" TIMESTAMP(3) NOT NULL,
    "billing_cycle" VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "art_capital_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "art_capital_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "orderNumber" VARCHAR(50) NOT NULL,
    "status" "ArtCapitalOrderStatus" NOT NULL DEFAULT 'QUOTED',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "art_capital_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "art_capital_order_line_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "art_capital_order_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "art_capital_payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "reference" VARCHAR(200),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "art_capital_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "art_capital_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "artist_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "art_capital_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "art_capital_users_email_key" ON "art_capital_users"("email");

-- CreateIndex
CREATE INDEX "art_capital_users_tenant_id_is_active_idx" ON "art_capital_users"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "art_capital_users_email_idx" ON "art_capital_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "art_capital_artists_user_id_key" ON "art_capital_artists"("user_id");

-- CreateIndex
CREATE INDEX "art_capital_artists_tenant_id_idx" ON "art_capital_artists"("tenant_id");

-- CreateIndex
CREATE INDEX "art_capital_products_tenant_id_status_idx" ON "art_capital_products"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "art_capital_products_artist_id_idx" ON "art_capital_products"("artist_id");

-- CreateIndex
CREATE INDEX "art_capital_products_created_at_idx" ON "art_capital_products"("created_at");

-- CreateIndex
CREATE INDEX "art_capital_product_images_product_id_display_order_idx" ON "art_capital_product_images"("product_id", "display_order");

-- CreateIndex
CREATE INDEX "art_capital_membership_tiers_tenant_id_is_active_idx" ON "art_capital_membership_tiers"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "art_capital_memberships_tenant_id_end_date_idx" ON "art_capital_memberships"("tenant_id", "end_date");

-- CreateIndex
CREATE INDEX "art_capital_memberships_renewal_date_idx" ON "art_capital_memberships"("renewal_date");

-- CreateIndex
CREATE UNIQUE INDEX "art_capital_memberships_user_id_tier_id_key" ON "art_capital_memberships"("user_id", "tier_id");

-- CreateIndex
CREATE UNIQUE INDEX "art_capital_orders_orderNumber_key" ON "art_capital_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "art_capital_orders_tenant_id_created_at_idx" ON "art_capital_orders"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "art_capital_orders_user_id_idx" ON "art_capital_orders"("user_id");

-- CreateIndex
CREATE INDEX "art_capital_orders_status_idx" ON "art_capital_orders"("status");

-- CreateIndex
CREATE INDEX "art_capital_order_line_items_order_id_idx" ON "art_capital_order_line_items"("order_id");

-- CreateIndex
CREATE INDEX "art_capital_payments_order_id_idx" ON "art_capital_payments"("order_id");

-- CreateIndex
CREATE INDEX "art_capital_payments_payment_date_idx" ON "art_capital_payments"("payment_date");

-- CreateIndex
CREATE INDEX "art_capital_transactions_tenant_id_status_idx" ON "art_capital_transactions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "art_capital_transactions_artist_id_paid_at_idx" ON "art_capital_transactions"("artist_id", "paid_at");

-- AddForeignKey
ALTER TABLE "art_capital_users" ADD CONSTRAINT "art_capital_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_artists" ADD CONSTRAINT "art_capital_artists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "art_capital_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_products" ADD CONSTRAINT "art_capital_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_products" ADD CONSTRAINT "art_capital_products_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "art_capital_artists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_products" ADD CONSTRAINT "art_capital_products_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "art_capital_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_products" ADD CONSTRAINT "art_capital_products_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "art_capital_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_products" ADD CONSTRAINT "art_capital_products_membership_tier_id_fkey" FOREIGN KEY ("membership_tier_id") REFERENCES "art_capital_membership_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_product_images" ADD CONSTRAINT "art_capital_product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "art_capital_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_product_images" ADD CONSTRAINT "art_capital_product_images_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "art_capital_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_membership_tiers" ADD CONSTRAINT "art_capital_membership_tiers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_memberships" ADD CONSTRAINT "art_capital_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_memberships" ADD CONSTRAINT "art_capital_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "art_capital_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_memberships" ADD CONSTRAINT "art_capital_memberships_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "art_capital_membership_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_orders" ADD CONSTRAINT "art_capital_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_orders" ADD CONSTRAINT "art_capital_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "art_capital_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_order_line_items" ADD CONSTRAINT "art_capital_order_line_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "art_capital_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_order_line_items" ADD CONSTRAINT "art_capital_order_line_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "art_capital_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_payments" ADD CONSTRAINT "art_capital_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "art_capital_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_payments" ADD CONSTRAINT "art_capital_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "art_capital_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_transactions" ADD CONSTRAINT "art_capital_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_transactions" ADD CONSTRAINT "art_capital_transactions_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "art_capital_artists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_transactions" ADD CONSTRAINT "art_capital_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "art_capital_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_capital_transactions" ADD CONSTRAINT "art_capital_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "art_capital_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
