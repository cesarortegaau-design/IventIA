CREATE TYPE "SenderType" AS ENUM ('ADMIN', 'PORTAL_USER');

CREATE TABLE "conversations" (
    "id"             TEXT NOT NULL,
    "tenant_id"      TEXT NOT NULL,
    "portal_user_id" TEXT NOT NULL,
    "event_id"       TEXT,
    "subject"        VARCHAR(300),
    "unread_admin"   INTEGER NOT NULL DEFAULT 0,
    "unread_portal"  INTEGER NOT NULL DEFAULT 0,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messages" (
    "id"              TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_type"     "SenderType" NOT NULL,
    "sender_id"       TEXT NOT NULL,
    "sender_name"     VARCHAR(200) NOT NULL,
    "content"         TEXT NOT NULL,
    "file_url"        VARCHAR(500),
    "file_name"       VARCHAR(300),
    "read_at"         TIMESTAMP(3),
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conversations_tenant_id_idx"     ON "conversations"("tenant_id");
CREATE INDEX "conversations_portal_user_id_idx" ON "conversations"("portal_user_id");
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_portal_user_id_fkey"
    FOREIGN KEY ("portal_user_id") REFERENCES "portal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
