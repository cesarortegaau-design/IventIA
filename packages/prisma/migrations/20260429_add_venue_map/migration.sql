-- Add map_data to ticket_events
ALTER TABLE "ticket_events" ADD COLUMN "map_data" JSONB;

-- Update ticket_sections: replace map_polygon with shape-related fields
ALTER TABLE "ticket_sections" DROP COLUMN "map_polygon";
ALTER TABLE "ticket_sections" ADD COLUMN "shape_type" VARCHAR(50);
ALTER TABLE "ticket_sections" ADD COLUMN "shape_data" JSONB;
ALTER TABLE "ticket_sections" ADD COLUMN "label_x" INTEGER;
ALTER TABLE "ticket_sections" ADD COLUMN "label_y" INTEGER;

-- Create index for faster lookups
CREATE INDEX "ticket_events_map_data_idx" ON "ticket_events"("tenant_id") WHERE "map_data" IS NOT NULL;
