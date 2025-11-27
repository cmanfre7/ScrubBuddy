-- CreateTable
CREATE TABLE "BoardExam" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examType" TEXT NOT NULL,
    "targetScore" INTEGER NOT NULL,
    "predictedScore" INTEGER,
    "examDate" TIMESTAMP(3),
    "readinessPercent" INTEGER,
    "daysUntilExam" INTEGER,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardExam_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "PracticeExam" ADD COLUMN IF NOT EXISTS "examType" TEXT;
ALTER TABLE "PracticeExam" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Update existing PracticeExam records to set examType based on examName
UPDATE "PracticeExam" SET "examType" = 
  CASE 
    WHEN "examName" LIKE 'NBME%' THEN 'NBME'
    WHEN "examName" LIKE 'UWSA%' THEN 'UWSA'
    WHEN "examName" LIKE 'COMSAE%' THEN 'COMSAE'
    WHEN "examName" LIKE 'Free%' THEN 'FREE120'
    ELSE 'NBME'
  END
WHERE "examType" IS NULL;

-- Make examType NOT NULL after setting values
ALTER TABLE "PracticeExam" ALTER COLUMN "examType" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BoardExam_userId_examType_key" ON "BoardExam"("userId", "examType");

-- CreateIndex
CREATE INDEX "BoardExam_userId_idx" ON "BoardExam"("userId");

-- CreateIndex
CREATE INDEX "PracticeExam_examType_idx" ON "PracticeExam"("examType");

-- AddForeignKey
ALTER TABLE "BoardExam" ADD CONSTRAINT "BoardExam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
