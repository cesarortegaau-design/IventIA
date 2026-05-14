-- Player Portal: add category to PortalAccessCode and player fields to PortalUserEvent

ALTER TABLE "portal_access_codes" ADD COLUMN "category" VARCHAR(20);

ALTER TABLE "portal_user_events" ADD COLUMN "player_category" VARCHAR(20);
ALTER TABLE "portal_user_events" ADD COLUMN "payment_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING';
ALTER TABLE "portal_user_events" ADD COLUMN "stripe_session_id" VARCHAR(500);
ALTER TABLE "portal_user_events" ADD COLUMN "paid_at" TIMESTAMP(3);

CREATE INDEX "portal_user_events_portal_user_id_idx" ON "portal_user_events"("portal_user_id");
