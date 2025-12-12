-- AlterTable: Add image support to ClinicalPearl
ALTER TABLE "ClinicalPearl" ADD COLUMN "imageData" TEXT;
ALTER TABLE "ClinicalPearl" ADD COLUMN "imageType" TEXT;
