# ScrubBuddy 🩺

### Your AI-Powered Clinical Year Command Center

> Built for third-year medical students who refuse to burn out. Maximize shelf scores, track clinical growth, and let AI tell you exactly what to study next.

---

## Table of Contents

1. [Vision & Philosophy](#vision--philosophy)
2. [Core Modules](#core-modules)
3. [AI Integration](#ai-integration)
4. [Analytics & Insights](#analytics--insights)
5. [User Experience](#user-experience)
6. [Technical Architecture](#technical-architecture)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Deployment & Infrastructure](#deployment--infrastructure)
10. [Future Roadmap](#future-roadmap)

---

## Vision & Philosophy

### The Problem
Medical students in clinical years are drowning in:
- Fragmented study resources (UWorld, Anki, OnlineMedEd, AMBOSS, etc.)
- No unified way to track clinical experiences
- Zero insight into what they should study next
- Procedure anxiety with no quick reference
- Burnout from inefficient studying

### The Solution
**ScrubBuddy** is a single source of truth that:
- Tracks everything in one place
- Uses AI to tell you *exactly* what to study
- Learns your weak spots and optimizes your time
- Provides instant procedure references when you're about to do one
- Gives you confidence through data-driven insights

### Design Principles
1. **Speed over features** — Every interaction should take <2 seconds
2. **Mobile-first** — You're in the hospital, not at a desk
3. **Brutally honest analytics** — No sugarcoating your weak areas
4. **AI as a study partner** — Not a replacement for learning, but an accelerator
5. **Offline-capable** — Hospital WiFi is unreliable

---

## Core Modules

### 1. Dashboard (Home)

The nerve center. One glance tells you everything.

#### Components

**Hero Stats Row**
- UWorld % correct (with trend arrow ↑↓)
- Questions done today / goal
- Questions done this week
- Days until STEP 2 / COMLEX 2 (countdown)

**Daily Focus Card**
- AI-generated "Focus Topic of the Day" based on weak areas
- Quick link to start a UWorld block on that topic
- Estimated time to review (e.g., "~45 min")

**Task Widget**
- Unified to-do list
- Quick add with keyboard shortcut
- Drag to reorder priority
- Due dates with color coding (overdue = red)
- Recurring tasks support (e.g., "Review 20 incorrects daily")

**Recent Activity Feed**
- Last 5 patient encounters logged
- Last UWorld session stats
- Recently viewed procedures
- Timestamps for everything

**Shelf Score Tracker**
- Visual cards for each rotation
- Score, percentile (if known), date
- Goal vs actual comparison

**Quick Actions Bar**
- "Log Patient" button
- "Log UWorld" button
- "Quick Procedure Lookup" searchable dropdown
- "Start Study Session" timer

---

### 2. Patient Log

Track every clinical encounter for learning AND for residency applications.

#### Patient Entry Fields

**Required**
- Chief Complaint (text, autocomplete from common complaints)
- Primary Diagnosis (text, ICD-10 autocomplete optional)
- Rotation (dropdown: your 8 rotations)
- Date of Encounter (auto-fills today)

**Optional**
- Secondary Diagnoses (multi-select/tags)
- Procedures Performed (multi-select from procedure library)
- Procedures Observed (multi-select)
- Setting (Inpatient, Outpatient, ED, OR, L&D, Clinic)
- Patient Age Range (Neonate, Pediatric, Adult, Geriatric)
- Attending/Resident Name (for thank you notes later)
- Key Learning Points (rich text)
- Follow-up Needed? (checkbox + notes)
- Linked UWorld Questions (if you did questions on this topic)

#### Views & Filters

**List View**
- Sortable table with all patients
- Search across all fields
- Filter by: Rotation, Date Range, Diagnosis, Procedure, Setting

**Grid View**
- Card-based visual layout
- Quick preview on hover

**Calendar View**
- See patient encounters by date
- Useful for tracking "slow days" vs "busy days"

**Analytics View**
- Patients per rotation (bar chart)
- Diagnoses word cloud
- Procedures performed count
- Encounters over time (line graph)

#### Smart Features

**Autocomplete & Suggestions**
- Chief complaints autocomplete from your history + common medical complaints
- Diagnoses suggest related conditions (e.g., type "MI" → suggests NSTEMI, STEMI, etc.)

**Duplicate Detection**
- Warn if logging similar patient within 24 hours
- "Is this a follow-up?" prompt

**Learning Point Prompts**
- AI-generated reflection questions based on diagnosis
- E.g., for CHF: "What's the BNP cutoff? What diuretic did they use? Why?"

**Export for ERAS/Residency Apps**
- Generate procedure counts by category
- Export to CSV/PDF
- Summary statistics for applications

---

### 3. Procedure Reference

Your pocket procedure guide. Instant access when you're about to do something.

#### Procedure Entry Structure

```
{
  id: string
  name: string
  category: "General" | "Advanced" | "Specialty" | "Custom"
  specialty: "Surgery" | "Medicine" | "OB" | "Peds" | "Psych" | "FM" | "EM" | "All"
  indications: string[]
  contraindications: string[]
  supplies: string[]
  steps: {
    number: number
    instruction: string
    tip?: string
    image_url?: string
    video_url?: string
  }[]
  pearls: string[]
  common_mistakes: string[]
  documentation_template?: string
  estimated_time: string
  difficulty: 1-5
  times_performed: number (user-specific)
  last_performed: date (user-specific)
  confidence_level: 1-5 (user-specific self-rating)
}
```

#### Pre-loaded Procedures (Organized by Category)

**General / Everyone Should Know**
1. Simple Interrupted Suturing
2. Running Subcuticular Suture
3. Vertical & Horizontal Mattress Sutures
4. Figure-of-Eight Suture
5. Foley Catheter Insertion (Male & Female)
6. NG Tube Insertion
7. IV Catheter Insertion
8. Arterial Blood Gas (Radial)
9. Venipuncture / Blood Draw
10. Basic Wound Care & Dressing
11. Sterile Technique / Gowning & Gloving
12. PPE Donning/Doffing
13. Hand-Tied Surgical Knots
14. Instrument Ties
15. EKG Lead Placement

**Medicine / IM**
16. Lumbar Puncture
17. Paracentesis
18. Thoracentesis
19. Arthrocentesis (Knee)
20. Central Line Assist
21. Cardioversion (Observe/Assist)
22. ABG Interpretation (not procedure but useful reference)

**Surgery**
23. Surgical Scrubbing
24. Surgical Knot Tying (One-handed, Two-handed)
25. Laparoscopic Port Placement (Observe)
26. Drain Removal
27. Staple Removal
28. Suture Removal
29. Wound Vac Application
30. Chest Tube Insertion (Observe/Assist)
31. Local Anesthesia Injection

**OB/GYN**
32. Cervical Exam
33. Leopold Maneuvers
34. Fetal Heart Tone Monitoring
35. Speculum Exam
36. Pap Smear
37. IUD Insertion (Observe)
38. Spontaneous Vaginal Delivery (Assist)
39. C-Section (Assist/Observe)
40. Episiotomy Repair
41. Circumcision (Observe)

**Pediatrics**
42. Pediatric IV Placement
43. Pediatric Lumbar Puncture
44. Heel Stick (Newborn)
45. Developmental Screening
46. Growth Chart Plotting
47. Pediatric Physical Exam Pearls

**Psychiatry**
48. Mental Status Exam (MSE)
49. Suicide Risk Assessment
50. Capacity Evaluation
51. Involuntary Hold Documentation

**Emergency Medicine**
52. Primary & Secondary Survey
53. Rapid Sequence Intubation (Observe)
54. Chest Compressions / CPR
55. Splinting Techniques
56. Wound Irrigation
57. I&D (Incision & Drainage)
58. Reduction of Dislocated Shoulder (Observe)
59. Slit Lamp Exam

**Orthopedics**
60. Splint Application (Short arm, Long arm, Thumb spica)
61. Casting Basics
62. Joint Injection (Observe)
63. Fracture Description (how to describe on X-ray)
64. Compartment Pressure Check

#### Procedure UI Features

**Quick Search**
- Instant search as you type
- Fuzzy matching ("foley" finds "Foley Catheter")
- Recent procedures appear first

**Checklist Mode**
- Transform steps into interactive checklist
- Check off as you go
- Audio readout option (hands-free)

**Timer**
- Optional timer to track how long procedure takes
- Builds confidence seeing improvement

**Confidence Tracker**
- After each procedure, rate confidence 1-5
- Track improvement over time
- AI suggests procedures to practice

**Video Links**
- Embed YouTube / Osmosis videos where available
- User can add their own links

**Personal Notes**
- Add your own tips per procedure
- "What worked for me" section

---

### 4. UWorld Tracker

The heart of board prep tracking.

#### Daily Logging

**Quick Log Form**
- Date (defaults today)
- Questions completed
- Questions correct
- Time spent (optional)
- Mode: Timed / Tutor / Review
- Block ID / Name (optional, for tracking specific blocks)
- Notes (optional)

**Batch Import** (Future)
- Screenshot OCR to auto-extract stats
- CSV upload from UWorld export

#### Subject/System Breakdown

Track performance by:
- **System**: Cardio, Pulm, GI, Renal, Neuro, MSK, Endo, Heme/Onc, ID, Psych, Repro, Derm, etc.
- **Subject**: Anatomy, Physiology, Pathology, Pharmacology, Microbiology, Biochemistry
- **Rotation Correlation**: Map UWorld topics to current rotation

**Manual Entry or Smart Tagging**
- Log which systems/subjects each block covered
- AI can analyze your notes to auto-tag

#### Incorrects Management

**Incorrects Queue**
- Every question you get wrong goes here
- Mark as: "Needs Review", "Reviewed", "Mastered"
- Spaced repetition scheduling
- Tag with topic/concept

**Incorrects Entry Fields**
- Question ID (if you want)
- Topic/Concept
- Why you got it wrong: Misread, Didn't Know, Second-guessed, Silly Mistake
- Key learning point
- Related patient encounter? (link)

**Review Workflow**
- Daily "Incorrects Review" prompt
- Show cards one by one
- Mark as "Got it" or "Still shaky"
- Shaky ones come back more frequently

#### Shelf Exam Scores

**Entry Fields**
- Rotation
- Score (raw or percentile)
- Date
- Goal score
- National average (if known)
- Percentile (if known)
- Notes/Reflection

**Visualization**
- Bar chart of all shelf scores
- Trend line showing improvement
- Goal vs actual overlay
- Comparison to class average (if you know it)

#### NBME Practice Exams

**Track Practice Exams**
- NBME #, UWSA1, UWSA2, Free 120, etc.
- Score
- Predicted 3-digit score
- Date
- Weak areas identified
- Action items

**Score Predictor**
- Based on your practice exams, estimate real score range
- Show confidence interval

---

### 5. Study Planner

Turn chaos into a structured plan.

#### Rotation Scheduler

**Input Your Rotation Schedule**
- Rotation name
- Start date
- End date
- Shelf exam date
- Auto-calculates "days until shelf"

**Current Rotation Awareness**
- App knows what rotation you're on
- Filters and suggestions adapt accordingly
- Dashboard highlights rotation-specific stats

#### Study Blocks

**Create Study Blocks**
- Time block (e.g., 6 PM - 8 PM)
- Activity type: UWorld, Anki, Review, OnlineMedEd, Reading
- Topic/System focus
- Recurring? (Daily, Weekdays, Custom)
- Reminder notification

**Daily Schedule View**
- Calendar showing your study blocks
- Drag and drop to reschedule
- Mark as complete / skipped

#### Goal Setting

**Weekly Goals**
- Questions to complete
- Incorrects to review
- Patients to log
- Procedures to practice

**Rotation Goals**
- Total questions before shelf
- Target % correct
- Minimum patient encounters

**Progress Tracking**
- Visual progress bars
- "You're 73% to your weekly goal"
- Streak counters (days in a row studying)

---

### 6. Resource Library

All your study links in one place.

#### Categories

- **Question Banks**: UWorld, Amboss, Kaplan links
- **Videos**: OnlineMedEd, Boards & Beyond, Pathoma, Sketchy
- **Anki Decks**: Links to your active decks
- **Guidelines**: UpToDate, ACOG, AAP, etc.
- **Rotation-Specific**: Shelf-specific resources per rotation
- **Custom**: Your own bookmarks

#### Features

- Quick search across all resources
- Tag resources by rotation/topic
- "Launch" button opens in new tab
- Track which resources you've used (last accessed)

---

## AI Integration

This is where ScrubBuddy becomes **remarkable**.

### 1. AI Study Coach

**Endpoint**: Integrated chatbot in the app

**Capabilities**

**Daily Briefing**
> "Good morning! You're on day 18 of Surgery with 12 days until your shelf. You've done 423/600 questions (71% correct). Your weak areas are: Surgical Oncology (58%), Trauma (62%), and Hernias (65%). I recommend focusing on Trauma today — here's why: you logged 2 trauma patients this week but struggled on related questions. Want me to create a study plan?"

**Analytics Interpretation**
- "Your cardio % dropped 8% this week. Here are the specific topics dragging it down..."
- "You're scoring 12% higher in Tutor mode vs Timed. Consider doing more timed blocks to build test stamina."
- "You've logged 45 patients but only 3 procedures. Try to seek out more hands-on opportunities."

**Study Recommendations**
- Based on: weak areas, time until exam, rotation relevance
- "You have 5 hours today. Here's optimal allocation: 2hr UWorld (focus: Renal), 1hr Anki review, 1hr incorrects, 1hr OnlineMedEd Cardio"
- Adapts if you say "I only have 2 hours"

**Motivational Support**
- Recognize burnout patterns ("You've studied 60+ hours this week. Consider a rest day.")
- Celebrate wins ("You just hit 70%! That's above the passing threshold.")
- Normalize struggle ("Most students find Biostats hard. You're not alone.")

**Question Explanations** (If they paste a question concept)
- Explain why an answer is correct
- Provide memory hooks / mnemonics
- Link to related patient encounters they've logged

**Clinical Correlation**
- "You logged a patient with CHF yesterday. Key UWorld topics to review: BNP, Loop diuretics, Ejection Fraction classifications"
- Connect book learning to real patients

### 2. AI Procedure Assistant

**Pre-Procedure Briefing**
- "I see you're about to do an LP. Here's a 30-second refresher..."
- Audio option for hands-free

**Post-Procedure Reflection**
- "How did it go? Any challenges?"
- AI suggests what to review based on response

### 3. Smart Notifications

**Context-Aware Reminders**
- "You haven't logged UWorld in 2 days" (only if true)
- "Your Surgery shelf is in 3 days — enter crunch mode?"
- "You did 60 questions today! Take a break."

**Intelligent Timing**
- Learn when user typically studies
- Don't send notifications during rotations hours
- Respect Do Not Disturb settings

### 4. Natural Language Input

**Quick Logging via Chat**
- "Log 40 questions, 32 correct, cardio focus"
- "Add patient: 65M chest pain, NSTEMI, cards"
- "I did a Foley today, felt confident"
- AI parses and creates proper entries

### 5. AI-Generated Content

**Custom Mnemonics**
- Generate mnemonics for topics you're struggling with
- "Give me a mnemonic for the causes of acute pancreatitis"

**Practice Questions** (Use with caution)
- Generate practice vignettes based on patients you've seen
- "Create a question about the CHF patient I logged yesterday"

**Summary Notes**
- "Summarize my key learning points from this week"
- Generate rotation summary before shelf

---

## Analytics & Insights

### Dashboard Analytics

**UWorld Performance**
- Overall % correct (with trend)
- Performance by system (bar chart)
- Performance by subject (bar chart)
- Timed vs Tutor comparison
- Questions per day (line graph)
- Rolling 7-day average

**Learning Curves**
- Plot % correct over time per system
- Identify improving vs stagnating areas

**Study Time**
- Hours logged per day/week
- Time per question average
- Most productive time of day

### Patient Analytics

- Total encounters per rotation
- Diagnosis frequency (what are you seeing most?)
- Procedure count (for ERAS)
- Encounters over time
- Learning points word cloud

### Predictive Analytics

**Shelf Score Predictor**
- Based on UWorld % + questions completed + practice exam scores
- "Based on your data, predicted shelf score: 72-78"
- Confidence interval

**Readiness Indicator**
- Red / Yellow / Green status for each rotation
- "You're Yellow for Surgery: 65% complete, 68% correct. Need 50+ more questions."

**Time to Target**
- "At your current pace, you'll hit 70% correct in ~12 days"
- "To reach 75%, focus on these 3 systems"

### Comparative Analytics (Optional/Future)

- Anonymous comparison to other users
- "You're in the top 30% of UWorld completion for your stage"
- Only if user opts in

---

## User Experience

### Design System

**Color Palette**
```
Primary: #60a5fa (Blue)
Secondary: #a78bfa (Purple)
Accent: #34d399 (Green - success)
Warning: #fbbf24 (Yellow)
Danger: #f87171 (Red)
Background: #0f172a → #1e293b (Dark gradient)
Surface: rgba(30, 41, 59, 0.5)
Text Primary: #f1f5f9
Text Secondary: #94a3b8
Text Muted: #64748b
```

**Typography**
- Headings: DM Sans (Bold)
- Body: DM Sans (Regular)
- Mono: JetBrains Mono (for stats/code)

**Border Radius**
- Small: 6px
- Medium: 10px
- Large: 16px
- XL: 24px

**Shadows**
- Subtle glass morphism
- Backdrop blur on cards
- Soft glow on interactive elements

### Navigation

**Desktop**
- Fixed left sidebar (240px)
- Collapsible to icons only
- Top bar with search + user menu

**Mobile**
- Bottom tab bar (5 items max)
- Hamburger menu for secondary items
- Swipe gestures for common actions

### Keyboard Shortcuts

```
Cmd/Ctrl + K    → Global search
Cmd/Ctrl + N    → New patient
Cmd/Ctrl + U    → Log UWorld
Cmd/Ctrl + P    → Procedure search
Cmd/Ctrl + T    → New task
Cmd/Ctrl + /    → Show all shortcuts
Esc             → Close modals
```

### Accessibility

- Full keyboard navigation
- Screen reader support
- High contrast mode option
- Reduced motion option
- Font size adjustment

### Offline Support

- Service worker caches core app
- Procedure references available offline
- Queue actions when offline, sync when back
- Clear offline indicator

### Mobile-Specific Features

- Pull to refresh
- Swipe to complete tasks
- Quick actions from lock screen widget (iOS/Android if native)
- Share extension to quickly log from other apps

---

## Technical Architecture

### Stack

**Frontend**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Zustand (state management)
- React Query (data fetching)
- Framer Motion (animations)

**Backend**
- Next.js API Routes
- Prisma ORM
- PostgreSQL (Railway)

**Authentication**
- NextAuth.js OR custom JWT
- Email/password
- Google OAuth (optional)
- Magic link (optional)

**AI**
- Anthropic Claude API (claude-sonnet-4-20250514)
- Streaming responses for chat

**Infrastructure**
- Railway (hosting + database)
- Vercel (alternative hosting)
- Cloudflare (CDN, optional)

### Project Structure

```
scrubbuddy/
├── prisma/
│   └── schema.prisma
├── public/
│   └── icons, images
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx (sidebar, auth check)
│   │   │   ├── page.tsx (dashboard home)
│   │   │   ├── patients/
│   │   │   ├── procedures/
│   │   │   ├── uworld/
│   │   │   ├── planner/
│   │   │   ├── resources/
│   │   │   ├── analytics/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── patients/
│   │   │   ├── procedures/
│   │   │   ├── tasks/
│   │   │   ├── uworld/
│   │   │   └── ai/
│   │   ├── layout.tsx
│   │   └── page.tsx (landing/marketing)
│   ├── components/
│   │   ├── ui/ (buttons, inputs, cards, etc.)
│   │   ├── dashboard/
│   │   ├── patients/
│   │   ├── procedures/
│   │   ├── uworld/
│   │   └── ai/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── ai.ts
│   │   └── utils.ts
│   ├── hooks/
│   ├── stores/
│   └── types/
├── .env.example
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

---

## Database Schema

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== USER ====================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Settings
  step2Date     DateTime?
  comlexDate    DateTime?
  dailyGoal     Int       @default(40)
  weeklyGoal    Int       @default(200)
  
  // Relations
  rotations     Rotation[]
  patients      Patient[]
  procedures    UserProcedure[]
  uworldLogs    UWorldLog[]
  uworldIncorrects UWorldIncorrect[]
  shelfScores   ShelfScore[]
  practiceExams PracticeExam[]
  tasks         Task[]
  studyBlocks   StudyBlock[]
  resources     Resource[]
  aiConversations AIConversation[]
}

// ==================== ROTATIONS ====================

model Rotation {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  name        String    // "Psychiatry", "Pediatrics", etc.
  startDate   DateTime
  endDate     DateTime
  shelfDate   DateTime?
  isCurrent   Boolean   @default(false)
  
  // Relations
  patients    Patient[]
  shelfScores ShelfScore[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([userId])
}

// ==================== PATIENTS ====================

model Patient {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  rotationId      String?
  rotation        Rotation? @relation(fields: [rotationId], references: [id])
  
  // Required
  chiefComplaint  String
  diagnosis       String
  encounterDate   DateTime  @default(now())
  
  // Optional
  secondaryDx     String[]  @default([])
  setting         String?   // "Inpatient", "Outpatient", "ED", "OR", etc.
  ageGroup        String?   // "Neonate", "Pediatric", "Adult", "Geriatric"
  attendingName   String?
  learningPoints  String?   @db.Text
  followUpNeeded  Boolean   @default(false)
  followUpNotes   String?
  
  // Relations
  proceduresPerformed  PatientProcedure[] @relation("performed")
  proceduresObserved   PatientProcedure[] @relation("observed")
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([userId])
  @@index([rotationId])
}

model PatientProcedure {
  id            String    @id @default(cuid())
  patientId     String
  procedureId   String
  type          String    // "performed" or "observed"
  
  patientPerformed  Patient?  @relation("performed", fields: [patientId], references: [id], onDelete: Cascade)
  patientObserved   Patient?  @relation("observed", fields: [patientId], references: [id], onDelete: Cascade)
  procedure         Procedure @relation(fields: [procedureId], references: [id])
  
  @@index([patientId])
  @@index([procedureId])
}

// ==================== PROCEDURES ====================

model Procedure {
  id                String    @id @default(cuid())
  
  // Core info
  name              String
  category          String    // "General", "Advanced", "Specialty"
  specialty         String    // "Surgery", "Medicine", "OB", etc.
  
  // Content
  indications       String[]  @default([])
  contraindications String[]  @default([])
  supplies          String[]  @default([])
  steps             Json      // Array of step objects
  pearls            String[]  @default([])
  commonMistakes    String[]  @default([])
  documentationTpl  String?   @db.Text
  
  // Metadata
  estimatedTime     String?
  difficulty        Int       @default(1) // 1-5
  videoUrl          String?
  
  // Is this a default procedure or user-created?
  isDefault         Boolean   @default(false)
  createdByUserId   String?
  
  // Relations
  userProcedures    UserProcedure[]
  patientProcedures PatientProcedure[]
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model UserProcedure {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  procedureId     String
  procedure       Procedure @relation(fields: [procedureId], references: [id])
  
  // User-specific tracking
  timesPerformed  Int       @default(0)
  timesObserved   Int       @default(0)
  lastPerformed   DateTime?
  confidenceLevel Int       @default(1) // 1-5
  personalNotes   String?   @db.Text
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([userId, procedureId])
  @@index([userId])
}

// ==================== UWORLD ====================

model UWorldLog {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  date          DateTime  @default(now())
  questionsTotal Int
  questionsCorrect Int
  timeSpentMins Int?
  mode          String?   // "timed", "tutor", "review"
  blockName     String?
  
  // Topic tracking
  systems       String[]  @default([]) // ["Cardio", "Pulm"]
  subjects      String[]  @default([]) // ["Pathology", "Pharm"]
  
  notes         String?
  
  createdAt     DateTime  @default(now())
  
  @@index([userId])
  @@index([date])
}

model UWorldIncorrect {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  questionId    String?   // Optional UWorld question ID
  topic         String
  concept       String?
  whyWrong      String?   // "Misread", "Didn't Know", "Second-guessed", "Silly Mistake"
  learningPoint String?   @db.Text
  
  status        String    @default("needs_review") // "needs_review", "reviewed", "mastered"
  reviewCount   Int       @default(0)
  nextReviewAt  DateTime?
  lastReviewedAt DateTime?
  
  // Link to patient if relevant
  patientId     String?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([userId])
  @@index([status])
}

model ShelfScore {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  rotationId  String?
  rotation    Rotation? @relation(fields: [rotationId], references: [id])
  
  rotationName String   // Denormalized for easy access
  score       Int
  percentile  Int?
  goalScore   Int?
  date        DateTime
  notes       String?
  
  createdAt   DateTime  @default(now())
  
  @@index([userId])
}

model PracticeExam {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  examName      String    // "NBME 9", "UWSA1", "Free 120"
  score         Int
  predictedScore Int?
  percentCorrect Float?
  date          DateTime
  weakAreas     String[]  @default([])
  actionItems   String?   @db.Text
  
  createdAt     DateTime  @default(now())
  
  @@index([userId])
}

// ==================== TASKS ====================

model Task {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  text        String
  done        Boolean   @default(false)
  dueDate     DateTime?
  priority    Int       @default(0) // Higher = more important
  recurring   String?   // "daily", "weekdays", "weekly", null
  category    String?   // "study", "clinical", "personal"
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([userId])
  @@index([done])
}

// ==================== STUDY PLANNER ====================

model StudyBlock {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title       String
  type        String    // "uworld", "anki", "review", "video", "reading"
  topic       String?
  startTime   DateTime
  endTime     DateTime
  recurring   String?   // "daily", "weekdays", etc.
  completed   Boolean   @default(false)
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([userId])
  @@index([startTime])
}

// ==================== RESOURCES ====================

model Resource {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  name        String
  url         String
  category    String    // "qbank", "video", "anki", "guideline", "custom"
  rotation    String?   // Link to specific rotation
  tags        String[]  @default([])
  lastAccessed DateTime?
  
  createdAt   DateTime  @default(now())
  
  @@index([userId])
}

// ==================== AI ====================

model AIConversation {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  messages    Json      // Array of {role, content, timestamp}
  summary     String?   // AI-generated summary of conversation
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([userId])
}
```

---

## API Endpoints

### Authentication

```
POST   /api/auth/register     - Create account
POST   /api/auth/login        - Login, get JWT
POST   /api/auth/logout       - Clear session
GET    /api/auth/me           - Get current user
PUT    /api/auth/me           - Update profile
```

### Patients

```
GET    /api/patients          - List all (with filters)
POST   /api/patients          - Create patient
GET    /api/patients/:id      - Get single patient
PUT    /api/patients/:id      - Update patient
DELETE /api/patients/:id      - Delete patient
GET    /api/patients/stats    - Get patient analytics
GET    /api/patients/export   - Export for ERAS
```

### Procedures

```
GET    /api/procedures        - List all procedures
GET    /api/procedures/:id    - Get procedure details
POST   /api/procedures        - Create custom procedure
PUT    /api/procedures/:id    - Update (custom only)
DELETE /api/procedures/:id    - Delete (custom only)
PUT    /api/procedures/:id/track - Update user-specific tracking
```

### UWorld

```
GET    /api/uworld/logs       - List all logs
POST   /api/uworld/logs       - Create log entry
GET    /api/uworld/stats      - Get comprehensive stats
GET    /api/uworld/incorrects - List incorrects
POST   /api/uworld/incorrects - Add incorrect
PUT    /api/uworld/incorrects/:id - Update (status, review)
GET    /api/uworld/shelf-scores - List shelf scores
POST   /api/uworld/shelf-scores - Add shelf score
GET    /api/uworld/practice-exams - List practice exams
POST   /api/uworld/practice-exams - Add practice exam
```

### Tasks

```
GET    /api/tasks             - List all tasks
POST   /api/tasks             - Create task
PUT    /api/tasks/:id         - Update task
DELETE /api/tasks/:id         - Delete task
PUT    /api/tasks/:id/toggle  - Toggle done status
PUT    /api/tasks/reorder     - Reorder tasks
```

### Rotations

```
GET    /api/rotations         - List user's rotations
POST   /api/rotations         - Create/setup rotations
PUT    /api/rotations/:id     - Update rotation
DELETE /api/rotations/:id     - Delete rotation
```

### Study Planner

```
GET    /api/planner/blocks    - List study blocks
POST   /api/planner/blocks    - Create block
PUT    /api/planner/blocks/:id - Update block
DELETE /api/planner/blocks/:id - Delete block
GET    /api/planner/schedule  - Get weekly schedule view
```

### Resources

```
GET    /api/resources         - List resources
POST   /api/resources         - Add resource
PUT    /api/resources/:id     - Update resource
DELETE /api/resources/:id     - Delete resource
```

### AI

```
POST   /api/ai/chat           - Send message, get response (streaming)
GET    /api/ai/daily-brief    - Get AI daily briefing
POST   /api/ai/analyze        - Analyze specific data
GET    /api/ai/conversations  - List past conversations
GET    /api/ai/conversations/:id - Get conversation history
```

### Analytics

```
GET    /api/analytics/overview - Dashboard stats
GET    /api/analytics/uworld   - Detailed UWorld analytics
GET    /api/analytics/patients - Patient encounter analytics
GET    /api/analytics/predict  - Predictive analytics
```

---

## Deployment & Infrastructure

### Railway Setup

**Services Needed**
1. **Web Service**: Next.js app
2. **PostgreSQL Database**: Managed by Railway

**Environment Variables**
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-app.railway.app
ANTHROPIC_API_KEY=your-claude-api-key
```

**Build Command**
```
npm run build
```

**Start Command**
```
npm run start
```

### GitHub Actions (CI/CD)

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Railway
        run: npm i -g @railway/cli
      - name: Deploy
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### Database Migrations

```bash
# Development
npx prisma db push

# Production (with migrations)
npx prisma migrate deploy
```

---

## Future Roadmap

### Phase 1: MVP (Week 1-2)
- [x] User auth (register/login)
- [x] Dashboard with basic stats
- [x] Patient logging (CRUD)
- [x] Procedure reference (read-only defaults)
- [x] UWorld logging
- [x] Task management
- [x] Mobile responsive

### Phase 2: Core Features (Week 3-4)
- [ ] Shelf score tracking
- [ ] Procedure tracking (times performed, confidence)
- [ ] Custom procedures
- [ ] Rotation scheduler
- [ ] Basic analytics charts
- [ ] Data export

### Phase 3: AI Integration (Week 5-6)
- [ ] AI chatbot implementation
- [ ] Daily briefing generation
- [ ] Study recommendations
- [ ] Natural language logging
- [ ] Smart notifications

### Phase 4: Advanced Features (Week 7-8)
- [ ] Incorrects management with spaced repetition
- [ ] Practice exam tracking & prediction
- [ ] Study planner with calendar
- [ ] Resource library
- [ ] Keyboard shortcuts

### Phase 5: Polish & Scale (Week 9+)
- [ ] Offline support (PWA)
- [ ] Native mobile app (React Native?)
- [ ] Performance optimization
- [ ] Advanced analytics
- [ ] User feedback integration
- [ ] Potential features:
  - Collaborative study groups
  - Shared procedure guides
  - Attending feedback tracking
  - Integration with Anki stats
  - OSCE practice mode

---

## Appendix: Quick Reference

### Rotation List (Default)
1. Psychiatry
2. Pediatrics
3. OB/GYN
4. General Surgery
5. Orthopedic Surgery
6. Internal Medicine
7. Heme/Oncology (IM Subspecialty)
8. Family Medicine

### UWorld Systems
- Cardiovascular
- Pulmonary
- Gastrointestinal
- Renal
- Neurology
- Musculoskeletal
- Endocrine
- Hematology/Oncology
- Infectious Disease
- Psychiatry
- Reproductive
- Dermatology
- Biostatistics/Epidemiology
- Ethics/Legal

### Shelf Exam Score Interpretation
- <60: Needs significant improvement
- 60-65: Below average
- 66-70: Average
- 71-75: Above average
- 76-80: Excellent
- >80: Outstanding

---

## Final Notes

This spec is your north star. You don't need to build everything at once. Start with the MVP, get it working, use it for a week, then iterate.

The AI features are the differentiator. A medical student dashboard is useful. A medical student dashboard that *tells you what to study next* is remarkable.

Ship fast. Iterate faster. Good luck on those boards. 🩺

---

*ScrubBuddy — Your AI-powered study partner through the toughest year of med school.* 🩺
