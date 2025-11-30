-- CreateTable
CREATE TABLE IF NOT EXISTS "ClinicalPearl" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rotationId" TEXT,
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isHighYield" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "patientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalPearl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClinicalReference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rotationId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PharmNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rotationId" TEXT,
    "drugName" TEXT NOT NULL,
    "drugClass" TEXT,
    "indication" TEXT,
    "mechanism" TEXT,
    "sideEffects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contraindications" TEXT,
    "notes" TEXT,
    "isHighYield" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClinicalPearl_userId_idx" ON "ClinicalPearl"("userId");
CREATE INDEX IF NOT EXISTS "ClinicalPearl_rotationId_idx" ON "ClinicalPearl"("rotationId");
CREATE INDEX IF NOT EXISTS "ClinicalPearl_createdAt_idx" ON "ClinicalPearl"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClinicalReference_userId_idx" ON "ClinicalReference"("userId");
CREATE INDEX IF NOT EXISTS "ClinicalReference_rotationId_idx" ON "ClinicalReference"("rotationId");
CREATE INDEX IF NOT EXISTS "ClinicalReference_category_idx" ON "ClinicalReference"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PharmNote_userId_idx" ON "PharmNote"("userId");
CREATE INDEX IF NOT EXISTS "PharmNote_rotationId_idx" ON "PharmNote"("rotationId");
CREATE INDEX IF NOT EXISTS "PharmNote_drugName_idx" ON "PharmNote"("drugName");

-- AddForeignKey (simplified)
ALTER TABLE "ClinicalPearl" DROP CONSTRAINT IF EXISTS "ClinicalPearl_userId_fkey";
ALTER TABLE "ClinicalPearl" ADD CONSTRAINT "ClinicalPearl_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClinicalPearl" DROP CONSTRAINT IF EXISTS "ClinicalPearl_rotationId_fkey";
ALTER TABLE "ClinicalPearl" ADD CONSTRAINT "ClinicalPearl_rotationId_fkey"
    FOREIGN KEY ("rotationId") REFERENCES "Rotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClinicalReference" DROP CONSTRAINT IF EXISTS "ClinicalReference_userId_fkey";
ALTER TABLE "ClinicalReference" ADD CONSTRAINT "ClinicalReference_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClinicalReference" DROP CONSTRAINT IF EXISTS "ClinicalReference_rotationId_fkey";
ALTER TABLE "ClinicalReference" ADD CONSTRAINT "ClinicalReference_rotationId_fkey"
    FOREIGN KEY ("rotationId") REFERENCES "Rotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PharmNote" DROP CONSTRAINT IF EXISTS "PharmNote_userId_fkey";
ALTER TABLE "PharmNote" ADD CONSTRAINT "PharmNote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PharmNote" DROP CONSTRAINT IF EXISTS "PharmNote_rotationId_fkey";
ALTER TABLE "PharmNote" ADD CONSTRAINT "PharmNote_rotationId_fkey"
    FOREIGN KEY ("rotationId") REFERENCES "Rotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
