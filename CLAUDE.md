# CLAUDE.md - ScrubBuddy Master Documentation

---

# ⚠️ MANDATORY AI AGENT PROTOCOL - READ BEFORE ANY ACTION ⚠️

## THIS IS NOT OPTIONAL. THIS IS REQUIRED.

**EVERY SINGLE TIME** a new session begins, the AI agent **MUST**:

1. **READ THIS ENTIRE FILE FROM START TO FINISH** - No exceptions. No skipping. No summarizing.
2. **CHECK THE VERSION CHANGELOG** at the bottom for the most recent changes
3. **REVIEW RECENT GIT COMMITS**: `git log --oneline -15`
4. **UNDERSTAND THE CURRENT STATE** before writing a single line of code

**AT THE END OF EVERY SESSION** when the user says "end of session", "we're done", "wrap up", or any variant:

1. **UPDATE THE VERSION CHANGELOG** with a new version entry following semantic versioning
2. **DOCUMENT EVERY SINGLE CHANGE** made during the session with extreme detail
3. **UPDATE ANY AFFECTED SECTIONS** (features, schema, known issues, etc.)
4. **COMMIT THE UPDATED CLAUDE.md**: `git add CLAUDE.md && git commit -m "docs: Update CLAUDE.md vX.X.X - [brief description]" && git push origin main`

**FAILURE TO FOLLOW THIS PROTOCOL IS UNACCEPTABLE.**

---

# Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Environment Configuration](#3-environment-configuration)
4. [Project Architecture](#4-project-architecture)
5. [Database Schema](#5-database-schema)
6. [Feature Documentation](#6-feature-documentation)
7. [API Reference](#7-api-reference)
8. [Component Library](#8-component-library)
9. [UI Design System](#9-ui-design-system)
10. [Known Issues & Solutions](#10-known-issues--solutions)
11. [Development Commands](#11-development-commands)
12. [Deployment Protocol](#12-deployment-protocol)
13. [Forbidden Actions](#13-forbidden-actions)
14. [Planned Features](#14-planned-features)
15. [Version Changelog](#15-version-changelog)

---

# 1. Project Overview

## What is ScrubBuddy?

**ScrubBuddy** is a **personal productivity application** designed specifically for **3rd and 4th year medical students** during clinical clerkships. This is **NOT** a public SaaS product - it is a personal tool built by and for the developer.

### Live Production URL
```
https://scrubbuddy.app
```

### Core Purpose

| Year | Features |
|------|----------|
| **3rd Year** | Patient encounter logs, procedure tracking, UWorld question bank analytics, shelf exam preparation, rotation schedules, Anki flashcard integration, calendar management, clinical algorithms reference |
| **4th Year** | Residency program tracking, ERAS application management, interview scheduling, rank list creation *(planned for future development)* |

### Target User Profile
- Medical student in clinical rotations (MS3/MS4)
- Preparing for USMLE Step 2 CK and/or COMLEX Level 2
- Using UWorld question bank for board preparation
- Using Anki (specifically AnKing deck) for spaced repetition
- Needs to track patient encounters for ERAS applications
- Studying for shelf exams by rotation

---

# 2. Technology Stack

## Complete Technology Inventory

| Layer | Technology | Version | Purpose | Notes |
|-------|------------|---------|---------|-------|
| **Framework** | Next.js | 14.x | Full-stack React framework | App Router (not Pages Router) |
| **Language** | TypeScript | 5.x | Type-safe JavaScript | Strict mode enabled |
| **Styling** | Tailwind CSS | v4 | Utility-first CSS | Dark mode only |
| **Database** | PostgreSQL | 15+ | Relational database | Hosted on Railway |
| **ORM** | Prisma | 5.x | Database toolkit | **DO NOT upgrade to 7+** |
| **Authentication** | NextAuth.js | v4 | Auth solution | Credentials provider only |
| **State Management** | Zustand | latest | Client state | Minimal usage |
| **Data Fetching** | TanStack Query | v5 | Server state | React Query |
| **Animations** | Framer Motion | latest | Motion library | Subtle animations only |
| **Icons** | Lucide React | latest | Icon library | SVG icons |
| **Charts** | Recharts | latest | Data visualization | Dashboard analytics |
| **AI Integration** | Anthropic SDK | latest | Claude API | Medical assistant chat |
| **Deployment** | Railway | N/A | PaaS hosting | Auto-deploy from GitHub |
| **Version Control** | Git/GitHub | N/A | Source control | Main branch = production |

## Package.json Key Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "typescript": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "next-auth": "^4.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.0.0",
    "framer-motion": "^10.0.0",
    "lucide-react": "^0.300.0",
    "recharts": "^2.0.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "tailwindcss": "^4.0.0"
  }
}
```

---

# 3. Environment Configuration

## Required Environment Variables

### Database (Railway Provides)
```bash
DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require"
```

### NextAuth Configuration
```bash
NEXTAUTH_SECRET="[32+ character random string]"
NEXTAUTH_URL="https://scrubbuddy.app"
```

### Anthropic AI (for Medical Assistant)
```bash
ANTHROPIC_API_KEY="sk-ant-..."
```

### Google Calendar OAuth (Optional)
```bash
GOOGLE_CLIENT_ID="[client-id].apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
```

## Railway Environment Setup
All environment variables are configured in Railway dashboard:
1. Go to Railway project
2. Select the service
3. Variables tab
4. Add/edit variables

---

# 4. Project Architecture

## Complete Directory Structure

```
scrubbuddy/
├── .github/                          # GitHub configuration
│   └── workflows/                    # CI/CD workflows (if any)
├── prisma/
│   ├── schema.prisma                 # DATABASE SCHEMA - 35+ models
│   └── migrations/                   # Database migrations
│       ├── 20241208000000_add_uworld_question/
│       ├── 20241209_add_calendar_feed/
│       ├── 20241210_add_clinical_algorithms/
│       └── [other migrations]/
├── public/
│   ├── logos/                        # Brand assets
│   │   ├── primary/
│   │   │   └── scrubbuddy-logo-dark.svg
│   │   └── mascot/
│   │       └── scrubbuddy-mascot-dark.svg
│   └── favicon.ico
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Root page (redirects to login)
│   │   ├── layout.tsx                # Root layout with providers
│   │   ├── globals.css               # Tailwind imports + custom styles
│   │   │
│   │   ├── (auth)/                   # Auth route group (no layout)
│   │   │   ├── login/
│   │   │   │   └── page.tsx          # Login page
│   │   │   └── register/
│   │   │       └── page.tsx          # Registration page
│   │   │
│   │   ├── (dashboard)/              # Dashboard route group (with layout)
│   │   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   │   └── dashboard/
│   │   │       ├── page.tsx          # Main dashboard with widgets
│   │   │       ├── analytics/
│   │   │       │   └── page.tsx      # Performance analytics
│   │   │       ├── anking/
│   │   │       │   └── page.tsx      # Anki tracker page
│   │   │       ├── calendar/
│   │   │       │   └── page.tsx      # Full calendar view
│   │   │       ├── clinical-notes/
│   │   │       │   └── page.tsx      # Clinical notes by rotation
│   │   │       ├── patients/
│   │   │       │   └── page.tsx      # Patient log (ERAS)
│   │   │       ├── procedures/
│   │   │       │   └── page.tsx      # Procedure reference
│   │   │       ├── resources/
│   │   │       │   └── page.tsx      # Study resources
│   │   │       ├── settings/
│   │   │       │   └── page.tsx      # User settings
│   │   │       └── uworld/
│   │   │           └── page.tsx      # UWorld tracker
│   │   │
│   │   ├── api/                      # API Routes (50+ endpoints)
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts      # NextAuth handler
│   │   │   ├── ai/
│   │   │   │   └── chat/
│   │   │   │       └── route.ts      # AI medical assistant
│   │   │   ├── anking/
│   │   │   │   ├── addon/
│   │   │   │   │   └── route.ts      # Generate .ankiaddon file
│   │   │   │   ├── goal/
│   │   │   │   │   └── route.ts      # Anki goals CRUD
│   │   │   │   ├── progress/
│   │   │   │   │   └── route.ts      # Manual progress logs
│   │   │   │   ├── sync/
│   │   │   │   │   └── route.ts      # Sync stats from add-on
│   │   │   │   └── token/
│   │   │   │       └── route.ts      # Sync token management
│   │   │   ├── calendar/
│   │   │   │   ├── route.ts          # Calendar events CRUD
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts      # Single event operations
│   │   │   │   └── feed/
│   │   │   │       ├── route.ts      # Generate ICS feed token
│   │   │   │       └── [token]/
│   │   │   │           └── route.ts  # ICS feed endpoint
│   │   │   ├── clinical-algorithms/
│   │   │   │   ├── route.ts          # Algorithms list/create
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # Single algorithm operations
│   │   │   ├── clinical-guidelines/
│   │   │   │   └── route.ts          # Guidelines CRUD
│   │   │   ├── clinical-pearls/
│   │   │   │   ├── route.ts          # Pearls list/create
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # Single pearl operations
│   │   │   ├── google-calendar/
│   │   │   │   ├── callback/
│   │   │   │   │   └── route.ts      # OAuth callback
│   │   │   │   ├── calendars/
│   │   │   │   │   └── route.ts      # List Google calendars
│   │   │   │   ├── connect/
│   │   │   │   │   └── route.ts      # Initiate OAuth
│   │   │   │   ├── disconnect/
│   │   │   │   │   └── route.ts      # Remove connection
│   │   │   │   └── sync/
│   │   │   │       └── route.ts      # Sync events
│   │   │   ├── health/
│   │   │   │   └── route.ts          # Health check endpoint
│   │   │   ├── patients/
│   │   │   │   ├── route.ts          # Patients list/create
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # Single patient operations
│   │   │   ├── pharm-notes/
│   │   │   │   ├── route.ts          # Pharm notes CRUD
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # Single pharm note
│   │   │   ├── practice-exams/
│   │   │   │   ├── route.ts          # Practice exams list/create
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # Single exam operations
│   │   │   ├── quick-links/
│   │   │   │   ├── route.ts          # Quick links CRUD
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # Single link operations
│   │   │   ├── resources/
│   │   │   │   ├── route.ts          # Resources CRUD
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts      # Single resource
│   │   │   │   └── metadata/
│   │   │   │       └── route.ts      # URL metadata fetcher
│   │   │   ├── rotations/
│   │   │   │   ├── route.ts          # Rotations list/create
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # Single rotation operations
│   │   │   ├── shelf-scores/
│   │   │   │   ├── route.ts          # Shelf scores CRUD
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # Single score operations
│   │   │   ├── study-notes/
│   │   │   │   ├── route.ts          # Study notes CRUD
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # Single note operations
│   │   │   ├── tasks/
│   │   │   │   ├── route.ts          # Tasks CRUD
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # Single task operations
│   │   │   ├── user/
│   │   │   │   ├── route.ts          # User profile
│   │   │   │   └── exam-dates/
│   │   │   │       └── route.ts      # Exam dates settings
│   │   │   └── uworld/
│   │   │       ├── route.ts          # UWorld logs CRUD
│   │   │       ├── [id]/
│   │   │       │   └── route.ts      # Single log with breakdown
│   │   │       ├── cleanup/
│   │   │       │   └── route.ts      # Data cleanup utility
│   │   │       ├── clear/
│   │   │       │   └── route.ts      # Clear all data
│   │   │       ├── debug/
│   │   │       │   └── route.ts      # Debug endpoint
│   │   │       ├── dedupe/
│   │   │       │   └── route.ts      # Remove duplicates
│   │   │       ├── import/
│   │   │       │   └── route.ts      # PDF import
│   │   │       ├── import-json/
│   │   │       │   └── route.ts      # JSON import
│   │   │       ├── import-text/
│   │   │       │   └── route.ts      # Text paste import
│   │   │       ├── settings/
│   │   │       │   └── route.ts      # Custom totals per subject
│   │   │       └── weak-areas/
│   │   │           └── route.ts      # Weak areas analysis
│   │   │
│   │   ├── privacy/
│   │   │   └── page.tsx              # Privacy policy
│   │   └── terms/
│   │       └── page.tsx              # Terms of service
│   │
│   ├── components/
│   │   ├── ui/                       # Reusable UI components
│   │   │   ├── badge.tsx             # Status badges
│   │   │   ├── button.tsx            # Button variants
│   │   │   ├── card.tsx              # Card container
│   │   │   ├── input.tsx             # Text input
│   │   │   ├── modal.tsx             # Modal dialog
│   │   │   ├── select.tsx            # Dropdown select
│   │   │   ├── stat-card.tsx         # Statistics card
│   │   │   └── textarea.tsx          # Multi-line input
│   │   │
│   │   ├── clinical-notes/           # Clinical Notes components
│   │   │   ├── AlgorithmsTab.tsx     # Algorithms tab (image upload)
│   │   │   ├── PatientsTab.tsx       # Patients tab
│   │   │   ├── PearlsTab.tsx         # Clinical pearls tab
│   │   │   ├── PharmTab.tsx          # Pharmacology tab
│   │   │   ├── QuickCapture.tsx      # Quick pearl capture modal
│   │   │   └── RotationWorkspace.tsx # Rotation workspace with tabs
│   │   │
│   │   ├── dashboard/                # Dashboard layout
│   │   │   ├── DashboardClient.tsx   # Client-side dashboard wrapper
│   │   │   ├── DraggableDashboard.tsx # Draggable widget grid
│   │   │   └── sidebar.tsx           # Navigation sidebar
│   │   │
│   │   ├── dashboard-widgets/        # Dashboard widgets
│   │   │   ├── AnkiWidget.tsx        # Anki stats display
│   │   │   ├── CountdownWidget.tsx   # Exam countdowns
│   │   │   ├── GoalsWidget.tsx       # Daily goals/tasks
│   │   │   ├── PearlsWidget.tsx      # Random clinical pearl
│   │   │   ├── QuickActionsWidget.tsx # Quick action buttons
│   │   │   ├── StreakWidget.tsx      # Study streak heatmap
│   │   │   ├── TodayScheduleWidget.tsx # Today's events
│   │   │   ├── UWorldProgressWidget.tsx # UWorld progress
│   │   │   └── WeakAreasWidget.tsx   # Weak areas display
│   │   │
│   │   ├── providers/                # Context providers
│   │   │   └── sidebar-provider.tsx  # Sidebar state
│   │   │
│   │   ├── uworld/                   # UWorld components
│   │   │   └── LogSessionModal.tsx   # Log session modal
│   │   │
│   │   ├── FloatingAIWidget.tsx      # AI medical assistant chat
│   │   └── Providers.tsx             # App-wide providers
│   │
│   ├── lib/                          # Utility libraries
│   │   ├── auth.ts                   # NextAuth configuration
│   │   ├── google-calendar.ts        # Google Calendar helpers
│   │   ├── ics.ts                    # ICS feed generation
│   │   ├── prisma.ts                 # Prisma client singleton
│   │   ├── session.ts                # Session helpers
│   │   └── utils.ts                  # Utility functions (cn, formatDate)
│   │
│   └── types/
│       └── index.ts                  # TypeScript type definitions
│
├── .env.local                        # Local environment (gitignored)
├── .gitignore                        # Git ignore rules
├── .node-version                     # Node version (22)
├── CLAUDE.md                         # THIS FILE - Master documentation
├── README.md                         # Points to CLAUDE.md
├── next.config.js                    # Next.js configuration
├── nixpacks.toml                     # Railway build config
├── package.json                      # Dependencies
├── package-lock.json                 # Lock file
├── postcss.config.js                 # PostCSS config
├── tailwind.config.ts                # Tailwind configuration
└── tsconfig.json                     # TypeScript configuration
```

---

# 5. Database Schema

## Complete Prisma Schema Reference

### User & Authentication

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String    // bcrypt hashed
  name          String?

  // Exam Settings
  step2Date     DateTime? // USMLE Step 2 CK date
  comlexDate    DateTime? // COMLEX Level 2 date
  dailyGoal     Int       @default(40)  // Daily UWorld questions
  weeklyGoal    Int       @default(200) // Weekly UWorld questions

  // Google Calendar OAuth
  googleEmail        String?
  googleAccessToken  String? @db.Text
  googleRefreshToken String? @db.Text
  googleTokenExpiry  DateTime?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations (35+ models reference User)
  rotations         Rotation[]
  patients          Patient[]
  procedures        UserProcedure[]
  uworldLogs        UWorldLog[]
  uworldQuestions   UWorldQuestion[]
  uworldIncorrect   UWorldIncorrect[]
  // ... and many more
}
```

### Rotations

```prisma
model Rotation {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  name        String    // "Internal Medicine", "Surgery", etc.
  startDate   DateTime
  endDate     DateTime
  shelfDate   DateTime? // Shelf exam date
  isCurrent   Boolean   @default(false)

  // Relations
  patients           Patient[]
  shelfScores        ShelfScore[]
  studyNotes         StudyNote[]
  clinicalGuidelines ClinicalGuideline[]
  clinicalPearls     ClinicalPearl[]
  clinicalReferences ClinicalReference[]
  pharmNotes         PharmNote[]
  clinicalAlgorithms ClinicalAlgorithm[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId])
}
```

### UWorld Tracking System

```prisma
// Daily session logs
model UWorldLog {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  date            DateTime  @default(now())
  blockName       String?   // "UWSA1", "Random", etc.
  questionsTotal  Int
  questionsCorrect Int
  questionsIncorrect Int

  // Systems covered (JSON array)
  systems         String[]  @default([])

  // Subject breakdown
  subjects        String[]  @default([])

  // Relations
  questions       UWorldQuestion[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([userId])
  @@index([date])
}

// Individual questions (ALL - correct AND incorrect)
model UWorldQuestion {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  logId         String?
  log           UWorldLog? @relation(fields: [logId], references: [id], onDelete: Cascade)

  questionId    String?   // UWorld question ID (e.g., "118154")
  subject       String    // "Surgery", "Medicine", etc.
  system        String    // "Cardiovascular", "Pulmonary", etc.
  category      String    // "Management", "Diagnosis", etc.
  topic         String    // Specific topic (e.g., "Aortic dissection")
  percentOthers Int       @default(0)  // % of others who got it right
  timeSpent     Int       @default(0)  // Seconds spent
  isCorrect     Boolean   // true = correct, false = incorrect
  testName      String?   // Block/test name

  createdAt     DateTime  @default(now())

  @@unique([userId, questionId])  // Prevent duplicate questions
  @@index([userId])
  @@index([logId])
  @@index([subject])
  @@index([system])
  @@index([isCorrect])
}

// Incorrect questions for spaced repetition (legacy, still populated)
model UWorldIncorrect {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  questionId    String    // UWorld question ID
  subject       String
  system        String
  topic         String
  status        String    @default("new") // new, reviewing, mastered
  reviewCount   Int       @default(0)
  lastReviewed  DateTime?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([userId, questionId])
  @@index([userId])
  @@index([status])
}

// Custom question totals per subject
model UWorldSettings {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  subject       String    // "Surgery", "Medicine", etc.
  totalQuestions Int      // User's custom total for this subject

  @@unique([userId, subject])
  @@index([userId])
}
```

### Clinical Algorithms (NEW - v1.3.0)

```prisma
model ClinicalAlgorithm {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  rotationId  String?
  rotation    Rotation? @relation(fields: [rotationId], references: [id])

  title       String    // "Blunt Chest Trauma", "Breast Mass Workup"
  description String?   @db.Text // Optional notes
  subject     String    // Shelf subject: "Surgery", "OBGYN", etc.

  // Image storage (base64 encoded)
  imageData   String    @db.Text // Base64 image data
  imageType   String    // MIME type: "image/png", "image/jpeg"

  // Metadata
  source      String?   // "UWorld", "UpToDate", "First Aid"
  tags        String[]  @default([])
  isHighYield Boolean   @default(false) // Star for quick review

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId])
  @@index([rotationId])
  @@index([subject])
  @@index([isHighYield])
}
```

### Anki Integration

```prisma
model AnkiSyncToken {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  token     String   @unique // Secure random token

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model AnkiSyncStats {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Due counts
  newDue        Int      @default(0)
  learningDue   Int      @default(0)
  reviewDue     Int      @default(0)

  // Studied today
  newStudied    Int      @default(0)
  reviewsStudied Int     @default(0)
  timeStudied   Int      @default(0) // Seconds

  // Answer breakdown
  againCount    Int      @default(0)
  hardCount     Int      @default(0)
  goodCount     Int      @default(0)
  easyCount     Int      @default(0)

  // Collection stats
  totalCards    Int      @default(0)
  matureCards   Int      @default(0)
  youngCards    Int      @default(0)
  suspendedCards Int     @default(0)

  syncedAt      DateTime @default(now())

  @@index([userId])
  @@index([syncedAt])
}
```

### Calendar & Events

```prisma
model CalendarEvent {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  title         String
  description   String?   @db.Text
  startTime     DateTime
  endTime       DateTime
  allDay        Boolean   @default(false)

  // Event type
  eventType     String    @default("personal")
  // Options: clinical, exam, study, lecture, presentation, personal, meeting, appointment

  // Google Calendar sync
  googleEventId String?   // ID from Google Calendar

  // Recurrence (JSON)
  recurrence    String?   @db.Text

  // Reminder
  reminder      Int?      // Minutes before

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([userId])
  @@index([startTime])
  @@index([googleEventId])
}

model CalendarFeed {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  token     String   @unique  // Secure random token for feed URL
  isActive  Boolean  @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([token])
}
```

### Additional Models (Abbreviated)

```prisma
// Patient encounters for ERAS
model Patient { ... }
model PatientProcedure { ... }

// Procedure reference library
model Procedure { ... }
model UserProcedure { ... }

// Exam scores
model ShelfScore { ... }
model PracticeExam { ... }
model BoardExam { ... }

// Notes & References
model StudyNote { ... }
model ClinicalPearl { ... }
model ClinicalGuideline { ... }
model ClinicalReference { ... }
model PharmNote { ... }

// Tasks
model Task { ... }
model StudyBlock { ... }

// Resources
model Resource { ... }
model QuickLink { ... }
```

---

# 6. Feature Documentation

## 6.1 Dashboard (`/dashboard`)

### Overview
The main dashboard is a **draggable widget system** built with `DraggableDashboard.tsx`. Users can rearrange widgets and toggle visibility. All widgets are server-rendered with client-side interactivity.

### Widget Configuration

| Widget ID | Component | Description | Data Source |
|-----------|-----------|-------------|-------------|
| `countdowns` | `CountdownWidget` | Exam countdown timers | User exam dates from settings |
| `uworld-progress` | `UWorldProgressWidget` | UWorld completion % | UWorldLog aggregation |
| `goals` | `GoalsWidget` | Daily tasks with checkboxes | Task model |
| `today-schedule` | `TodayScheduleWidget` | Today's calendar events | CalendarEvent model |
| `quick-actions` | `QuickActionsWidget` | Quick navigation buttons | Static configuration |
| `weak-areas` | `WeakAreasWidget` | UWorld weak systems | UWorldQuestion aggregation |
| `pearls` | `PearlsWidget` | Random clinical pearl | ClinicalPearl model |
| `streak` | `StreakWidget` | GitHub-style activity heatmap | UWorldLog dates |
| `anki` | `AnkiWidget` | Anki sync stats | AnkiSyncStats model |

### Files
- `src/app/(dashboard)/dashboard/page.tsx` - Server component with data fetching
- `src/components/dashboard/DashboardClient.tsx` - Client wrapper
- `src/components/dashboard/DraggableDashboard.tsx` - Drag-drop logic
- `src/components/dashboard-widgets/*.tsx` - Individual widgets

---

## 6.2 Clinical Notes (`/dashboard/clinical-notes`)

### Overview
A **rotation-based workspace** for organizing clinical learning materials. Users select a rotation, then access tabs for different content types.

### Workflow
1. User navigates to Clinical Notes
2. Sees grid of rotation cards with patient/pearl counts
3. Clicks a rotation to enter workspace
4. Workspace has 4 tabs: Patients, Pearls, Algorithms, Pharm

### Tabs

| Tab | Component | Purpose |
|-----|-----------|---------|
| **Patients** | `PatientsTab` | Log patient encounters for ERAS |
| **Pearls** | `PearlsTab` | Quick clinical pearls and learning points |
| **Algorithms** | `AlgorithmsTab` | Diagnostic flowcharts (image-based) |
| **Pharm** | `PharmTab` | Pharmacology notes |

### Algorithms Tab (NEW - v1.3.0)
- **Purpose**: Save and reference diagnostic flowcharts from UWorld/UpToDate
- **Image Support**: Paste (Ctrl+V) or upload images up to 10MB
- **Organization**: Filtered by rotation, tagged by shelf subject
- **High Yield**: Star important algorithms for quick review
- **Storage**: Base64 encoded in PostgreSQL

### Files
- `src/app/(dashboard)/dashboard/clinical-notes/page.tsx` - Rotation selector
- `src/components/clinical-notes/RotationWorkspace.tsx` - Tab container
- `src/components/clinical-notes/AlgorithmsTab.tsx` - Algorithms with image upload
- `src/components/clinical-notes/PatientsTab.tsx` - Patient log
- `src/components/clinical-notes/PearlsTab.tsx` - Clinical pearls
- `src/components/clinical-notes/PharmTab.tsx` - Pharm notes
- `src/components/clinical-notes/QuickCapture.tsx` - Quick pearl modal

---

## 6.3 UWorld Tracker (`/dashboard/uworld`)

### Overview
Comprehensive UWorld question bank tracking with detailed analytics by subject, system, category, and topic.

### Primary Workflow: Text Paste Import
1. Complete a UWorld block
2. Go to "Review Test" > "Incorrect" tab in UWorld
3. Select all rows (Ctrl+A) and copy (Ctrl+C)
4. In ScrubBuddy, click "Log Session" > "Paste Text" tab (default)
5. Paste the copied text
6. Toggle "Pasting incorrect questions only" if pasting correct questions
7. Click "Import"

### Text Paste Format (Tab-Separated)
```
1 - 118154  Surgery  Cardiovascular  Management  Aortic dissection  65%  45 sec
2 - 118155  Medicine  Pulmonary  Diagnosis  COPD exacerbation  72%  38 sec
```

**Parsed Fields:**
- Question number and ID (e.g., "1 - 118154")
- Subject (e.g., "Surgery")
- System (e.g., "Cardiovascular")
- Category (e.g., "Management")
- Topic (e.g., "Aortic dissection")
- Percent of others correct (e.g., "65%")
- Time spent (e.g., "45 sec")

### Session Details View
- Click any session in the list to expand
- Shows breakdown by Subject, System, Category, Topic
- Each row: name, total questions, correct count, incorrect count, percentage

### Systems Tracked
Cardiovascular, Pulmonary, GI, Renal, Neurology, MSK, Endocrine, Heme/Onc, ID, Psychiatry, Reproductive, Dermatology, Biostats, Ethics

### Subjects (Shelf Categories)
Surgery, Internal Medicine, Pediatrics, OBGYN, Psychiatry, Family Medicine, Neurology

### Files
- `src/app/(dashboard)/dashboard/uworld/page.tsx` - Main page with sessions list
- `src/components/uworld/LogSessionModal.tsx` - Log session modal
- `src/app/api/uworld/route.ts` - List/create logs
- `src/app/api/uworld/[id]/route.ts` - Get log with breakdown
- `src/app/api/uworld/import-text/route.ts` - Text paste import
- `src/app/api/uworld/weak-areas/route.ts` - Weak areas calculation

---

## 6.4 Anki Integration (`/dashboard/anking`)

### Overview
Auto-sync Anki desktop statistics to ScrubBuddy via a custom add-on.

### Setup Process
1. Go to Settings > "Anki Sync" card
2. Click "Generate Sync Token"
3. Click "Download Add-on" (generates personalized .ankiaddon)
4. Double-click .ankiaddon file to install in Anki
5. Restart Anki
6. Add-on auto-syncs every 30 minutes

### Current Add-on Version
**v1.7.0** (December 2025)

### Add-on Compatibility
Anki 25.02+ (Rust backend)

### Stats Synced
- Due cards (new, learning, review)
- Cards studied today (new, reviews)
- Time studied (seconds)
- Answer breakdown (again, hard, good, easy)
- Collection totals (mature, young, suspended)

### Files
- `src/app/api/anking/addon/route.ts` - Generate personalized .ankiaddon
- `src/app/api/anking/sync/route.ts` - Receive stats from add-on
- `src/app/api/anking/token/route.ts` - Token management
- `src/components/dashboard-widgets/AnkiWidget.tsx` - Dashboard widget

---

## 6.5 AI Medical Assistant (Floating Widget)

### Overview
An AI-powered medical assistant embedded in the application. Acts as both a data analytics expert (knows user's UWorld stats) and a master clinician (can analyze patient vignettes and images).

### Capabilities
- **Clinical Questions**: Differential diagnoses, workups, management
- **UWorld Analysis**: Weak areas, study recommendations
- **Image Interpretation**: X-rays, CTs, ECGs, skin lesions, labs
- **Patient Vignettes**: Step-by-step case analysis
- **Board Question Analysis**: Test-taking strategies

### Image Support
- Paste images with Ctrl+V
- Click + button to upload images
- Supports PNG, JPG, GIF up to 5MB
- Uses Anthropic's multimodal API

### Files
- `src/components/FloatingAIWidget.tsx` - Chat widget UI
- `src/app/api/ai/chat/route.ts` - AI endpoint with context injection

---

## 6.6 Calendar (`/dashboard/calendar`)

### Overview
Full-featured calendar for scheduling study sessions, exams, rotations, and personal events.

### Views
- Month view (default)
- Week view
- Day view

### Event Types
- clinical (blue)
- exam (red)
- study (green)
- lecture (purple)
- presentation (orange)
- personal (gray)
- meeting (teal)
- appointment (pink)

### ICS Feed (Apple Calendar Sync)
1. Go to Settings > Calendar card
2. Click "Generate Feed URL"
3. Copy the URL
4. In Apple Calendar: File > New Calendar Subscription > Paste URL
5. Events sync one-way (ScrubBuddy → Apple Calendar)

### Google Calendar Sync
- Two-way sync via OAuth
- Connect in Settings > Calendar
- Requires Google Cloud Console setup

### Files
- `src/app/(dashboard)/dashboard/calendar/page.tsx` - Calendar page
- `src/app/api/calendar/route.ts` - Events CRUD
- `src/app/api/calendar/feed/[token]/route.ts` - ICS feed endpoint
- `src/lib/ics.ts` - ICS format generation

---

# 7. API Reference

## Authentication

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

**Exception:** Anki sync routes support Bearer token auth:
```
Authorization: Bearer <sync-token>
```

## API Endpoints Summary

### UWorld APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/uworld` | List all logs |
| POST | `/api/uworld` | Create new log |
| GET | `/api/uworld/[id]` | Get single log |
| GET | `/api/uworld/[id]?includeQuestions=true` | Get log with question breakdown |
| PATCH | `/api/uworld/[id]` | Update log |
| DELETE | `/api/uworld/[id]` | Delete log |
| POST | `/api/uworld/import-text` | Import from text paste |
| GET | `/api/uworld/weak-areas` | Get weak areas analysis |
| GET | `/api/uworld/settings` | Get custom totals |
| POST | `/api/uworld/settings` | Set custom totals |

### Clinical Algorithms APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clinical-algorithms` | List algorithms (with filters) |
| POST | `/api/clinical-algorithms` | Create algorithm |
| GET | `/api/clinical-algorithms/[id]` | Get algorithm with image |
| PUT | `/api/clinical-algorithms/[id]` | Update algorithm |
| DELETE | `/api/clinical-algorithms/[id]` | Delete algorithm |

**Query Parameters for GET `/api/clinical-algorithms`:**
- `subject` - Filter by shelf subject
- `rotationId` - Filter by rotation
- `highYield=true` - Only high yield

### Anki APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/anking/token` | Check if token exists |
| POST | `/api/anking/token` | Generate new token |
| DELETE | `/api/anking/token` | Revoke token |
| POST | `/api/anking/addon` | Generate .ankiaddon file |
| GET | `/api/anking/sync` | Get latest sync stats |
| POST | `/api/anking/sync` | Receive stats from add-on |

### Calendar APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calendar` | List events (date range filter) |
| POST | `/api/calendar` | Create event |
| PUT | `/api/calendar/[id]` | Update event |
| DELETE | `/api/calendar/[id]` | Delete event |
| GET | `/api/calendar/feed` | Get/create feed token |
| GET | `/api/calendar/feed/[token]` | ICS feed (public) |

---

# 8. Component Library

## UI Components (`src/components/ui/`)

### Button
```tsx
import { Button } from '@/components/ui/button'

<Button variant="primary" size="md" disabled={false}>
  Click Me
</Button>

// Variants: primary, secondary, danger, ghost
// Sizes: sm, md, lg
```

### Input
```tsx
import { Input } from '@/components/ui/input'

<Input
  type="text"
  placeholder="Enter text..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="w-full"
/>
```

### Modal
```tsx
import { Modal } from '@/components/ui/modal'

<Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
  <div className="p-6">
    <h2>Modal Title</h2>
    {/* Content */}
  </div>
</Modal>
```

### Badge
```tsx
import { Badge } from '@/components/ui/badge'

<Badge variant="success">Completed</Badge>

// Variants: default, success, warning, danger, info
```

---

# 9. UI Design System

## Core Principles
- **Dark mode ONLY** - No light mode support
- **Minimalist** - Clean, focused interfaces
- **Responsive** - Mobile-first design
- **Accessible** - WCAG compliant

## Color Palette

| Color | Tailwind Class | Hex | Usage |
|-------|----------------|-----|-------|
| Background | `bg-slate-900` | `#0f172a` | Page background |
| Card Background | `bg-slate-800` | `#1e293b` | Cards, panels |
| Border | `border-slate-700` | `#334155` | Borders |
| Text Primary | `text-slate-100` | `#f1f5f9` | Headings |
| Text Secondary | `text-slate-400` | `#94a3b8` | Body text |
| Primary | `text-blue-400` | `#60a5fa` | Links, primary actions |
| Success | `text-green-400` | `#34d399` | Success states |
| Warning | `text-amber-400` | `#fbbf24` | Warnings |
| Danger | `text-red-400` | `#f87171` | Errors, destructive |
| Purple | `text-purple-400` | `#a78bfa` | Anki-related |

## Glass Morphism Pattern
```tsx
className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl"
```

## Common Patterns

### Card
```tsx
<div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
  {/* Content */}
</div>
```

### Gradient Header
```tsx
<div className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 p-4">
  {/* Header content */}
</div>
```

### Hover State
```tsx
className="hover:bg-slate-700/50 hover:border-blue-500/50 transition-all"
```

---

# 10. Known Issues & Solutions

## Anki Add-on v1.7.0 Issues

### Issue: Rust Backend List Returns
**Problem:** Anki 25.02+ uses Rust backend which returns lists instead of cursors from DB queries.

**Solution:**
```python
result = col.db.execute(sql)
if isinstance(result, list):
    row = result[0] if result else None
elif hasattr(result, 'fetchone'):
    row = result.fetchone()
```

### Issue: Parameterized SQL Fails
**Problem:** Parameterized SQL queries fail silently in Anki 25.02+

**Solution:** Use f-string formatting (safe for numeric timestamps):
```python
sql = f"SELECT ... FROM revlog WHERE id > {today_start}"
```

### Issue: Studied Counts Show Zero
**Problem:** `newStudied` and `reviewsStudied` showing 0 despite due counts working.

**Solution:** Dual-method timestamp calculation:
```python
# Method 1: Anki's day_cutoff
day_cutoff = col.sched.day_cutoff
today_start_method1 = int((day_cutoff - 86400) * 1000)

# Method 2: Python datetime fallback
midnight = datetime(now.year, now.month, now.day)
today_start_method2 = int(midnight.timestamp() * 1000)

# Use method 1 if within 48 hours, else fallback
```

## Database Migration Issues

### Issue: Idempotent Migrations Fail
**Problem:** Migration errors on Railway for operations that might already exist.

**Solution:** Use `DO` blocks:
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

## Date/Timezone Issues

### Issue: Dates Off By One Day
**Problem:** Shelf dates showing one day off due to timezone conversion.

**Solution:** Use UTC timezone:
```typescript
new Date(date).toLocaleDateString('en-US', {
  timeZone: 'UTC',
})
```

### Issue: UWorld Today Count Wrong
**Problem:** Dashboard showing 0 questions for today despite recent entries.

**Solution:** Calculate today/week on client-side using local timezone:
```typescript
const now = new Date()
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
```

---

# 11. Development Commands

## Local Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run production build locally
npm run start

# Lint code
npm run lint
```

## Database Commands

```bash
# Open Prisma Studio (visual database browser)
npx prisma studio

# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Push schema without migration (dev only)
npx prisma db push

# Reset database (WARNING: destroys data)
npx prisma migrate reset
```

## Git Commands

```bash
# Check status
git status

# View recent commits
git log --oneline -10

# Add and commit
git add -A && git commit -m "message"

# Push to deploy
git push origin main
```

---

# 12. Deployment Protocol

## Railway Auto-Deployment

**Railway automatically deploys when you push to the `main` branch.**

### Deployment Process
```bash
# 1. Make changes
# 2. Build locally to verify
npm run build

# 3. Commit and push
git add -A && git commit -m "feat: description" && git push origin main

# 4. Railway auto-deploys (1-2 minutes)
# Check Railway dashboard for deploy status
```

### NEVER DO
```bash
# DO NOT use railway up - it bypasses GitHub
railway up  # ❌ WRONG

# DO NOT force push to main
git push --force origin main  # ❌ DANGEROUS
```

### Environment Variables
- Managed in Railway dashboard
- Changes take effect on next deploy
- Sensitive values never in code

---

# 13. Forbidden Actions

## NEVER DO THESE

| Action | Reason |
|--------|--------|
| Add light mode | Dark mode only by design |
| Upgrade Prisma to 7+ | Railway Node version incompatibility |
| Use `railway up` | Bypasses GitHub, causes sync issues |
| Add landing/marketing pages | Removed intentionally |
| Add emojis (unless asked) | Clean, professional interface |
| Over-engineer solutions | Personal tool, keep it simple |
| Create unnecessary abstractions | YAGNI principle |
| Force push to main | Dangerous, can lose work |
| Store secrets in code | Use environment variables |
| Add light mode toggle | Seriously, dark mode only |

---

# 14. Planned Features

## High Priority

| Feature | Status | Notes |
|---------|--------|-------|
| Google Calendar two-way sync | 🟡 Partial | OAuth working, sync in progress |
| UWorld PDF auto-import | ⚪ Not started | Parse PDF incorrects |

## Medium Priority

| Feature | Status | Notes |
|---------|--------|-------|
| 4th Year module | ⚪ Not started | Residency, ERAS, interviews |
| Shelf exam predictor | ⚪ Not started | ML model |
| Apple Calendar (CalDAV) | ⚪ Not started | Complex setup |

## Low Priority

| Feature | Status | Notes |
|---------|--------|-------|
| AI study coach | ⚪ Not started | Daily recommendations |
| PWA/Offline mode | ⚪ Not started | Service worker |
| Mobile app | ⚪ Not started | React Native |

---

# 15. Version Changelog

## Versioning Schema
- **MAJOR.MINOR.PATCH**
- Major: Breaking changes, major features
- Minor: New features, significant improvements
- Patch: Bug fixes, small improvements

---

## v1.3.0 - December 11, 2025

### Session Details
- **Date:** December 11, 2025
- **Duration:** Single session
- **Developer:** AI Assistant (Claude)

### Changes Made

#### 1. Clinical Algorithms Feature - MAJOR ADDITION
**Purpose:** Save and reference diagnostic flowcharts from UWorld/UpToDate, organized by rotation for shelf exam studying.

**Database Changes:**
- Created `ClinicalAlgorithm` model in Prisma schema
- Fields: id, userId, rotationId, title, description, subject, imageData (base64), imageType, source, tags, isHighYield, timestamps
- Indexes on userId, rotationId, subject, isHighYield
- Migration file: `prisma/migrations/20241210_add_clinical_algorithms/migration.sql`

**API Routes Created:**
- `GET /api/clinical-algorithms` - List algorithms with optional filters (subject, rotationId, highYield)
- `POST /api/clinical-algorithms` - Create new algorithm with image validation (max 10MB)
- `GET /api/clinical-algorithms/[id]` - Get single algorithm with full image data
- `PUT /api/clinical-algorithms/[id]` - Update algorithm (optional image replacement)
- `DELETE /api/clinical-algorithms/[id]` - Delete algorithm

**Component Created:**
- `src/components/clinical-notes/AlgorithmsTab.tsx`
  - Full image paste support (Ctrl+V)
  - File upload button
  - Search functionality
  - Grid view with thumbnails
  - Full image view modal
  - High-yield star marking
  - Delete with confirmation

#### 2. Integration into Clinical Notes Rotation Workspace
**Before:** Clinical Notes had tabs: Patients, Pearls, Reference (placeholder), Pharm
**After:** Clinical Notes has tabs: Patients, Pearls, Algorithms (full feature), Pharm

**Files Modified:**
- `src/components/clinical-notes/RotationWorkspace.tsx`
  - Changed import from `ReferenceTab` to `AlgorithmsTab`
  - Updated tabs array: `{ id: 'algorithms', name: 'Algorithms', icon: GitBranch }`
  - Updated tab content rendering to use `AlgorithmsTab`

**Files Deleted:**
- `src/components/clinical-notes/ReferenceTab.tsx` (was placeholder)
- `src/app/(dashboard)/dashboard/algorithms/page.tsx` (standalone page removed)

#### 3. Sidebar Navigation Update
**Change:** Removed "Clinical Algorithms" as separate sidebar item (now accessed via Clinical Notes → [Rotation] → Algorithms tab)

**File Modified:** `src/components/dashboard/sidebar.tsx`
- Removed `GitBranch` icon import
- Removed `{ name: 'Clinical Algorithms', href: '/dashboard/algorithms', icon: GitBranch }` from navigation array

#### 4. AI Widget Context Update
**File Modified:** `src/components/FloatingAIWidget.tsx`
- Updated `/dashboard/clinical-notes` description to include Algorithms tab
- Removed separate `/dashboard/algorithms` entry

### Files Changed Summary
| File | Action | Lines Changed |
|------|--------|---------------|
| `prisma/schema.prisma` | Modified | +30 (ClinicalAlgorithm model) |
| `prisma/migrations/20241210_add_clinical_algorithms/migration.sql` | Created | +25 |
| `src/app/api/clinical-algorithms/route.ts` | Created | +126 |
| `src/app/api/clinical-algorithms/[id]/route.ts` | Created | +153 |
| `src/components/clinical-notes/AlgorithmsTab.tsx` | Created | +450 |
| `src/components/clinical-notes/RotationWorkspace.tsx` | Modified | +5, -5 |
| `src/components/clinical-notes/ReferenceTab.tsx` | Deleted | -20 |
| `src/components/dashboard/sidebar.tsx` | Modified | -2 |
| `src/components/FloatingAIWidget.tsx` | Modified | +2, -6 |
| `src/app/(dashboard)/dashboard/algorithms/page.tsx` | Deleted | -581 |

### Git Commits
1. `956dbe2` - Add Clinical Algorithms feature for diagnostic flowcharts
2. `8a93ce9` - Move Clinical Algorithms into Clinical Notes rotation workspace

### Testing Performed
- [x] Build succeeded (`npm run build`)
- [x] All routes compile
- [x] Pushed to GitHub
- [x] Railway deployment triggered

### Breaking Changes
- Standalone `/dashboard/algorithms` route no longer exists
- Algorithms now accessed via Clinical Notes → [Rotation] → Algorithms tab

---

## v1.2.0 - December 9, 2025

### Session Details
- **Date:** December 9, 2025
- **Developer:** AI Assistant (Claude)

### Changes Made

#### 1. Anki Add-on v1.6.0 → v1.7.0
**Issue:** "Recent Progress" section showing all zeros while "Cards Due Today" worked correctly.

**Root Cause:** `col.sched.day_cutoff` returning inconsistent values in Anki 25.02+

**Solution:** Dual-method timestamp calculation with validation
- Method 1: Use Anki's `day_cutoff` (accounts for custom rollover time)
- Method 2: Python datetime at local midnight (fallback)
- Validation: Use method 1 if within 48 hours of method 2

**File Modified:** `src/app/api/anking/addon/route.ts`

#### 2. Google Calendar OAuth Fixes
- Fixed redirect URI (was going to localhost:8080)
- Hardcoded `BASE_URL = 'https://scrubbuddy.app'` in callback
- Created database migration for CalendarFeed table

#### 3. Calendar UX Improvements
- Fixed "+X more" click to open Day view instead of Add Event modal

#### 4. Legal Pages
- Created Terms of Service page (`/terms`)
- Created Privacy Policy page (`/privacy`)

---

## v1.1.0 - December 8, 2025

### Session Details
- **Date:** December 8, 2025
- **Developer:** AI Assistant (Claude)

### Changes Made

#### 1. UWorld Question-Level Tracking
**Database Addition:** `UWorldQuestion` model
- Stores ALL questions (correct AND incorrect)
- Fields: questionId, subject, system, category, topic, percentOthers, timeSpent, isCorrect
- Unique constraint on [userId, questionId]
- Enables cumulative analytics across all exams

#### 2. Text Paste Import Enhancement
- Moved "Paste Text" to first tab (primary workflow)
- Added "Pasting incorrect questions only" checkbox
- When unchecked, saves questions as correct
- Saves to both UWorldQuestion and UWorldIncorrect (for incorrect only)

#### 3. Expandable Session Details
- Click any session to expand
- Shows breakdown by Subject, System, Category, Topic
- Each row: name, total, correct, incorrect, percentage
- Fetches from `/api/uworld/[id]?includeQuestions=true`

---

## v1.0.0 - December 1, 2025

### Session Details
- **Date:** December 1, 2025
- **Developer:** AI Assistant (Claude)

### Initial Stable Release

#### Features at Launch
1. Dashboard with 9 draggable widgets
2. UWorld tracker with text paste import
3. Anki integration with custom add-on (v1.6.0)
4. Clinical Notes by rotation (Patients, Pearls, Pharm)
5. Calendar with month/week/day views
6. Procedure reference library
7. Patient log for ERAS
8. Settings (rotations, exam dates, goals)
9. AI Medical Assistant (floating widget)

#### Anki Add-on Fixes (v1.4.0 → v1.6.0)
- Due counts now use `deck_due_tree()` for accurate totals
- Studied stats use f-string SQL (Rust backend compatibility)
- Handle both list and cursor returns from DB queries

---

## Pre-v1.0.0 - Development History

Initial development prior to documentation. Features built iteratively over multiple sessions.

---

# End of Documentation

**Last Updated:** December 11, 2025
**Version:** 1.3.0
**Maintainer:** AI Assistant (Claude)

---

## REMEMBER: UPDATE THIS FILE AT END OF EVERY SESSION

When the session ends:
1. Create new version entry in Section 15
2. Document ALL changes with extreme detail
3. Update any affected sections
4. Commit: `git add CLAUDE.md && git commit -m "docs: Update CLAUDE.md vX.X.X" && git push origin main`
