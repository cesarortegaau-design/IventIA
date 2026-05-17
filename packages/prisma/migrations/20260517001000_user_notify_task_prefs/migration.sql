ALTER TABLE "users" ADD COLUMN "notify_task_email" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "notify_task_whatsapp" BOOLEAN NOT NULL DEFAULT false;
