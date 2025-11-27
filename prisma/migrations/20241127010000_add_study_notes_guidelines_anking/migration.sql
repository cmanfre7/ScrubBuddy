-- CreateTable
CREATE TABLE "StudyNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rotationId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalGuideline" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rotationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "specialty" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "source" TEXT,
    "lastReviewed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalGuideline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnkiProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "newCards" INTEGER NOT NULL DEFAULT 0,
    "reviewCards" INTEGER NOT NULL DEFAULT 0,
    "totalTime" INTEGER,
    "deckName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnkiProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnkiGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalCards" INTEGER NOT NULL DEFAULT 0,
    "cardsCompleted" INTEGER NOT NULL DEFAULT 0,
    "targetDate" TIMESTAMP(3),
    "dailyNewGoal" INTEGER NOT NULL DEFAULT 30,
    "dailyReviewGoal" INTEGER NOT NULL DEFAULT 200,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnkiGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyNote_userId_idx" ON "StudyNote"("userId");

-- CreateIndex
CREATE INDEX "StudyNote_rotationId_idx" ON "StudyNote"("rotationId");

-- CreateIndex
CREATE INDEX "StudyNote_category_idx" ON "StudyNote"("category");

-- CreateIndex
CREATE INDEX "ClinicalGuideline_userId_idx" ON "ClinicalGuideline"("userId");

-- CreateIndex
CREATE INDEX "ClinicalGuideline_rotationId_idx" ON "ClinicalGuideline"("rotationId");

-- CreateIndex
CREATE INDEX "ClinicalGuideline_specialty_idx" ON "ClinicalGuideline"("specialty");

-- CreateIndex
CREATE INDEX "AnkiProgress_userId_idx" ON "AnkiProgress"("userId");

-- CreateIndex
CREATE INDEX "AnkiProgress_date_idx" ON "AnkiProgress"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AnkiProgress_userId_date_key" ON "AnkiProgress"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AnkiGoal_userId_key" ON "AnkiGoal"("userId");

-- AddForeignKey
ALTER TABLE "StudyNote" ADD CONSTRAINT "StudyNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyNote" ADD CONSTRAINT "StudyNote_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "Rotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalGuideline" ADD CONSTRAINT "ClinicalGuideline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalGuideline" ADD CONSTRAINT "ClinicalGuideline_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "Rotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnkiProgress" ADD CONSTRAINT "AnkiProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnkiGoal" ADD CONSTRAINT "AnkiGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
