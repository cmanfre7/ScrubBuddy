-- CreateTable
CREATE TABLE "UWorldTest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "testId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCorrect" INTEGER NOT NULL,
    "totalIncorrect" INTEGER NOT NULL,
    "totalOmitted" INTEGER NOT NULL DEFAULT 0,
    "percentCorrect" INTEGER NOT NULL,
    "mode" TEXT,
    "timeSpentMins" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UWorldTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UWorldTestSubject" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "incorrect" INTEGER NOT NULL,
    "omitted" INTEGER NOT NULL DEFAULT 0,
    "percentCorrect" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UWorldTestSubject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UWorldTest_userId_idx" ON "UWorldTest"("userId");

-- CreateIndex
CREATE INDEX "UWorldTest_date_idx" ON "UWorldTest"("date");

-- CreateIndex
CREATE INDEX "UWorldTestSubject_testId_idx" ON "UWorldTestSubject"("testId");

-- CreateIndex
CREATE INDEX "UWorldTestSubject_subjectName_idx" ON "UWorldTestSubject"("subjectName");

-- AddForeignKey
ALTER TABLE "UWorldTest" ADD CONSTRAINT "UWorldTest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UWorldTestSubject" ADD CONSTRAINT "UWorldTestSubject_testId_fkey" FOREIGN KEY ("testId") REFERENCES "UWorldTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
