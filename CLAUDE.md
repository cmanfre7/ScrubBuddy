# CLAUDE.md - ScrubBuddy Master Documentation

## CRITICAL: READ THIS ENTIRE FILE BEFORE DOING ANY WORK

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
**ALWAYS push to GitHub for deployment. Railway auto-deploys from GitHub.**
```bash
git add -A && git commit -m "your message" && git push origin main
```
**NEVER use `railway up` directly** - it bypasses GitHub and causes sync issues.

---

## What is ScrubBuddy?

A **personal productivity app for medical students** (3rd/4th year). NOT a SaaS product - just a personal tool.

**Core Purpose:**
- 3rd Year: Patient logs, procedures, UWorld tracking, shelf exams, rotation schedules
- 4th Year: Residency programs, ERAS applications, interviews, rank lists (planned)

**Live URL:** https://scrubbuddy.app

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (Railway) |
| ORM | Prisma 5.x |
| Auth | NextAuth.js v4 (credentials) |
| State | Zustand |
| Data Fetching | TanStack React Query |
| Animations | Framer Motion |
| Icons | Lucide React |
| Charts | Recharts |
| Deployment | Railway (auto-deploy from GitHub) |

---

## Project Structure

```
scrubbuddy/
├── prisma/
│   └── schema.prisma          # DATABASE SCHEMA
├── src/
│   ├── app/
│   │   ├── page.tsx           # Sign-in page (root)
│   │   ├── layout.tsx         # Root layout
│   │   ├── (dashboard)/       # Protected pages
│   │   │   └── dashboard/
│   │   │       ├── page.tsx           # Main dashboard
│   │   │       ├── patients/          # Patient log
│   │   │       ├── procedures/        # Procedure reference
│   │   │       ├── uworld/            # UWorld tracker
│   │   │       ├── anking/            # Anki tracker
│   │   │       ├── calendar/          # Calendar
│   │   │       ├── tasks/             # Tasks
│   │   │       └── settings/          # Settings
│   │   └── api/               # API routes
│   │       ├── anking/        # Anki sync endpoints
│   │       │   ├── addon/     # Generates .ankiaddon file
│   │       │   ├── sync/      # POST: receive stats, GET: fetch stats
│   │       │   ├── token/     # Token management
│   │       │   ├── progress/  # Manual progress logging
│   │       │   └── goal/      # Anki goals
│   │       ├── patients/
│   │       ├── tasks/
│   │       ├── uworld/
│   │       └── rotations/
│   ├── components/
│   │   ├── ui/                # Reusable components
│   │   ├── dashboard/         # Dashboard layout components
│   │   └── dashboard-widgets/ # Dashboard widgets
│   └── lib/
│       ├── prisma.ts          # Prisma singleton
│       ├── auth.ts            # NextAuth config
│       └── utils.ts           # cn() utility
├── CLAUDE.md                  # THIS FILE - Master docs
├── package.json
└── nixpacks.toml              # Railway build config
```

---

## Implementation Status

### Fully Implemented & Working

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication | Working | NextAuth credentials provider |
| Dashboard | Working | Draggable widgets, customizable layout |
| Patient Log | Working | CRUD, filtering by rotation |
| UWorld Tracker | Working | Log sessions, track by system, incorrects |
| Procedure Reference | Working | Search, categories, personal counts |
| Calendar | Working | Month/Week/Day views, events, reminders |
| Tasks/Goals | Working | Per-day goals with date navigation |
| Anki Sync | Working | v1.6.0 - auto-syncs from Anki desktop |
| Anki Dashboard Widget | Working | Shows due cards and studied today |
| Clinical Pearls | Working | Random pearls on dashboard |
| Weak Areas Widget | Working | Shows UWorld weak systems |
| Countdown Timers | Working | STEP/COMLEX/Shelf exam countdowns |
| Study Streak | Working | GitHub-style activity grid |
| Settings | Working | Rotations, exam dates, profile |

### Partially Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Shelf Score Tracking | Basic | Can log scores, limited analytics |
| Practice Exams | Basic | Can track NBMEs |

### Planned (Not Started)

| Feature | Priority | Notes |
|---------|----------|-------|
| 4th Year Module | Medium | Residency tracker, ERAS, interviews |
| Google Calendar Sync | Medium | ~2-3 days work, OAuth setup needed |
| Apple Calendar Sync | Low | CalDAV only, complex |
| AI Study Coach | Future | Daily recommendations, weak areas |
| Offline Mode (PWA) | Future | Service worker caching |

---

## Known Issues & Solutions

### Anki Add-on Compatibility (v1.6.0)

**Issue:** Anki 25.02+ uses Rust backend which returns lists instead of cursors from DB queries.

**Solution (implemented in v1.6.0):**
```python
# Check result type and handle both
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

### Dashboard Widget API Endpoints

**Issue:** AnkiWidget was fetching from non-existent `/api/anking/stats`

**Solution:** Changed to `/api/anking/sync` which has GET handler returning stats

### Database Migrations

**Issue:** Migration errors on Railway for new tables

**Solution:** Use idempotent migrations with `DO` blocks:
```sql
DO $$ BEGIN
  IF NOT EXISTS (...) THEN
    ALTER TABLE ... ADD CONSTRAINT ...;
  END IF;
END $$;
```

---

## API Route Patterns

### Standard Auth Pattern
```typescript
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... fetch data for session.user.id
}
```

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/anking/sync` | GET | Fetch latest synced Anki stats |
| `/api/anking/sync` | POST | Receive stats from Anki add-on |
| `/api/anking/addon` | POST | Generate personalized .ankiaddon file |
| `/api/anking/token` | GET/DELETE | Manage sync token |
| `/api/tasks` | GET | Fetch tasks (optional `?date=YYYY-MM-DD`) |
| `/api/tasks` | POST | Create task |
| `/api/uworld` | GET/POST | UWorld session logging |

---

## UI Design System

- **Dark mode only** - slate-900/slate-800 gradients
- **Glass morphism**: `bg-slate-800/50 backdrop-blur-sm border-slate-700/50`
- **Accent colors**: Blue (#60a5fa), Purple (#a78bfa), Green (#34d399)
- **No emojis** unless user explicitly asks
- **Use existing components** in `src/components/ui/`

---

## Development Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npx prisma studio        # View database
npx prisma migrate dev   # Create migration
npx prisma generate      # Generate client after schema change
```

---

## Do NOT Do

- Don't add light mode (dark only)
- Don't use Prisma 7+ (Railway compatibility)
- Don't add landing/marketing pages
- Don't add emojis unless asked
- Don't over-engineer - personal tool
- Don't use `railway up` - always push to GitHub

---

## Session Log

### December 1, 2024 - Session 1
**Worked On:** Anki sync add-on fixes and dashboard widget

**Completed:**
- Fixed Anki add-on v1.5.0 → v1.6.0 for Anki 25.02+ compatibility
- Due counts now use `deck_due_tree()` for accurate totals
- Studied today stats now use f-string SQL instead of parameterized queries
- Created AnkiWidget dashboard component showing due cards and studied today
- Added widget to DashboardClient and dashboard page
- Fixed AnkiWidget API endpoint (was `/api/anking/stats`, changed to `/api/anking/sync`)
- Added calendar sync assessment to planned features

**Issues Resolved:**
- Due cards showing 0: Fixed by using `deck_due_tree()` root node
- Studied stats showing 0: Fixed by using f-string SQL formatting
- Widget showing all zeros: Fixed by correcting API endpoint URL

**Pending:**
- User should test latest Anki widget after Railway deploys
- Anki add-on v1.6.0 needs user to reinstall to get fixes

---

## Quick Reference

### Rotation List (Default)
1. Psychiatry
2. Pediatrics
3. OB/GYN
4. General Surgery
5. Orthopedic Surgery
6. Internal Medicine
7. Heme/Oncology
8. Family Medicine

### UWorld Systems
Cardiovascular, Pulmonary, GI, Renal, Neurology, MSK, Endocrine, Heme/Onc, ID, Psychiatry, Reproductive, Dermatology, Biostats, Ethics

### Dashboard Widgets (in order)
1. countdowns - Exam countdown timers
2. uworld-progress - UWorld stats
3. goals - Daily goals/tasks
4. today-schedule - Today's calendar events
5. week-calendar - Week overview
6. quick-actions - Quick action buttons
7. weak-areas - UWorld weak systems
8. pearls - Clinical pearls
9. streak - Study streak grid
10. anki - Anki sync stats

---

*Last updated: December 1, 2024*
