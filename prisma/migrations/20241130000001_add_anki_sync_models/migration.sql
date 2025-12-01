-- CreateTable
CREATE TABLE IF NOT EXISTS "AnkiSyncToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnkiSyncToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AnkiSyncStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "newDue" INTEGER NOT NULL DEFAULT 0,
    "reviewDue" INTEGER NOT NULL DEFAULT 0,
    "learningDue" INTEGER NOT NULL DEFAULT 0,
    "totalDue" INTEGER NOT NULL DEFAULT 0,
    "newStudied" INTEGER NOT NULL DEFAULT 0,
    "reviewsStudied" INTEGER NOT NULL DEFAULT 0,
    "learnedToday" INTEGER NOT NULL DEFAULT 0,
    "timeStudiedSecs" INTEGER NOT NULL DEFAULT 0,
    "againCount" INTEGER NOT NULL DEFAULT 0,
    "hardCount" INTEGER NOT NULL DEFAULT 0,
    "goodCount" INTEGER NOT NULL DEFAULT 0,
    "easyCount" INTEGER NOT NULL DEFAULT 0,
    "totalCards" INTEGER NOT NULL DEFAULT 0,
    "totalNotes" INTEGER NOT NULL DEFAULT 0,
    "matureCards" INTEGER NOT NULL DEFAULT 0,
    "youngCards" INTEGER NOT NULL DEFAULT 0,
    "suspendedCards" INTEGER NOT NULL DEFAULT 0,
    "buriedCards" INTEGER NOT NULL DEFAULT 0,
    "retentionRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnkiSyncStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AnkiDeckStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deckName" TEXT NOT NULL,
    "deckId" TEXT,
    "newDue" INTEGER NOT NULL DEFAULT 0,
    "reviewDue" INTEGER NOT NULL DEFAULT 0,
    "learningDue" INTEGER NOT NULL DEFAULT 0,
    "totalCards" INTEGER NOT NULL DEFAULT 0,
    "totalNew" INTEGER NOT NULL DEFAULT 0,
    "totalLearning" INTEGER NOT NULL DEFAULT 0,
    "totalReview" INTEGER NOT NULL DEFAULT 0,
    "totalSuspended" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnkiDeckStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AnkiSyncToken_userId_key') THEN
        CREATE UNIQUE INDEX "AnkiSyncToken_userId_key" ON "AnkiSyncToken"("userId");
    END IF;
END $$;

-- CreateIndex
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AnkiSyncToken_token_key') THEN
        CREATE UNIQUE INDEX "AnkiSyncToken_token_key" ON "AnkiSyncToken"("token");
    END IF;
END $$;

-- CreateIndex
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AnkiSyncStats_userId_idx') THEN
        CREATE INDEX "AnkiSyncStats_userId_idx" ON "AnkiSyncStats"("userId");
    END IF;
END $$;

-- CreateIndex
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AnkiSyncStats_syncedAt_idx') THEN
        CREATE INDEX "AnkiSyncStats_syncedAt_idx" ON "AnkiSyncStats"("syncedAt");
    END IF;
END $$;

-- CreateIndex
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AnkiDeckStats_userId_deckName_key') THEN
        CREATE UNIQUE INDEX "AnkiDeckStats_userId_deckName_key" ON "AnkiDeckStats"("userId", "deckName");
    END IF;
END $$;

-- CreateIndex
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AnkiDeckStats_userId_idx') THEN
        CREATE INDEX "AnkiDeckStats_userId_idx" ON "AnkiDeckStats"("userId");
    END IF;
END $$;

-- AddForeignKey (with check)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnkiSyncToken_userId_fkey') THEN
        ALTER TABLE "AnkiSyncToken" ADD CONSTRAINT "AnkiSyncToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (with check)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnkiSyncStats_userId_fkey') THEN
        ALTER TABLE "AnkiSyncStats" ADD CONSTRAINT "AnkiSyncStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (with check)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnkiDeckStats_userId_fkey') THEN
        ALTER TABLE "AnkiDeckStats" ADD CONSTRAINT "AnkiDeckStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
