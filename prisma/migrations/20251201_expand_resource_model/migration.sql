-- AlterTable - Add new columns to Resource table
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "embedUrl" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "duration" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "channel" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "thumbnail" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "pageCount" INTEGER;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "favicon" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "isFavorite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- Make url optional (was required before)
ALTER TABLE "Resource" ALTER COLUMN "url" DROP NOT NULL;

-- Update existing rows to have a type
UPDATE "Resource" SET "type" = "category" WHERE "type" IS NULL;

-- Set updatedAt for existing rows
UPDATE "Resource" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- Make type required (after setting defaults)
DO $$ BEGIN
  ALTER TABLE "Resource" ALTER COLUMN "type" SET NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Resource_type_idx" ON "Resource"("type");
CREATE INDEX IF NOT EXISTS "Resource_subject_idx" ON "Resource"("subject");
