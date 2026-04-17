-- Supplier Portal tables

CREATE TABLE IF NOT EXISTS "supplier_portal_users" (
  "id"            TEXT NOT NULL,
  "tenant_id"     TEXT NOT NULL,
  "email"         TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "first_name"    TEXT NOT NULL,
  "last_name"     TEXT NOT NULL,
  "phone"         TEXT,
  "is_active"     BOOLEAN NOT NULL DEFAULT true,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "supplier_portal_users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_portal_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_portal_users_tenant_id_email_key" ON "supplier_portal_users"("tenant_id", "email");

CREATE TABLE IF NOT EXISTS "supplier_portal_codes" (
  "id"          TEXT NOT NULL,
  "tenant_id"   TEXT NOT NULL,
  "supplier_id" TEXT NOT NULL,
  "code"        TEXT NOT NULL,
  "max_uses"    INTEGER NOT NULL DEFAULT 1,
  "used_count"  INTEGER NOT NULL DEFAULT 0,
  "expires_at"  TIMESTAMPTZ,
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "supplier_portal_codes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_portal_codes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "supplier_portal_codes_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_portal_codes_code_key" ON "supplier_portal_codes"("code");

CREATE TABLE IF NOT EXISTS "supplier_portal_user_suppliers" (
  "id"             TEXT NOT NULL,
  "portal_user_id" TEXT NOT NULL,
  "supplier_id"    TEXT NOT NULL,
  "access_code_id" TEXT,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "supplier_portal_user_suppliers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_portal_user_suppliers_portal_user_id_fkey" FOREIGN KEY ("portal_user_id") REFERENCES "supplier_portal_users"("id") ON DELETE CASCADE,
  CONSTRAINT "supplier_portal_user_suppliers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE,
  CONSTRAINT "supplier_portal_user_suppliers_access_code_id_fkey" FOREIGN KEY ("access_code_id") REFERENCES "supplier_portal_codes"("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_portal_user_suppliers_portal_user_id_supplier_id_key" ON "supplier_portal_user_suppliers"("portal_user_id", "supplier_id");

CREATE TABLE IF NOT EXISTS "supplier_portal_password_resets" (
  "id"             TEXT NOT NULL,
  "portal_user_id" TEXT NOT NULL,
  "token"          TEXT NOT NULL,
  "expires_at"     TIMESTAMPTZ NOT NULL,
  "used_at"        TIMESTAMPTZ,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "supplier_portal_password_resets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_portal_password_resets_portal_user_id_fkey" FOREIGN KEY ("portal_user_id") REFERENCES "supplier_portal_users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_portal_password_resets_token_key" ON "supplier_portal_password_resets"("token");

CREATE TABLE IF NOT EXISTS "supplier_conversations" (
  "id"             TEXT NOT NULL,
  "tenant_id"      TEXT NOT NULL,
  "portal_user_id" TEXT NOT NULL,
  "supplier_id"    TEXT NOT NULL,
  "subject"        TEXT,
  "unread_admin"   INTEGER NOT NULL DEFAULT 0,
  "unread_portal"  INTEGER NOT NULL DEFAULT 0,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "supplier_conversations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "supplier_conversations_portal_user_id_fkey" FOREIGN KEY ("portal_user_id") REFERENCES "supplier_portal_users"("id"),
  CONSTRAINT "supplier_conversations_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
);

CREATE TABLE IF NOT EXISTS "supplier_messages" (
  "id"              TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "sender_type"     TEXT NOT NULL,
  "sender_id"       TEXT NOT NULL,
  "sender_name"     TEXT NOT NULL,
  "content"         TEXT,
  "file_url"        TEXT,
  "file_name"       TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "supplier_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "supplier_conversations"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "supplier_messages_conversation_id_idx" ON "supplier_messages"("conversation_id");

CREATE TABLE IF NOT EXISTS "supplier_documents" (
  "id"             TEXT NOT NULL,
  "tenant_id"      TEXT NOT NULL,
  "supplier_id"    TEXT NOT NULL,
  "uploader_type"  TEXT NOT NULL,
  "uploaded_by_id" TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "file_url"       TEXT NOT NULL,
  "file_name"      TEXT NOT NULL,
  "mime_type"      TEXT,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "supplier_documents_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "supplier_documents_tenant_id_supplier_id_idx" ON "supplier_documents"("tenant_id", "supplier_id");

-- Add isVisibleToSupplier to purchase_order_documents
ALTER TABLE "purchase_order_documents" ADD COLUMN IF NOT EXISTS "is_visible_to_supplier" BOOLEAN NOT NULL DEFAULT false;
