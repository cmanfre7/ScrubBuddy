-- Fix Resource table: remove category NOT NULL constraint
-- The category column was replaced by type, but the constraint remained

-- First, ensure all rows have category set (copy from type if needed)
UPDATE "Resource" SET "category" = "type" WHERE "category" IS NULL;

-- Make category nullable since we're using type now
ALTER TABLE "Resource" ALTER COLUMN "category" DROP NOT NULL;
