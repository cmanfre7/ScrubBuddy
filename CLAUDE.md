# CLAUDE.md - ScrubBuddy Master Documentation

## READ THIS ENTIRE FILE BEFORE DOING ANY WORK

This is the **single source of truth** for the ScrubBuddy project. AI agents MUST read this completely before making changes and MUST update it at the end of each session.

---

## SESSION PROTOCOL FOR AI AGENTS

### At Session Start
1. Read this entire CLAUDE.md file
2. Check the Session Log section for recent context
3. Review any recent git commits: `git log --oneline -10`
4. Understand what's implemented vs planned before coding

### At Session End (When User Says "End of Session")
1. Update the "Session Log" section with:
   - Date
   - What was worked on
   - What was completed
   - Any issues encountered and how they were resolved
   - Any pending items for next session
2. Update "Implementation Status" if features were added/fixed
3. Update "Known Issues & Solutions" if bugs were fixed
4. Commit the CLAUDE.md update with message: `docs: Update CLAUDE.md session log`

### Deployment Protocol
**Railway auto-deploys from GitHub. Just push to main branch.**
```bash
git add -A && git commit -m "your message" && git push origin main
# That's it! Railway detects the push and deploys automatically.
# You do NOT need to run `railway up` or check railway logs.
```

**NEVER use `railway up` command** - It's unnecessary because:
1. Railway is connected to GitHub and auto-deploys on every push to `main`
2. Using `railway up` bypasses GitHub and can cause sync issues
3. Just push to GitHub and the deploy happens automatically within 1-2 minutes

---

## What is ScrubBuddy?

A **personal productivity app for medical students** (3rd/4th year clerkships). NOT a public SaaS product - just a personal tool for the developer.

**Live URL:** https://scrubbuddy.app

**Core Purpose:**
- 3rd Year: Patient logs, procedures, UWorld tracking, shelf exams, rotation schedules, Anki integration, calendar
- 4th Year: Residency programs, ERAS applications, interviews, rank lists (planned for future)

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 14+ |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | v4 |
| Database | PostgreSQL | Railway hosted |
| ORM | Prisma | 5.x (NOT 7+) |
| Auth | NextAuth.js | v4 (credentials only) |
| State | Zustand | latest |
| Data Fetching | TanStack React Query | latest |
| Animations | Framer Motion | latest |
| Icons | Lucide React | latest |
| Charts | Recharts | latest |
| Deployment | Railway | auto-deploy from GitHub |

---

## Project Structure

```
scrubbuddy/
├── prisma/
│   └── schema.prisma              # DATABASE SCHEMA - 30+ models
├── src/
│   ├── app/
│   │   ├── page.tsx               # Sign-in page (root)
│   │   ├── layout.tsx             # Root layout with providers
│   │   ├── globals.css            # Tailwind imports
│   │   ├── (auth)/                # Auth pages
│   │   │   └── register/          # Registration page
│   │   ├── (dashboard)/           # Protected dashboard pages
│   │   │   └── dashboard/
│   │   │       ├── page.tsx       # Main dashboard with widgets
│   │   │       ├── patients/      # Patient log module
│   │   │       ├── procedures/    # Procedure reference
│   │   │       ├── uworld/        # UWorld tracker
│   │   │       ├── anking/        # Anki tracker page
│   │   │       ├── calendar/      # Full calendar view
│   │   │       ├── analytics/     # Analytics & stats
│   │   │       ├── clinical-notes/# Study notes
│   │   │       └── settings/      # User settings
│   │   └── api/                   # 40+ API routes
│   │       ├── auth/              # NextAuth endpoints
│   │       ├── anking/            # Anki sync (5 endpoints)
│   │       ├── patients/          # Patient CRUD
│   │       ├── tasks/             # Task CRUD
│   │       ├── calendar/          # Calendar CRUD
│   │       ├── uworld/            # UWorld (10+ endpoints)
│   │       ├── rotations/         # Rotation management
│   │       ├── practice-exams/    # NBME/UWSA tracking
│   │       ├── shelf-scores/      # Shelf exam scores
│   │       ├── board-exams/       # STEP/COMLEX targets
│   │       ├── clinical-pearls/   # Clinical pearls
│   │       ├── clinical-guidelines/ # Guidelines
│   │       └── study-notes/       # Study notes
│   ├── components/
│   │   ├── ui/                    # 8 reusable UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── stat-card.tsx
│   │   │   ├── textarea.tsx
│   │   │   └── card.tsx
│   │   ├── dashboard/             # Dashboard layout components
│   │   │   ├── DashboardClient.tsx
│   │   │   └── DraggableDashboard.tsx
│   │   ├── dashboard-widgets/     # 9 dashboard widgets
│   │   │   ├── CountdownWidget.tsx
│   │   │   ├── UWorldProgressWidget.tsx
│   │   │   ├── GoalsWidget.tsx
│   │   │   ├── TodayScheduleWidget.tsx
│   │   │   ├── QuickActionsWidget.tsx
│   │   │   ├── WeakAreasWidget.tsx
│   │   │   ├── PearlsWidget.tsx
│   │   │   ├── StreakWidget.tsx
│   │   │   └── AnkiWidget.tsx
│   │   ├── Sidebar.tsx            # Dashboard navigation
│   │   └── Providers.tsx          # React Query + Session
│   ├── lib/
│   │   ├── prisma.ts              # Prisma singleton
│   │   ├── auth.ts                # NextAuth config
│   │   ├── session.ts             # Session helpers
│   │   └── utils.ts               # cn() utility
│   └── types/
│       └── index.ts               # TypeScript types
├── CLAUDE.md                      # THIS FILE
├── README.md                      # Points to CLAUDE.md
├── package.json
├── nixpacks.toml                  # Railway build config
└── .node-version                  # Node 22
```

---

## Database Schema Overview

### User & Auth
- **User** - Core user model with settings (step2Date, comlexDate, dailyGoal, weeklyGoal)

### Rotations
- **Rotation** - Clinical rotations with start/end dates, shelf dates, current flag

### Patient Tracking (for ERAS)
- **Patient** - Patient encounters with chief complaint, diagnosis, setting, age group
- **PatientProcedure** - Links patients to procedures (performed/observed)

### Procedures
- **Procedure** - Master list with indications, contraindications, steps, pearls
- **UserProcedure** - Personal tracking with counts and confidence levels

### UWorld
- **UWorldSettings** - Custom question totals per subject
- **UWorldLog** - Daily session logs with systems and subjects
- **UWorldTest** - Individual tests with subject breakdowns
- **UWorldTestSubject** - Per-subject performance in each test
- **UWorldQuestion** - ALL questions (correct AND incorrect) with subject/system/category/topic breakdown
- **UWorldIncorrect** - Tracked incorrect questions with spaced repetition (legacy, still populated)

### Exams
- **ShelfScore** - Shelf exam scores by rotation
- **PracticeExam** - NBME, UWSA, COMSAE, FREE120 scores
- **BoardExam** - STEP 2 CK / COMLEX Level 2 targets and predictions

### Tasks & Planning
- **Task** - To-do items with priority, recurring, categories
- **StudyBlock** - Scheduled study sessions

### Anki Integration
- **AnkiProgress** - Daily progress tracking
- **AnkiGoal** - Overall completion goals
- **AnkiSyncToken** - API token for Anki add-on authentication
- **AnkiSyncStats** - Detailed stats from auto-sync
- **AnkiDeckStats** - Per-deck statistics

### Notes & References
- **StudyNote** - Study notes by rotation
- **ClinicalPearl** - Quick pearls from rotations
- **ClinicalGuideline** - Algorithms and guidelines
- **ClinicalReference** - MDCalc, UpToDate references
- **PharmNote** - Pharmacology notes

### Calendar
- **CalendarEvent** - Full calendar events with recurrence support
- **GoogleCalendarSync** - OAuth tokens for Google Calendar (planned)

### Resources
- **Resource** - Saved study resources/links
- **AIConversation** - AI chat history (future)

---

## DETAILED FEATURE DOCUMENTATION

### 1. Dashboard (`/dashboard`)

The main dashboard is a **draggable widget system** using `DraggableDashboard.tsx`. Users can rearrange widgets and toggle visibility.

**Current Widgets (in order):**
1. **countdowns** - Exam countdown timers (Rotation, Shelf, STEP 2, COMLEX)
2. **uworld-progress** - UWorld completion % and today/week stats
3. **goals** - Daily tasks/goals with checkboxes
4. **today-schedule** - Today's calendar events
5. **quick-actions** - Quick links to common actions
6. **weak-areas** - UWorld weak systems (lowest performing topics)
7. **pearls** - Random clinical pearls from current rotation
8. **streak** - GitHub-style activity heatmap for UWorld
9. **anki** - Anki sync stats (due cards, studied today)

**Widget Files:**
- `src/components/dashboard/DashboardClient.tsx` - Widget configuration
- `src/components/dashboard/DraggableDashboard.tsx` - Drag/drop logic
- `src/components/dashboard-widgets/*.tsx` - Individual widgets

### 2. Patient Log (`/dashboard/patients`)

**Purpose:** Track patient encounters for ERAS application preparation.

**Features:**
- Log encounters with chief complaint, diagnosis, setting
- Link procedures performed/observed
- Filter by rotation
- Track secondary diagnoses
- Add learning points and follow-up notes

**API Routes:**
- `GET /api/patients` - List all patients (filterable by rotation)
- `POST /api/patients` - Create new patient
- `PUT /api/patients/[id]` - Update patient
- `DELETE /api/patients/[id]` - Delete patient

### 3. UWorld Tracker (`/dashboard/uworld`)

**Purpose:** Track UWorld question bank progress and performance with detailed analytics.

**Features:**
- Log daily question blocks with correct/incorrect counts
- Track by system (Cardio, Pulm, GI, etc.) and subject
- **Paste Text Import (Primary Method):**
  - "Paste Text" tab is now FIRST in the Log Session modal
  - Copy table from UWorld's Review Test > Incorrect tab
  - Toggle checkbox "Pasting incorrect questions only" to log correct OR incorrect questions
  - Parses: Question ID, Subject, System, Category, Topic, % Others, Time Spent
- **Expandable Session Details:**
  - Click any session in the Sessions list to expand
  - Shows detailed breakdown by Subject, System, Category, and Topic
  - Displays total questions, correct/incorrect counts, and percentages
- **UWorldQuestion Model:**
  - Stores ALL questions (both correct and incorrect)
  - Tracks isCorrect flag for cumulative analytics
  - Links to parent UWorldLog session via logId
  - Enables running totals across all exams (e.g., "7x missed in Cardiovascular Surgery")
- Import tests from UWorld (text paste, JSON, or PDF)
- View performance analytics by subject
- Track incorrect questions with spaced repetition status (UWorldIncorrect)
- Custom question totals per subject (Settings)
- Weak Areas widget shows cumulative stats across ALL tests

**API Routes:**
- `GET /api/uworld` - List all logs
- `POST /api/uworld` - Create new log
- `GET /api/uworld/[id]` - Get single log
- `GET /api/uworld/[id]?includeQuestions=true` - Get log with questions + breakdown
- `PATCH /api/uworld/[id]` - Update log
- `DELETE /api/uworld/[id]` - Delete log
- `POST /api/uworld/import` - Import from PDF
- `POST /api/uworld/import-text` - Import from text (saves to UWorldQuestion + UWorldIncorrect)
- `POST /api/uworld/import-json` - Import from JSON
- `POST /api/uworld/dedupe` - Remove duplicates
- `POST /api/uworld/cleanup` - Clean up data
- `DELETE /api/uworld/clear` - Clear all data
- `GET /api/uworld/weak-areas` - Get weak areas (cumulative across ALL tests)
- `GET /api/uworld/settings` - Get custom totals
- `POST /api/uworld/settings` - Set custom totals

**UWorld Text Paste Format (tab-separated):**
```
1 - 118154  Surgery  Cardiovascular  Management  Aortic dissection  65%  45 sec
2 - 118155  Medicine  Pulmonary  Diagnosis  COPD exacerbation  72%  38 sec
```

**Systems Tracked:**
Cardiovascular, Pulmonary, GI, Renal, Neurology, MSK, Endocrine, Heme/Onc, ID, Psychiatry, Reproductive, Dermatology, Biostats, Ethics

**Subjects (Shelf Categories):**
Surgery, Internal Medicine, Pediatrics, OBGYN, Psychiatry, Family Medicine, Neurology

### 4. Anki Integration (`/dashboard/anking`)

**Purpose:** Auto-sync Anki desktop stats to ScrubBuddy.

**How It Works:**
1. User generates a personal sync token in Settings
2. User downloads custom `.ankiaddon` file (generated server-side)
3. Add-on auto-syncs stats every 30 minutes when Anki is open
4. Dashboard widget shows due cards and studied today

**Current Add-on Version:** v1.6.0

**Add-on Compatibility:** Anki 25.02+ (Rust backend)

**API Routes:**
- `GET /api/anking/token` - Check if token exists
- `POST /api/anking/token` - Generate new token
- `DELETE /api/anking/token` - Revoke token
- `POST /api/anking/addon` - Generate personalized .ankiaddon
- `GET /api/anking/sync` - Fetch latest stats (for widget)
- `POST /api/anking/sync` - Receive stats from add-on
- `GET /api/anking/progress` - Manual progress logs
- `POST /api/anking/progress` - Log manual progress
- `GET /api/anking/goal` - Get Anki goals
- `POST /api/anking/goal` - Set Anki goals

**Stats Synced:**
- Due cards (new, review, learning)
- Cards studied today
- Time studied
- Answer breakdown (again/hard/good/easy)
- Collection totals (mature, young, suspended)
- Per-deck breakdowns

### 5. Calendar (`/dashboard/calendar`)

**Purpose:** Full calendar for scheduling and event tracking.

**Features:**
- Month, Week, Day views
- Create/edit/delete events
- Event types: clinical, exam, study, lecture, presentation, personal, meeting, appointment
- All-day events
- Reminders
- Today's schedule shown on dashboard

**API Routes:**
- `GET /api/calendar` - List events (date range filter)
- `POST /api/calendar` - Create event
- `PUT /api/calendar/[id]` - Update event
- `DELETE /api/calendar/[id]` - Delete event

### 6. Procedures Reference (`/dashboard/procedures`)

**Purpose:** Quick reference for medical procedures with personal tracking.

**Features:**
- Searchable procedure library
- Categories: General, Advanced, Specialty
- Specialty filter: Surgery, Medicine, OB, etc.
- Procedure details: indications, contraindications, steps, pearls
- Personal counts (performed/observed)
- Confidence level tracking

### 7. Analytics (`/dashboard/analytics`)

**Purpose:** Detailed performance analytics and exam predictions.

**Features:**
- UWorld performance by system
- Practice exam score tracking
- Shelf exam scores
- Score predictions
- Progress over time

### 8. Settings (`/dashboard/settings`)

**Purpose:** User configuration and data management.

**Features:**
- Profile settings (name, email)
- Rotation management (add/edit/delete rotations)
- Set current rotation
- Exam date settings (STEP 2, COMLEX dates)
- Daily/weekly UWorld goals
- UWorld custom question totals per subject
- Anki sync token management

### 9. Clinical Notes (`/dashboard/clinical-notes`)

**Purpose:** Organize study notes by rotation.

**Features:**
- Notes categorized by type (high yield, diagnosis, clinical pearl, etc.)
- Link to rotations
- Source tracking (preceptor, UWorld, lecture, etc.)
- Star important notes

---

## API AUTHENTICATION

All API routes require authentication via NextAuth session:

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Use session.user.id for queries
}
```

**Exception:** Anki sync routes support both:
- Bearer token auth (for add-on): `Authorization: Bearer <token>`
- Session auth (for web UI): Standard NextAuth session

---

## UI DESIGN SYSTEM

- **Dark mode ONLY** - No light mode
- **Background:** slate-900 to slate-800 gradients
- **Glass morphism:** `bg-slate-800/50 backdrop-blur-sm border-slate-700/50`
- **Accent colors:**
  - Blue: `#60a5fa` (primary actions)
  - Purple: `#a78bfa` (Anki-related)
  - Green: `#34d399` (success/positive)
  - Amber: `#fbbf24` (warnings)
  - Red: `#f87171` (errors/urgent)
- **No emojis** unless user explicitly asks
- **Use existing components** in `src/components/ui/`

---

## KNOWN ISSUES & SOLUTIONS

### Anki Add-on v1.6.0 Compatibility

**Issue:** Anki 25.02+ uses Rust backend which returns lists instead of cursors from DB queries.

**Solution (implemented):**
```python
result = col.db.execute(sql)
if isinstance(result, list):
    row = result[0] if result else None
elif hasattr(result, 'fetchone'):
    row = result.fetchone()
```

**Issue:** Parameterized SQL queries fail silently in Anki 25.02+

**Solution:** Use f-string formatting for SQL (safe for numeric timestamps):
```python
sql = f"SELECT ... FROM revlog WHERE id > {today_start}"
```

**Issue:** Getting total due counts for ALL decks

**Solution:** Use `deck_due_tree()` which returns root node with totals:
```python
tree = sched.deck_due_tree()
if hasattr(tree, 'new_count'):
    stats["newDue"] = tree.new_count
    stats["learningDue"] = tree.learn_count
    stats["reviewDue"] = tree.review_count
```

### Dashboard Widget Issues

**Issue:** AnkiWidget was fetching from non-existent `/api/anking/stats`

**Solution:** Changed to `/api/anking/sync` which has GET handler

### Database Migrations

**Issue:** Migration errors on Railway for idempotent operations

**Solution:** Use `DO` blocks for idempotent SQL:
```sql
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'constraint_name'
  ) THEN
    ALTER TABLE ... ADD CONSTRAINT ...;
  END IF;
END $$;
```

### Date Display Issues

**Issue:** Shelf dates showing one day off

**Solution:** Use `timeZone: 'UTC'` when formatting dates stored as UTC:
```typescript
new Date(shelfDate).toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})
```

---

## PLANNED FEATURES (NOT YET BUILT)

### High Priority

| Feature | Difficulty | Notes |
|---------|------------|-------|
| Google Calendar Sync | Medium | OAuth setup, 2-3 days work |
| UWorld PDF Auto-Import | Medium | Parse PDF incorrects automatically |

### Medium Priority

| Feature | Difficulty | Notes |
|---------|------------|-------|
| Apple Calendar Sync | Hard | CalDAV only, complex |
| 4th Year Module | Medium | Residency tracker, ERAS, interviews |
| Shelf Exam Predictor | Medium | ML model based on UWorld + practice scores |

### Low Priority

| Feature | Difficulty | Notes |
|---------|------------|-------|
| AI Study Coach | Hard | Daily recommendations, weak area focus |
| Offline Mode (PWA) | Medium | Service worker, local storage |
| Mobile App | Hard | React Native or PWA |

---

## DEVELOPMENT COMMANDS

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run lint             # ESLint

# Database
npx prisma studio        # Visual database browser
npx prisma migrate dev   # Create new migration
npx prisma generate      # Generate client after schema changes
npx prisma db push       # Push schema without migration (dev only)

# Git (deployment)
git add -A && git commit -m "message" && git push origin main
```

---

## DO NOT DO

- Don't add light mode (dark only)
- Don't use Prisma 7+ (Railway Node version compatibility)
- Don't add landing/marketing pages (removed intentionally)
- Don't add emojis unless explicitly asked
- Don't over-engineer - this is a personal tool
- Don't use `railway up` - always push to GitHub
- Don't create unnecessary abstraction layers

---

## ROTATION LIST (Default)

1. Psychiatry
2. Pediatrics
3. OB/GYN
4. General Surgery
5. Orthopedic Surgery
6. Internal Medicine
7. Heme/Oncology
8. Family Medicine

---

## SESSION LOG

### December 1, 2025 - Session 1

**Worked On:** Anki sync add-on fixes, dashboard widget fixes, documentation consolidation

**Completed:**
- Fixed Anki add-on v1.4.0 → v1.6.0 for Anki 25.02+ compatibility
  - Due counts now use `deck_due_tree()` for accurate totals
  - Studied today stats now use f-string SQL instead of parameterized queries
  - Handle both list and cursor returns from `col.db.execute()`
- Fixed AnkiWidget API endpoint (was `/api/anking/stats`, changed to `/api/anking/sync`)
- Verified Anki dashboard widget now shows correct stats
- Removed WeekCalendarWidget from dashboard (redundant with calendar page)
- Created comprehensive CLAUDE.md with all features documented
- Added calendar sync assessment to planned features

**Issues Resolved:**
- Due cards showing 0: Fixed by using `deck_due_tree()` root node
- Studied stats showing 0: Fixed by using f-string SQL formatting
- Widget showing all zeros: Fixed by correcting API endpoint URL

**Files Changed:**
- `src/components/dashboard-widgets/AnkiWidget.tsx` - Fixed API endpoint
- `src/components/dashboard/DashboardClient.tsx` - Removed week-calendar widget
- `src/app/(dashboard)/dashboard/page.tsx` - Removed WeekCalendarWidget
- `CLAUDE.md` - Complete rewrite with comprehensive documentation

---

### December 8, 2024 - Session 2

**Worked On:** UWorld question-level tracking, expandable session details, text paste improvements

**Completed:**

1. **Moved "Paste Text" to First Tab Position**
   - In LogSessionModal, changed default tab from 'manual' to 'paste'
   - Reordered tabs: Paste Text -> Manual Entry -> Upload PDF
   - This reflects user's primary workflow for logging UWorld sessions

2. **Created UWorldQuestion Model (New Database Table)**
   - Stores ALL questions (both correct AND incorrect)
   - Fields: userId, logId, questionId, subject, system, category, topic, percentOthers, timeSpent, isCorrect, testName
   - Unique constraint on [userId, questionId] to prevent duplicates
   - Indexes on userId, logId, subject, system, isCorrect for fast queries
   - Migration file: `prisma/migrations/20241208000000_add_uworld_question/migration.sql`

3. **Updated Text Paste Import to Support Both Correct and Incorrect Questions**
   - Added checkbox "Pasting incorrect questions only" (checked by default for backward compat)
   - When unchecked, all pasted questions are saved as correct
   - Shows indicator: "All questions will be saved" when unchecked
   - Questions now saved to both UWorldQuestion (all) and UWorldIncorrect (incorrect only)

4. **Added Expandable Session Details View**
   - Clicking a session in the Sessions list expands to show detailed breakdown
   - Shows breakdown by Subject, System, Category, and Topic
   - Each row displays: name, total questions, correct count, incorrect count, percentage
   - Uses ChevronDown/ChevronUp icons for expand indicator
   - Fetches data from `/api/uworld/[id]?includeQuestions=true`

5. **Updated API Route `/api/uworld/[id]`**
   - Added `?includeQuestions=true` query parameter support
   - When enabled, includes all questions for that session
   - Computes summary stats (bySubject, bySystem, byCategory, byTopic)
   - Each breakdown includes: name, total, correct, incorrect, percentage

6. **Fixed TypeScript Error in API Route**
   - Prisma conditional `include` doesn't provide proper type inference
   - Solution: Use separate queries for with/without questions
   - This allows TypeScript to properly infer the `questions` property exists

**Technical Details:**

UWorldQuestion Schema:
```prisma
model UWorldQuestion {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  logId         String?
  log           UWorldLog? @relation(fields: [logId], references: [id], onDelete: Cascade)
  questionId    String?
  subject       String
  system        String
  category      String
  topic         String
  percentOthers Int       @default(0)
  timeSpent     Int       @default(0)
  isCorrect     Boolean
  testName      String?
  createdAt     DateTime  @default(now())

  @@unique([userId, questionId])
  @@index([userId])
  @@index([logId])
  @@index([subject])
  @@index([system])
  @@index([isCorrect])
}
```

Session Detail API Response (when includeQuestions=true):
```json
{
  "id": "session-id",
  "blockName": "UWSA1",
  "questions": [...],
  "breakdown": {
    "bySubject": [{"name": "Surgery", "total": 10, "correct": 7, "incorrect": 3, "percentage": 70}],
    "bySystem": [...],
    "byCategory": [...],
    "byTopic": [...]
  }
}
```

**Files Changed:**
- `prisma/schema.prisma` - Added UWorldQuestion model and relations
- `prisma/migrations/20241208000000_add_uworld_question/migration.sql` - Database migration
- `src/components/uworld/LogSessionModal.tsx` - Paste Text first, checkbox for correct/incorrect
- `src/app/api/uworld/import-text/route.ts` - Save to UWorldQuestion + UWorldIncorrect
- `src/app/api/uworld/[id]/route.ts` - GET with includeQuestions param + breakdown
- `src/app/(dashboard)/dashboard/uworld/page.tsx` - Expandable session details UI
- `CLAUDE.md` - Updated with December 8 session log

**User Request:**
"Move paste text to first slot, add all columns (subject, systems, categories, topics) when clicking a session, make paste text work for both correct and incorrect questions. Also ensure weak areas keeps a running total across ALL exams."

**Resolution:**
- Paste Text is now first tab
- Clicking sessions shows expandable breakdown with all columns
- Text paste now supports both correct/incorrect via checkbox
- Weak Areas API already fetches ALL incorrect questions across all tests (verified existing functionality)
- New UWorldQuestion model enables cumulative tracking across all exams

---

*Last updated: December 8, 2024*
