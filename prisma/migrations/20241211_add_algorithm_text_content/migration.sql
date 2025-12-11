-- AlterTable: Make imageData and imageType optional, add textContent
ALTER TABLE "ClinicalAlgorithm" ALTER COLUMN "imageData" DROP NOT NULL;
ALTER TABLE "ClinicalAlgorithm" ALTER COLUMN "imageType" DROP NOT NULL;
ALTER TABLE "ClinicalAlgorithm" ADD COLUMN "textContent" TEXT;
