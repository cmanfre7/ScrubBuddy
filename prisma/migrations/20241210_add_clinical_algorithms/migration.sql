-- CreateTable
CREATE TABLE IF NOT EXISTS "ClinicalAlgorithm" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rotationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "imageType" TEXT NOT NULL,
    "source" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isHighYield" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalAlgorithm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClinicalAlgorithm_userId_idx" ON "ClinicalAlgorithm"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClinicalAlgorithm_rotationId_idx" ON "ClinicalAlgorithm"("rotationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClinicalAlgorithm_subject_idx" ON "ClinicalAlgorithm"("subject");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClinicalAlgorithm_isHighYield_idx" ON "ClinicalAlgorithm"("isHighYield");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ClinicalAlgorithm_userId_fkey'
    ) THEN
        ALTER TABLE "ClinicalAlgorithm" ADD CONSTRAINT "ClinicalAlgorithm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ClinicalAlgorithm_rotationId_fkey'
    ) THEN
        ALTER TABLE "ClinicalAlgorithm" ADD CONSTRAINT "ClinicalAlgorithm_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "Rotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
