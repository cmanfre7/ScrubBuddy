-- CreateTable
CREATE TABLE IF NOT EXISTS "UWorldQuestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "logId" TEXT,
    "questionId" TEXT,
    "subject" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "percentOthers" INTEGER NOT NULL DEFAULT 0,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "isCorrect" BOOLEAN NOT NULL,
    "testName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UWorldQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'UWorldQuestion_userId_questionId_key') THEN
        CREATE UNIQUE INDEX "UWorldQuestion_userId_questionId_key" ON "UWorldQuestion"("userId", "questionId");
    END IF;
END $$;

-- CreateIndex
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'UWorldQuestion_userId_idx') THEN
        CREATE INDEX "UWorldQuestion_userId_idx" ON "UWorldQuestion"("userId");
    END IF;
END $$;

-- CreateIndex
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'UWorldQuestion_logId_idx') THEN
        CREATE INDEX "UWorldQuestion_logId_idx" ON "UWorldQuestion"("logId");
    END IF;
END $$;

-- CreateIndex
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'UWorldQuestion_subject_idx') THEN
        CREATE INDEX "UWorldQuestion_subject_idx" ON "UWorldQuestion"("subject");
    END IF;
END $$;

-- CreateIndex
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'UWorldQuestion_system_idx') THEN
        CREATE INDEX "UWorldQuestion_system_idx" ON "UWorldQuestion"("system");
    END IF;
END $$;

-- CreateIndex
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'UWorldQuestion_isCorrect_idx') THEN
        CREATE INDEX "UWorldQuestion_isCorrect_idx" ON "UWorldQuestion"("isCorrect");
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UWorldQuestion_userId_fkey') THEN
        ALTER TABLE "UWorldQuestion" ADD CONSTRAINT "UWorldQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UWorldQuestion_logId_fkey') THEN
        ALTER TABLE "UWorldQuestion" ADD CONSTRAINT "UWorldQuestion_logId_fkey" FOREIGN KEY ("logId") REFERENCES "UWorldLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
