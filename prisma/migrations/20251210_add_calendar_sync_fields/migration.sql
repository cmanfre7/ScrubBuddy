-- Add googleEmail and syncToken columns to GoogleCalendarSync
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'GoogleCalendarSync' AND column_name = 'googleEmail'
  ) THEN
    ALTER TABLE "GoogleCalendarSync" ADD COLUMN "googleEmail" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'GoogleCalendarSync' AND column_name = 'syncToken'
  ) THEN
    ALTER TABLE "GoogleCalendarSync" ADD COLUMN "syncToken" TEXT;
  END IF;
END $$;

-- Create CalendarFeed table
CREATE TABLE IF NOT EXISTS "CalendarFeed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarFeed_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'CalendarFeed_userId_key'
  ) THEN
    CREATE UNIQUE INDEX "CalendarFeed_userId_key" ON "CalendarFeed"("userId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'CalendarFeed_token_key'
  ) THEN
    CREATE UNIQUE INDEX "CalendarFeed_token_key" ON "CalendarFeed"("token");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'CalendarFeed_token_idx'
  ) THEN
    CREATE INDEX "CalendarFeed_token_idx" ON "CalendarFeed"("token");
  END IF;
END $$;

-- Add foreign key if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'CalendarFeed_userId_fkey'
  ) THEN
    ALTER TABLE "CalendarFeed" ADD CONSTRAINT "CalendarFeed_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
