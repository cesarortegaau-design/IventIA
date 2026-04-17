ALTER TABLE "event_documents" ADD COLUMN IF NOT EXISTS "file_content" BYTEA;
ALTER TABLE "order_documents" ADD COLUMN IF NOT EXISTS "file_content" BYTEA;
ALTER TABLE "contract_documents" ADD COLUMN IF NOT EXISTS "file_content" BYTEA;
