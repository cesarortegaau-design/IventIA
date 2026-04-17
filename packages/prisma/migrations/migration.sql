-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('CONSUMABLE', 'EQUIPMENT', 'SPACE', 'FURNITURE', 'SERVICE', 'DISCOUNT', 'TAX', 'PERSONAL');

-- CreateEnum
CREATE TYPE "DepartmentType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('QUOTED', 'CONFIRMED', 'IN_EXECUTION', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventPhase" AS ENUM ('SETUP', 'EVENT', 'TEARDOWN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('QUOTED', 'CONFIRMED', 'IN_PAYMENT', 'PAID', 'INVOICED', 'CANCELLED', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('PHYSICAL', 'MORAL');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'NORMAL', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CREDIT_CARD', 'CHECK', 'SWIFT');

-- CreateEnum
CREATE TYPE "PricingTier" AS ENUM ('EARLY', 'NORMAL', 'LATE');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('CALL', 'EMAIL', 'WHATSAPP', 'MEETING', 'NOTE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('ADMIN', 'PORTAL_USER');

-- CreateEnum
CREATE TYPE "ArtCapitalUserRole" AS ENUM ('ARTIST', 'COLLECTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ArtCapitalOrderStatus" AS ENUM ('QUOTED', 'CONFIRMED', 'IN_PAYMENT', 'PAID', 'INVOICED', 'CANCELLED', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "ArtCapitalProductStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ArtworkStatus" AS ENUM ('AVAILABLE', 'SOLD', 'RESERVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ArtMedium" AS ENUM ('OIL', 'ACRYLIC', 'WATERCOLOR', 'SCULPTURE', 'PHOTOGRAPHY', 'PRINT', 'DIGITAL', 'MIXED_MEDIA');

-- CreateEnum
CREATE TYPE "ArtStyle" AS ENUM ('IMPRESSIONISM', 'SURREALISM', 'POP_ART', 'CUBISM', 'ABSTRACT', 'REALISM', 'EXPRESSIONISM', 'CONTEMPORARY', 'TRADITIONAL', 'MODERNISM');

-- CreateEnum
CREATE TYPE "GalleryOrderStatus" AS ENUM ('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "password_hash" TEXT,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "role" "UserRole" NOT NULL DEFAULT 'NORMAL',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "azure_ad_id" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_departments" (
    "user_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,

    CONSTRAINT "user_departments_pkey" PRIMARY KEY ("user_id","department_id")
);

-- CreateTable
CREATE TABLE "user_privileges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "privilege_key" VARCHAR(100) NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_privileges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "DepartmentType" NOT NULL DEFAULT 'INTERNAL',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "ResourceType" NOT NULL,
    "description" TEXT,
    "unit" VARCHAR(50),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stock_location" VARCHAR(200),
    "check_stock" BOOLEAN NOT NULL DEFAULT false,
    "check_duplicate" BOOLEAN NOT NULL DEFAULT false,
    "recovery_time" INTEGER NOT NULL DEFAULT 0,
    "area_sqm" DECIMAL(10,2),
    "capacity" INTEGER,
    "department_id" TEXT,
    "portal_visible" BOOLEAN NOT NULL DEFAULT false,
    "portal_desc" TEXT,
    "portal_blob_key" VARCHAR(500),
    "image_main" VARCHAR(500),
    "image_desc" VARCHAR(500),
    "image_extra" VARCHAR(500),
    "is_package" BOOLEAN NOT NULL DEFAULT false,
    "is_substitute" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "price_lists" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "early_cutoff" TIMESTAMP(3),
    "normal_cutoff" TIMESTAMP(3),
    "discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_items" (
    "id" TEXT NOT NULL,
    "price_list_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "early_price" DECIMAL(12,2) NOT NULL,
    "normal_price" DECIMAL(12,2) NOT NULL,
    "late_price" DECIMAL(12,2) NOT NULL,
    "unit" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "person_type" "PersonType" NOT NULL,
    "company_name" VARCHAR(300),
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "rfc" VARCHAR(20),
    "tax_regime" VARCHAR(200),
    "email" VARCHAR(200),
    "phone" VARCHAR(30),
    "whatsapp" VARCHAR(30),
    "address_street" VARCHAR(300),
    "address_city" VARCHAR(100),
    "address_state" VARCHAR(100),
    "address_zip" VARCHAR(20),
    "address_country" VARCHAR(100) NOT NULL DEFAULT 'MX',
    "portal_user_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "contact_type" VARCHAR(50) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(200),
    "phone" VARCHAR(30),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_documents" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "file_name" VARCHAR(300) NOT NULL,
    "blob_key" VARCHAR(500) NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_interactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "subject" VARCHAR(300) NOT NULL,
    "notes" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_tasks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "interaction_id" TEXT,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "assigned_to_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'QUOTED',
    "description" TEXT,
    "venue_location" VARCHAR(300),
    "setup_start" TIMESTAMP(3),
    "setup_end" TIMESTAMP(3),
    "event_start" TIMESTAMP(3),
    "event_end" TIMESTAMP(3),
    "teardown_start" TIMESTAMP(3),
    "teardown_end" TIMESTAMP(3),
    "primary_client_id" TEXT,
    "price_list_id" TEXT,
    "event_type" VARCHAR(100),
    "event_class" VARCHAR(100),
    "event_category" VARCHAR(100),
    "coordinator" VARCHAR(200),
    "executive" VARCHAR(200),
    "portal_enabled" BOOLEAN NOT NULL DEFAULT false,
    "portal_slug" VARCHAR(100),
    "portal_settings" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "client_notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_spaces" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "phase" "EventPhase" NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_documents" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "file_name" VARCHAR(300) NOT NULL,
    "blob_key" VARCHAR(500) NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stands" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "client_id" TEXT,
    "code" VARCHAR(50) NOT NULL,
    "width_m" DECIMAL(8,2),
    "depth_m" DECIMAL(8,2),
    "height_m" DECIMAL(8,2),
    "location_notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stand_documents" (
    "id" TEXT NOT NULL,
    "stand_id" TEXT NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "file_name" VARCHAR(300) NOT NULL,
    "blob_key" VARCHAR(500) NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stand_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_number" VARCHAR(50) NOT NULL,
    "event_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "billing_client_id" TEXT,
    "stand_id" TEXT,
    "price_list_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'QUOTED',
    "pricing_tier" "PricingTier" NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_pct" DECIMAL(5,2) NOT NULL DEFAULT 16,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "prospected_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "is_credit_note" BOOLEAN NOT NULL DEFAULT false,
    "original_order_id" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "assigned_to_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_line_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "pricing_tier" "PricingTier" NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(12,2) NOT NULL,
    "observations" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "reference" VARCHAR(200),
    "notes" TEXT,
    "recorded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_documents" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "file_name" VARCHAR(300) NOT NULL,
    "blob_key" VARCHAR(500) NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "changed_by_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "recipient_type" VARCHAR(20) NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "template_key" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMP(3),
    "error_details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "portal_user_id" TEXT NOT NULL,
    "event_id" TEXT,
    "subject" VARCHAR(300),
    "unread_admin" INTEGER NOT NULL DEFAULT 0,
    "unread_portal" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_type" "SenderType" NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_name" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "file_url" VARCHAR(500),
    "file_name" VARCHAR(300),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "gallery_artists" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "bio" TEXT,
    "image_url" VARCHAR(500),
    "website" VARCHAR(500),
    "socialMedia" JSONB NOT NULL DEFAULT '{}',
    "specialization" JSONB NOT NULL DEFAULT '[]',
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_artists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_collections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "image" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_locations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "address" VARCHAR(300),
    "city" VARCHAR(100),
    "phone" VARCHAR(30),
    "whatsapp" VARCHAR(30),
    "image_url" VARCHAR(500),
    "hours" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_artworks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "artist_id" TEXT NOT NULL,
    "collection_id" TEXT,
    "location_id" TEXT,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "ArtworkStatus" NOT NULL DEFAULT 'AVAILABLE',
    "mediums" JSONB NOT NULL DEFAULT '[]',
    "styles" JSONB NOT NULL DEFAULT '[]',
    "width_cm" DECIMAL(10,2),
    "height_cm" DECIMAL(10,2),
    "depth_cm" DECIMAL(10,2),
    "main_image" VARCHAR(500),
    "galleryImages" JSONB NOT NULL DEFAULT '[]',
    "artist_commission_percentage" DECIMAL(5,2),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_artworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_memberships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "artist_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "membershipType" VARCHAR(50) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "commission_percentage" DECIMAL(5,2) NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_classes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2),
    "schedule" JSONB NOT NULL DEFAULT '{}',
    "capacity" INTEGER NOT NULL DEFAULT 20,
    "status" "ClassStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_class_enrollments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "enrolled_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_class_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_exhibitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PLANNING',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_exhibitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_exhibition_artworks" (
    "exhibitionId" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "gallery_exhibition_artworks_pkey" PRIMARY KEY ("exhibitionId","artworkId")
);

-- CreateTable
CREATE TABLE "gallery_carts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_cart_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "artwork_id" TEXT,
    "class_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "gallery_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "orderNumber" VARCHAR(50) NOT NULL,
    "status" "GalleryOrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_price" DECIMAL(12,2) NOT NULL,
    "paymentStatus" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "shippingAddress" JSONB NOT NULL DEFAULT '{}',
    "tracking_number" VARCHAR(100),
    "stripe_payment_intent_id" VARCHAR(255),
    "stripe_session_id" VARCHAR(255),
    "artist_commission_amount" DECIMAL(12,2),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_order_line_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "artwork_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "artist_commission_percentage" DECIMAL(5,2),
    "artist_commission_amount" DECIMAL(12,2),
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "gallery_order_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_favorites" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "artwork_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenant_id_is_active_idx" ON "users"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "user_privileges_user_id_privilege_key_key" ON "user_privileges"("user_id", "privilege_key");

-- CreateIndex
CREATE INDEX "departments_tenant_id_is_active_idx" ON "departments"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "resources_tenant_id_type_is_active_idx" ON "resources"("tenant_id", "type", "is_active");

-- CreateIndex
CREATE INDEX "resources_tenant_id_is_package_idx" ON "resources"("tenant_id", "is_package");

-- CreateIndex
CREATE UNIQUE INDEX "resources_tenant_id_code_key" ON "resources"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "package_components_package_resource_id_idx" ON "package_components"("package_resource_id");

-- CreateIndex
CREATE INDEX "package_components_component_resource_id_idx" ON "package_components"("component_resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "package_components_package_resource_id_component_resource_i_key" ON "package_components"("package_resource_id", "component_resource_id");

-- CreateIndex
CREATE INDEX "price_lists_tenant_id_is_active_idx" ON "price_lists"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "price_list_items_price_list_id_resource_id_key" ON "price_list_items"("price_list_id", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_portal_user_id_key" ON "clients"("portal_user_id");

-- CreateIndex
CREATE INDEX "clients_tenant_id_is_active_idx" ON "clients"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "client_interactions_tenant_id_client_id_idx" ON "client_interactions"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "client_interactions_tenant_id_occurred_at_idx" ON "client_interactions"("tenant_id", "occurred_at");

-- CreateIndex
CREATE INDEX "client_tasks_tenant_id_client_id_idx" ON "client_tasks"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "client_tasks_tenant_id_assigned_to_id_status_idx" ON "client_tasks"("tenant_id", "assigned_to_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "events_portal_slug_key" ON "events"("portal_slug");

-- CreateIndex
CREATE INDEX "events_tenant_id_status_idx" ON "events"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "events_event_start_event_end_idx" ON "events"("event_start", "event_end");

-- CreateIndex
CREATE UNIQUE INDEX "events_tenant_id_code_key" ON "events"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "stands_event_id_code_key" ON "stands"("event_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_tenant_id_status_idx" ON "orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "orders_event_id_status_idx" ON "orders"("event_id", "status");

-- CreateIndex
CREATE INDEX "orders_client_id_idx" ON "orders"("client_id");

-- CreateIndex
CREATE INDEX "orders_order_number_idx" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "order_line_items_order_id_idx" ON "order_line_items"("order_id");

-- CreateIndex
CREATE INDEX "order_payments_order_id_idx" ON "order_payments"("order_id");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_idx" ON "order_status_history"("order_id");

-- CreateIndex
CREATE INDEX "notifications_status_created_at_idx" ON "notifications"("status", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_entity_type_entity_id_idx" ON "audit_logs"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

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

-- CreateIndex
CREATE INDEX "conversations_tenant_id_idx" ON "conversations"("tenant_id");

-- CreateIndex
CREATE INDEX "conversations_portal_user_id_idx" ON "conversations"("portal_user_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

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

-- CreateIndex
CREATE UNIQUE INDEX "gallery_artists_user_id_key" ON "gallery_artists"("user_id");

-- CreateIndex
CREATE INDEX "gallery_artists_tenant_id_status_idx" ON "gallery_artists"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "gallery_collections_tenant_id_is_active_idx" ON "gallery_collections"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "gallery_locations_tenant_id_is_active_idx" ON "gallery_locations"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "gallery_artworks_tenant_id_status_idx" ON "gallery_artworks"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "gallery_artworks_artist_id_idx" ON "gallery_artworks"("artist_id");

-- CreateIndex
CREATE INDEX "gallery_artworks_collection_id_idx" ON "gallery_artworks"("collection_id");

-- CreateIndex
CREATE INDEX "gallery_memberships_tenant_id_is_active_idx" ON "gallery_memberships"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_memberships_artist_id_membershipType_key" ON "gallery_memberships"("artist_id", "membershipType");

-- CreateIndex
CREATE INDEX "gallery_classes_tenant_id_status_idx" ON "gallery_classes"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "gallery_classes_instructor_id_idx" ON "gallery_classes"("instructor_id");

-- CreateIndex
CREATE INDEX "gallery_class_enrollments_tenant_id_idx" ON "gallery_class_enrollments"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_class_enrollments_user_id_class_id_key" ON "gallery_class_enrollments"("user_id", "class_id");

-- CreateIndex
CREATE INDEX "gallery_exhibitions_tenant_id_status_idx" ON "gallery_exhibitions"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_carts_tenant_id_user_id_key" ON "gallery_carts"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_orders_orderNumber_key" ON "gallery_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "gallery_orders_tenant_id_created_at_idx" ON "gallery_orders"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "gallery_orders_user_id_idx" ON "gallery_orders"("user_id");

-- CreateIndex
CREATE INDEX "gallery_orders_status_idx" ON "gallery_orders"("status");

-- CreateIndex
CREATE INDEX "gallery_order_line_items_order_id_idx" ON "gallery_order_line_items"("order_id");

-- CreateIndex
CREATE INDEX "gallery_favorites_tenant_id_user_id_idx" ON "gallery_favorites"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_favorites_user_id_artwork_id_key" ON "gallery_favorites"("user_id", "artwork_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_privileges" ADD CONSTRAINT "user_privileges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_package_resource_id_fkey" FOREIGN KEY ("package_resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_component_resource_id_fkey" FOREIGN KEY ("component_resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_portal_user_id_fkey" FOREIGN KEY ("portal_user_id") REFERENCES "portal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_interactions" ADD CONSTRAINT "client_interactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_interactions" ADD CONSTRAINT "client_interactions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_interactions" ADD CONSTRAINT "client_interactions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_tasks" ADD CONSTRAINT "client_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_tasks" ADD CONSTRAINT "client_tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_tasks" ADD CONSTRAINT "client_tasks_interaction_id_fkey" FOREIGN KEY ("interaction_id") REFERENCES "client_interactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_tasks" ADD CONSTRAINT "client_tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_tasks" ADD CONSTRAINT "client_tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_primary_client_id_fkey" FOREIGN KEY ("primary_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_spaces" ADD CONSTRAINT "event_spaces_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_spaces" ADD CONSTRAINT "event_spaces_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_documents" ADD CONSTRAINT "event_documents_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stands" ADD CONSTRAINT "stands_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stands" ADD CONSTRAINT "stands_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stand_documents" ADD CONSTRAINT "stand_documents_stand_id_fkey" FOREIGN KEY ("stand_id") REFERENCES "stands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_billing_client_id_fkey" FOREIGN KEY ("billing_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_stand_id_fkey" FOREIGN KEY ("stand_id") REFERENCES "stands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_original_order_id_fkey" FOREIGN KEY ("original_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_documents" ADD CONSTRAINT "order_documents_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_documents" ADD CONSTRAINT "order_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_portal_user_id_fkey" FOREIGN KEY ("portal_user_id") REFERENCES "portal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "gallery_artists" ADD CONSTRAINT "gallery_artists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_collections" ADD CONSTRAINT "gallery_collections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_locations" ADD CONSTRAINT "gallery_locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_artworks" ADD CONSTRAINT "gallery_artworks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_artworks" ADD CONSTRAINT "gallery_artworks_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "gallery_artists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_artworks" ADD CONSTRAINT "gallery_artworks_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "gallery_collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_artworks" ADD CONSTRAINT "gallery_artworks_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "gallery_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_memberships" ADD CONSTRAINT "gallery_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_memberships" ADD CONSTRAINT "gallery_memberships_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "gallery_artists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_classes" ADD CONSTRAINT "gallery_classes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_classes" ADD CONSTRAINT "gallery_classes_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "gallery_artists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_classes" ADD CONSTRAINT "gallery_classes_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "gallery_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_class_enrollments" ADD CONSTRAINT "gallery_class_enrollments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_class_enrollments" ADD CONSTRAINT "gallery_class_enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "gallery_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_exhibitions" ADD CONSTRAINT "gallery_exhibitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_exhibitions" ADD CONSTRAINT "gallery_exhibitions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "gallery_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_exhibition_artworks" ADD CONSTRAINT "gallery_exhibition_artworks_exhibitionId_fkey" FOREIGN KEY ("exhibitionId") REFERENCES "gallery_exhibitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_exhibition_artworks" ADD CONSTRAINT "gallery_exhibition_artworks_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "gallery_artworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_carts" ADD CONSTRAINT "gallery_carts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_cart_items" ADD CONSTRAINT "gallery_cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "gallery_carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_cart_items" ADD CONSTRAINT "gallery_cart_items_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "gallery_artworks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_cart_items" ADD CONSTRAINT "gallery_cart_items_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "gallery_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_cart_items" ADD CONSTRAINT "gallery_cart_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_orders" ADD CONSTRAINT "gallery_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_order_line_items" ADD CONSTRAINT "gallery_order_line_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "gallery_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_order_line_items" ADD CONSTRAINT "gallery_order_line_items_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "gallery_artworks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_order_line_items" ADD CONSTRAINT "gallery_order_line_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_favorites" ADD CONSTRAINT "gallery_favorites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_favorites" ADD CONSTRAINT "gallery_favorites_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "gallery_artworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

