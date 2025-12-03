-- CreateTable - Task completions for recurring tasks
CREATE TABLE IF NOT EXISTS "TaskCompletion" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaskCompletion_taskId_idx" ON "TaskCompletion"("taskId");
CREATE INDEX IF NOT EXISTS "TaskCompletion_date_idx" ON "TaskCompletion"("date");
CREATE UNIQUE INDEX IF NOT EXISTS "TaskCompletion_taskId_date_key" ON "TaskCompletion"("taskId", "date");

-- CreateIndex for Task recurring
CREATE INDEX IF NOT EXISTS "Task_recurring_idx" ON "Task"("recurring");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "TaskCompletion" ADD CONSTRAINT "TaskCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
