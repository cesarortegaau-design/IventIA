-- CreateEnum
CREATE TYPE "EventSpaceStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- AlterTable
ALTER TABLE "event_spaces" ADD COLUMN "status" "EventSpaceStatus" NOT NULL DEFAULT 'ACTIVE';
