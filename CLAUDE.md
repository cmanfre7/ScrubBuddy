# CLAUDE.md - AI Agent Instructions for ScrubBuddy

## READ THIS FIRST
This file contains everything an AI agent needs to understand and work on ScrubBuddy. Read this completely before making any changes.

---

## What is ScrubBuddy?

ScrubBuddy is a **personal productivity and tracking app for 3rd and 4th year medical students**. It's NOT a public SaaS product - it's a personal tool for the developer and potentially some friends.

### Core Purpose
Help medical students track and manage:
- **3rd Year (Clerkships)**: Patient logs, procedures, UWorld questions, shelf exams, rotation schedules
- **4th Year (Residency Applications)**: Sub-I rotations, residency programs, ERAS applications, interviews, rank lists

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (via Railway) |
| ORM | Prisma 5.x |
| Auth | NextAuth.js v4 (credentials provider) |
| State | Zustand |
| Data Fetching | TanStack React Query |
| Animations | Framer Motion |
| Icons | Lucide React |
| Charts | Recharts |
| Deployment | Railway |

---

## Project Structure

```
scrubbuddy/
├── prisma/
│   └── schema.prisma          # DATABASE SCHEMA - READ THIS FIRST
├── src/
│   ├── app/
│   │   ├── page.tsx           # Sign-in page (root)
│   │   ├── layout.tsx         # Root layout with providers
│   │   ├── globals.css        # Tailwind imports
│   │   ├── (auth)/            # Auth pages (login, register)
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   │   └── dashboard/
│   │   │       ├── page.tsx           # Main dashboard
│   │   │       ├── patients/          # Patient log module
│   │   │       ├── procedures/        # Procedure reference
│   │   │       ├── uworld/            # UWorld tracker
│   │   │       ├── tasks/             # Task management
│   │   │       └── settings/          # User settings
│   │   └── api/               # API routes
│   │       ├── auth/[...nextauth]/    # NextAuth endpoint
│   │       ├── patients/              # Patient CRUD
│   │       ├── tasks/                 # Task CRUD
│   │       ├── uworld/                # UWorld logging
│   │       └── rotations/             # Rotation management
│   ├── components/
│   │   ├── ui/                # Reusable UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Textarea.tsx
│   │   │   └── StatCard.tsx
│   │   ├── Sidebar.tsx        # Dashboard navigation
│   │   └── Providers.tsx      # React Query + Session providers
│   └── lib/
│       ├── prisma.ts          # Prisma client singleton
│       ├── auth.ts            # NextAuth configuration
│       └── utils.ts           # cn() utility for classnames
├── package.json
├── nixpacks.toml              # Railway build config
├── railway.json               # Railway deployment config
├── Procfile                   # Railway start command
└── .node-version              # Node 22
```

---

## Database Schema (prisma/schema.prisma)

### Current Models

1. **User** - Auth and profile
2. **Rotation** - Clinical rotations (e.g., "Internal Medicine - Hospital A")
3. **Patient** - Patient encounter logs for ERAS
4. **Procedure** - Master list of medical procedures
5. **UserProcedure** - User's logged procedures with counts
6. **PatientProcedure** - Links patients to procedures performed
7. **UWorldLog** - Daily UWorld session logs
8. **UWorldIncorrect** - Tracked incorrect questions for review
9. **ShelfScore** - Shelf exam scores
10. **PracticeExam** - NBME practice exam scores
11. **Task** - To-do items and study tasks
12. **StudyBlock** - Scheduled study sessions
13. **Resource** - Saved study resources/links
14. **AIConversation** - AI chat history (future feature)
15. **CalendarEvent** - Calendar events with Google sync support
16. **GoogleCalendarSync** - Google Calendar OAuth and sync settings

### Planned Models (4th Year Features - NOT YET BUILT)
- **ResidencyProgram** - Programs being considered
- **SubInternship** - Sub-I rotation tracking
- **Application** - ERAS application status
- **Interview** - Interview scheduling and notes
- **RankList** - Final rank list for Match

---

## Authentication

- Uses NextAuth.js v4 with **credentials provider only**
- Passwords hashed with bcryptjs
- Session stored in JWT
- Auth config in `src/lib/auth.ts`
- Protected routes check session in API routes

---

## UI Design System

- **Dark mode only** - slate-900 to slate-800 gradient backgrounds
- **Color scheme**: Blue/purple gradients for accents, slate for neutrals
- **Glass morphism**: `bg-slate-800/50 backdrop-blur-sm border-slate-700/50`
- **All components in `src/components/ui/`** - use these, don't create new ones
- **No emojis in code** unless user explicitly requests

---

## Current Features (Built)

### Dashboard (`/dashboard`)
- Stats overview (patients, procedures, UWorld %)
- Recent activity widgets
- Quick actions

### Patient Log (`/dashboard/patients`)
- Log patient encounters
- Track chief complaints, diagnoses, procedures
- Filter by rotation
- For ERAS application prep

### UWorld Tracker (`/dashboard/uworld`)
- Log daily question blocks
- Track correct/incorrect by system
- Performance analytics
- Incorrect question review list

### Procedure Reference (`/dashboard/procedures`)
- Searchable procedure library
- Quick reference guides
- Track personal procedure counts

### Settings (`/dashboard/settings`)
- Rotation management
- Profile settings

### Calendar (`/dashboard/calendar`)
- Month, Week, and Day views
- Create/edit/delete calendar events
- Event types: Clinical, Exam, Study, Lecture, Presentation, Meeting, Appointment, Personal
- All-day and timed events
- Event reminders (15min, 30min, 1hr, 1day, 1week)
- Today's Schedule widget on dashboard
- Database schema ready for Google Calendar sync

---

## Planned Features (NOT YET BUILT)

### 4th Year Module
1. **Residency Program Tracker**
   - Save programs of interest
   - Track requirements, deadlines
   - Notes on each program

2. **Sub-I Logger**
   - Track sub-internship rotations
   - Evaluations and feedback
   - Letters of rec tracking

3. **Application Tracker**
   - ERAS submission status
   - Document checklist (PS, CV, LORs, transcripts)
   - Program-specific requirements

4. **Interview Manager**
   - Interview scheduling
   - Travel/logistics
   - Pre-interview prep notes
   - Post-interview reflections
   - Rank list builder

### Calendar Integration (Pending)

**Difficulty Assessment:**
- Google Calendar: **Medium** (~2-3 days)
- Apple Calendar: **Hard** (CalDAV only, no public API)
- Recommendation: Start with Google one-way import first

**Google Calendar Sync**
- OAuth 2.0 setup in Google Cloud Console
- Use `googleapis` npm package
- Sync direction options: both, to Google, or from Google
- Select which Google calendars to sync
- Conflict resolution preferences
- Store refresh tokens securely in database

**Apple Calendar Sync** (Future/Lower Priority)
- Apple has no public calendar API
- Only option is CalDAV protocol (complex, server-to-server)
- Would need user to provide iCloud credentials or app-specific password
- Better to recommend users export from Apple Calendar and use Google sync

### AI Features (Future)
- Daily study recommendations
- Weak area identification
- Shelf score predictions

---

## API Routes Pattern

All API routes follow this pattern:

```typescript
// GET - List/Read
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... fetch data for session.user.id
}

// POST - Create
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const data = await request.json()
  // ... create record with userId: session.user.id
}
```

Dynamic routes use `[id]` folders with `route.ts` inside.

---

## Deployment

### Railway Setup
- **Database**: PostgreSQL addon
- **Build**: Nixpacks with Node 22
- **Environment Variables Required**:
  - `DATABASE_URL` - PostgreSQL connection string
  - `NEXTAUTH_SECRET` - Random secret for JWT
  - `NEXTAUTH_URL` - Production URL (e.g., https://scrubbuddy-production.up.railway.app)

### Deploy Process
1. Push to GitHub → Railway auto-deploys
2. Prisma migrations run on start (`npx prisma migrate deploy`)

---

## Development Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
npx prisma studio           # View database
npx prisma migrate dev      # Create migration
npx prisma generate         # Generate client
```

---

## Important Files to Read First

1. `prisma/schema.prisma` - Understand the data model
2. `src/lib/auth.ts` - Auth configuration
3. `src/app/(dashboard)/layout.tsx` - Dashboard layout structure
4. `src/components/Sidebar.tsx` - Navigation structure
5. `src/components/ui/` - Available UI components

---

## Common Tasks for AI Agents

### Adding a New Feature
1. Add models to `prisma/schema.prisma` if needed
2. Run `npx prisma migrate dev --name feature_name`
3. Create API route in `src/app/api/`
4. Create page in `src/app/(dashboard)/dashboard/`
5. Add navigation link in `src/components/Sidebar.tsx`

### Adding a New UI Component
1. Create in `src/components/ui/`
2. Use `cn()` from `@/lib/utils` for conditional classes
3. Follow existing patterns (dark theme, glass morphism)

### Fixing Type Errors
- Check `prisma/schema.prisma` for correct field types
- Run `npx prisma generate` after schema changes
- Component props are defined with interfaces

---

## Do NOT Do

- Don't add a landing/marketing page (removed intentionally)
- Don't add light mode (dark only)
- Don't use Prisma 7+ (incompatible with Railway's Node version)
- Don't create `prisma.config.ts` (Prisma 5 doesn't use it)
- Don't add emojis unless explicitly asked
- Don't over-engineer - this is a personal tool

---

## Questions? Check These First

- **Auth issues?** → Check `src/lib/auth.ts` and `NEXTAUTH_SECRET` env var
- **Database issues?** → Check `DATABASE_URL` and run `npx prisma generate`
- **Build failing?** → Check Railway logs, likely Node/Prisma version issue
- **Styling issues?** → Check Tailwind classes, use existing components

---

*Last updated: December 2024*
