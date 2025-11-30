-- CreateTable
CREATE TABLE IF NOT EXISTS "CalendarEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "timeZone" TEXT NOT NULL DEFAULT 'America/New_York',
    "eventType" TEXT NOT NULL,
    "category" TEXT,
    "color" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "recurrenceEnd" TIMESTAMP(3),
    "parentEventId" TEXT,
    "reminderMins" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "googleEventId" TEXT,
    "googleCalendarId" TEXT,
    "isSynced" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "rotationId" TEXT,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GoogleCalendarSync" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "selectedCalendars" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastSyncAt" TIMESTAMP(3),
    "syncDirection" TEXT NOT NULL DEFAULT 'both',
    "preferLocal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CalendarEvent_googleEventId_key" ON "CalendarEvent"("googleEventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalendarEvent_userId_idx" ON "CalendarEvent"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalendarEvent_startTime_idx" ON "CalendarEvent"("startTime");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalendarEvent_eventType_idx" ON "CalendarEvent"("eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalendarEvent_googleEventId_idx" ON "CalendarEvent"("googleEventId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GoogleCalendarSync_userId_key" ON "GoogleCalendarSync"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GoogleCalendarSync_userId_idx" ON "GoogleCalendarSync"("userId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CalendarEvent_userId_fkey'
    ) THEN
        ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GoogleCalendarSync_userId_fkey'
    ) THEN
        ALTER TABLE "GoogleCalendarSync" ADD CONSTRAINT "GoogleCalendarSync_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
