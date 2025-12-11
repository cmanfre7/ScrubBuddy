# Calendar Sync Implementation Plan

## Overview

Implement two-way sync with Google Calendar and one-way sync with Apple Calendar.

**Reality check on Apple Calendar:** Apple doesn't have a public API for web apps. The only options are:
1. **CalDAV protocol** - Complex, requires app-specific passwords, user-hostile setup
2. **ICS feed subscription** - Apple Calendar subscribes to a URL; one-way only (ScrubBuddy -> Apple)

**Recommendation:** Full two-way Google Calendar sync + ICS feed for Apple Calendar.

---

## Part 1: Google Calendar (Two-Way Sync)

### Step 1: Google Cloud Console Setup (User Must Do)

You'll need to:
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable "Google Calendar API"
4. Configure OAuth consent screen (External, just your email for testing)
5. Create OAuth 2.0 credentials (Web application)
   - Authorized redirect URI: `https://scrubbuddy.app/api/auth/callback/google`
6. Copy Client ID and Client Secret

### Step 2: Add Environment Variables

```bash
# Add to Railway environment variables
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

### Step 3: Update NextAuth Config

**File: `src/lib/auth.ts`**

Add Google provider with calendar scope:

```typescript
import GoogleProvider from 'next-auth/providers/google'

// Add to providers array:
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authorization: {
    params: {
      scope: 'openid email profile https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
    },
  },
}),
```

Update callbacks to store Google tokens.

### Step 4: Create Google Calendar API Routes

**New Files:**
- `src/app/api/google-calendar/connect/route.ts` - Initiate OAuth flow
- `src/app/api/google-calendar/callback/route.ts` - Handle OAuth callback
- `src/app/api/google-calendar/disconnect/route.ts` - Remove connection
- `src/app/api/google-calendar/calendars/route.ts` - List user's Google calendars
- `src/app/api/google-calendar/sync/route.ts` - Perform sync
- `src/lib/google-calendar.ts` - Helper functions for Google Calendar API

### Step 5: Sync Logic

**From ScrubBuddy to Google:**
- When creating/updating/deleting event in ScrubBuddy, also push to Google
- Store `googleEventId` on CalendarEvent for tracking

**From Google to ScrubBuddy:**
- Fetch events from Google Calendar API
- Compare with local events by `googleEventId`
- Create/update/delete local events as needed
- Use incremental sync with `syncToken` for efficiency

### Step 6: Settings UI

Add "Calendar Sync" card to Settings page:
- "Connect Google Calendar" button (shows OAuth popup)
- Connected status with email
- Select which Google calendars to sync
- Sync direction toggle (both/to Google/from Google)
- "Sync Now" button
- "Disconnect" button

---

## Part 2: Apple Calendar (ICS Feed)

### How It Works

1. Generate a unique, secure ICS feed URL for the user
2. User subscribes to this URL in Apple Calendar (or any calendar app)
3. Apple Calendar polls this URL periodically (usually every 15-60 min)
4. Events from ScrubBuddy appear in Apple Calendar

**Limitation:** One-way only. Events created in Apple Calendar won't sync back.

### Step 1: Create ICS Feed API Route

**New File: `src/app/api/calendar/feed/[token]/route.ts`**

- Accept a secret token in URL for authentication
- Return all calendar events in iCalendar (.ics) format
- No session required (token-based auth for calendar app access)

### Step 2: Generate Feed Token

**New Fields on User or separate model:**

```prisma
model CalendarFeed {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(...)
  token     String   @unique  // Random secure token
  createdAt DateTime @default(now())
}
```

### Step 3: Settings UI

Add to Calendar Sync card:
- "Apple/Other Calendars" section
- "Generate Feed URL" button
- Display feed URL with copy button
- Instructions: "Subscribe to this URL in your calendar app"
- "Regenerate URL" button (invalidates old URL)

### Step 4: ICS Format

Return proper iCalendar format:
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ScrubBuddy//Calendar//EN
BEGIN:VEVENT
UID:event-id@scrubbuddy.app
DTSTART:20250109T090000Z
DTEND:20250109T100000Z
SUMMARY:Clinical rotation
...
END:VEVENT
END:VCALENDAR
```

---

## Implementation Order

1. **Database migration** - Add CalendarFeed model
2. **ICS feed** - Simpler, no OAuth complexity (1-2 hours)
3. **Google OAuth setup** - Configure cloud console + env vars
4. **Google auth integration** - Add provider, token storage
5. **Google Calendar API** - Sync logic, CRUD operations
6. **Settings UI** - Connect/disconnect, feed URL display
7. **Testing & polish**

---

## Files to Create/Modify

### New Files
- `src/app/api/google-calendar/connect/route.ts`
- `src/app/api/google-calendar/disconnect/route.ts`
- `src/app/api/google-calendar/calendars/route.ts`
- `src/app/api/google-calendar/sync/route.ts`
- `src/app/api/calendar/feed/[token]/route.ts`
- `src/lib/google-calendar.ts`
- `src/lib/ics.ts`

### Modified Files
- `prisma/schema.prisma` - Add CalendarFeed model
- `src/lib/auth.ts` - Add Google provider with calendar scope
- `src/app/(dashboard)/dashboard/settings/page.tsx` - Add Calendar Sync UI

### Dependencies to Install
```bash
npm install googleapis ical-generator
```

---

## User Experience Flow

### Google Calendar
1. User goes to Settings
2. Clicks "Connect Google Calendar"
3. Redirected to Google OAuth consent
4. Selects calendars to sync
5. Events sync automatically

### Apple Calendar
1. User goes to Settings
2. Clicks "Generate Feed URL"
3. Copies URL
4. Opens Apple Calendar > File > New Calendar Subscription
5. Pastes URL
6. ScrubBuddy events appear in Apple Calendar

---

## Ready to implement?
