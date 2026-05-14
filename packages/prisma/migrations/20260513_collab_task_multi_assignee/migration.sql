-- CreateTable: collab_task_assignees (multi-assignee junction)
CREATE TABLE "collab_task_assignees" (
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "collab_task_assignees_pkey" PRIMARY KEY ("task_id","user_id")
);

-- AddForeignKey
ALTER TABLE "collab_task_assignees" ADD CONSTRAINT "collab_task_assignees_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "collab_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_task_assignees" ADD CONSTRAINT "collab_task_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
