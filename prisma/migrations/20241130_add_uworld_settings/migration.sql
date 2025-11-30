-- CreateTable
CREATE TABLE "UWorldSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UWorldSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UWorldSettings_userId_idx" ON "UWorldSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UWorldSettings_userId_subject_key" ON "UWorldSettings"("userId", "subject");

-- AddForeignKey
ALTER TABLE "UWorldSettings" ADD CONSTRAINT "UWorldSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
