-- Add new fields to UWorldIncorrect for PDF question-level data
-- All new columns are nullable for backward compatibility

-- Add subject column
ALTER TABLE "UWorldIncorrect" ADD COLUMN IF NOT EXISTS "subject" TEXT;

-- Add system column
ALTER TABLE "UWorldIncorrect" ADD COLUMN IF NOT EXISTS "system" TEXT;

-- Add category column
ALTER TABLE "UWorldIncorrect" ADD COLUMN IF NOT EXISTS "category" TEXT;

-- Add percentOthers column
ALTER TABLE "UWorldIncorrect" ADD COLUMN IF NOT EXISTS "percentOthers" INTEGER;

-- Add timeSpent column
ALTER TABLE "UWorldIncorrect" ADD COLUMN IF NOT EXISTS "timeSpent" INTEGER;

-- Add testName column
ALTER TABLE "UWorldIncorrect" ADD COLUMN IF NOT EXISTS "testName" TEXT;

-- Add unique constraint on userId + questionId to prevent duplicate questions
-- Use DO block to make it idempotent
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UWorldIncorrect_userId_questionId_key'
    ) THEN
        ALTER TABLE "UWorldIncorrect" ADD CONSTRAINT "UWorldIncorrect_userId_questionId_key" UNIQUE ("userId", "questionId");
    END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "UWorldIncorrect_subject_idx" ON "UWorldIncorrect"("subject");
CREATE INDEX IF NOT EXISTS "UWorldIncorrect_system_idx" ON "UWorldIncorrect"("system");
