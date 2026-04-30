-- Add map_data to ticket_events (if not exists)
ALTER TABLE "ticket_events" ADD COLUMN IF NOT EXISTS "map_data" JSONB;

-- Update ticket_sections: replace map_polygon with shape-related fields
ALTER TABLE "ticket_sections" DROP COLUMN IF EXISTS "map_polygon";
ALTER TABLE "ticket_sections" ADD COLUMN IF NOT EXISTS "shape_type" VARCHAR(50);
ALTER TABLE "ticket_sections" ADD COLUMN IF NOT EXISTS "shape_data" JSONB;
ALTER TABLE "ticket_sections" ADD COLUMN IF NOT EXISTS "label_x" INTEGER;
ALTER TABLE "ticket_sections" ADD COLUMN IF NOT EXISTS "label_y" INTEGER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "ticket_events_map_data_idx" ON "ticket_events"("tenant_id") WHERE "map_data" IS NOT NULL;
