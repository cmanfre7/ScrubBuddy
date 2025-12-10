import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { UWORLD_QUESTION_TOTALS, SHELF_SUBJECTS, ShelfSubject } from '@/types'

// Helper to calculate days until a date
function daysUntil(targetDate: Date): number {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate()
  )
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// Helper to calculate rotation day
function getRotationDay(startDate: Date): number {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate()
  )
  return Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

// Fetch all user data for AI context
async function getUserContext(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [
    user,
    currentRotation,
    allLogs,
    todayLogs,
    weekLogs,
    recentSessions,
    weakAreas,
    practiceExams,
    boardExams,
    ankiStats,
    uworldSettings,
  ] = await Promise.all([
    // User info with exam dates
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, step2Date: true, comlexDate: true, dailyGoal: true, weeklyGoal: true },
    }),
    // Current rotation
    prisma.rotation.findFirst({
      where: { userId, isCurrent: true },
    }),
    // All UWorld logs
    prisma.uWorldLog.findMany({
      where: { userId },
    }),
    // Today's logs
    prisma.uWorldLog.findMany({
      where: { userId, date: { gte: today } },
    }),
    // This week's logs
    prisma.uWorldLog.findMany({
      where: { userId, date: { gte: weekAgo } },
    }),
    // Recent sessions with questions
    prisma.uWorldLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 10,
      include: {
        questions: {
          select: { subject: true, system: true, topic: true, isCorrect: true },
        },
      },
    }),
    // Weak areas (all incorrects grouped by topic)
    prisma.uWorldIncorrect.groupBy({
      by: ['topic', 'subject', 'system'],
      where: { userId },
      _count: { topic: true },
      orderBy: { _count: { topic: 'desc' } },
      take: 15,
    }),
    // Practice exams
    prisma.practiceExam.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    }),
    // Board exam targets
    prisma.boardExam.findMany({
      where: { userId },
    }),
    // Latest Anki stats
    prisma.ankiSyncStats.findFirst({
      where: { userId },
      orderBy: { syncedAt: 'desc' },
    }),
    // UWorld custom settings
    prisma.uWorldSettings.findMany({
      where: { userId },
    }),
  ])

  // Calculate UWorld totals
  const settingsMap: Record<string, number> = {}
  uworldSettings.forEach((s) => {
    settingsMap[s.subject] = s.totalQuestions
  })
  const uworldTotalQuestions = SHELF_SUBJECTS.reduce((sum, subject) => {
    return sum + (settingsMap[subject] ?? UWORLD_QUESTION_TOTALS[subject])
  }, 0)

  // Calculate stats - only count logs with systems assigned
  const logsWithSystems = allLogs.filter(log => log.systems && log.systems.length > 0)
  const todayLogsWithSystems = todayLogs.filter(log => log.systems && log.systems.length > 0)
  const weekLogsWithSystems = weekLogs.filter(log => log.systems && log.systems.length > 0)

  const totalQuestions = logsWithSystems.reduce((sum, log) => sum + log.questionsTotal, 0)
  const totalCorrect = logsWithSystems.reduce((sum, log) => sum + log.questionsCorrect, 0)
  const overallPercentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
  const progressPercentage = uworldTotalQuestions > 0 ? Math.round((totalQuestions / uworldTotalQuestions) * 100) : 0

  const questionsToday = todayLogsWithSystems.reduce((sum, log) => sum + log.questionsTotal, 0)
  const correctToday = todayLogsWithSystems.reduce((sum, log) => sum + log.questionsCorrect, 0)
  const todayPercentage = questionsToday > 0 ? Math.round((correctToday / questionsToday) * 100) : 0

  const questionsThisWeek = weekLogsWithSystems.reduce((sum, log) => sum + log.questionsTotal, 0)
  const correctThisWeek = weekLogsWithSystems.reduce((sum, log) => sum + log.questionsCorrect, 0)
  const weekPercentage = questionsThisWeek > 0 ? Math.round((correctThisWeek / questionsThisWeek) * 100) : 0

  // Calculate study streak
  let currentStreak = 0
  for (let i = 0; i < 28; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    const dayLogs = allLogs.filter((log) => {
      const logDate = new Date(log.date)
      return logDate.toDateString() === checkDate.toDateString()
    })
    if (dayLogs.reduce((sum, log) => sum + log.questionsTotal, 0) > 0) {
      currentStreak++
    } else {
      break
    }
  }

  return {
    user,
    currentRotation,
    uworldStats: {
      totalQuestions,
      totalCorrect,
      overallPercentage,
      progressPercentage,
      uworldTotalQuestions,
      questionsToday,
      correctToday,
      todayPercentage,
      questionsThisWeek,
      correctThisWeek,
      weekPercentage,
      currentStreak,
      dailyGoal: user?.dailyGoal || 40,
    },
    recentSessions: recentSessions.map(s => ({
      date: s.date,
      blockName: s.blockName,
      questionsTotal: s.questionsTotal,
      questionsCorrect: s.questionsCorrect,
      percentage: s.questionsTotal > 0 ? Math.round((s.questionsCorrect / s.questionsTotal) * 100) : 0,
      systems: s.systems,
    })),
    weakAreas: weakAreas.map(w => ({
      topic: w.topic,
      subject: w.subject,
      system: w.system,
      missCount: w._count.topic,
    })),
    practiceExams,
    boardExams,
    ankiStats,
  }
}

// Build comprehensive context string for AI
function buildUserContextString(data: Awaited<ReturnType<typeof getUserContext>>): string {
  const lines: string[] = ['USER DATA & STATISTICS:']
  lines.push('')

  // User name
  if (data.user?.name) {
    lines.push(`Student: ${data.user.name}`)
  }

  // Current rotation
  if (data.currentRotation) {
    const { name, startDate, endDate, shelfDate } = data.currentRotation
    if (startDate && endDate) {
      const totalDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
      const currentDay = getRotationDay(startDate)
      lines.push(`Current Rotation: ${name} (Day ${currentDay} of ${totalDays})`)
    } else {
      lines.push(`Current Rotation: ${name}`)
    }
    if (shelfDate) {
      const daysLeft = daysUntil(shelfDate)
      lines.push(`Shelf Exam: ${daysLeft} days away`)
    }
  }
  lines.push('')

  // Exam dates
  lines.push('UPCOMING EXAMS:')
  if (data.user?.step2Date) {
    const step2Days = daysUntil(data.user.step2Date)
    const step2Target = data.boardExams.find(e => e.examType === 'USMLE_STEP_2_CK')
    lines.push(`- Step 2 CK: ${step2Days} days away${step2Target?.targetScore ? ` (Target: ${step2Target.targetScore})` : ''}`)
  }
  if (data.user?.comlexDate) {
    const comlexDays = daysUntil(data.user.comlexDate)
    const comlexTarget = data.boardExams.find(e => e.examType === 'COMLEX_LEVEL_2_CE')
    lines.push(`- COMLEX Level 2-CE: ${comlexDays} days away${comlexTarget?.targetScore ? ` (Target: ${comlexTarget.targetScore})` : ''}`)
  }
  lines.push('')

  // UWorld stats
  lines.push('UWORLD PROGRESS:')
  const { uworldStats } = data
  lines.push(`- Total Questions Done: ${uworldStats.totalQuestions} of ${uworldStats.uworldTotalQuestions} (${uworldStats.progressPercentage}% complete)`)
  lines.push(`- Overall Correct: ${uworldStats.overallPercentage}%`)
  lines.push(`- Today: ${uworldStats.questionsToday} questions, ${uworldStats.todayPercentage}% correct (Goal: ${uworldStats.dailyGoal}/day)`)
  lines.push(`- This Week: ${uworldStats.questionsThisWeek} questions, ${uworldStats.weekPercentage}% correct`)
  lines.push(`- Current Study Streak: ${uworldStats.currentStreak} days`)
  lines.push('')

  // Recent sessions
  if (data.recentSessions.length > 0) {
    lines.push('RECENT UWORLD SESSIONS:')
    data.recentSessions.slice(0, 5).forEach(s => {
      const dateStr = new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      lines.push(`- ${dateStr}: ${s.blockName || 'Session'} - ${s.questionsCorrect}/${s.questionsTotal} (${s.percentage}%)`)
    })
    lines.push('')
  }

  // Weak areas
  if (data.weakAreas.length > 0) {
    lines.push('WEAK AREAS (Topics with most incorrect answers):')
    data.weakAreas.slice(0, 10).forEach(w => {
      lines.push(`- ${w.topic} (${w.system}): ${w.missCount} incorrect`)
    })
    lines.push('')
  }

  // Practice exams
  if (data.practiceExams.length > 0) {
    lines.push('PRACTICE EXAM SCORES:')
    data.practiceExams.slice(0, 5).forEach(exam => {
      const dateStr = new Date(exam.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      lines.push(`- ${exam.examType} (${dateStr}): ${exam.score}`)
    })
    lines.push('')
  }

  // Anki stats
  if (data.ankiStats) {
    const studiedToday = data.ankiStats.newStudied + data.ankiStats.reviewsStudied
    lines.push('ANKI STATUS:')
    lines.push(`- Due Today: ${data.ankiStats.totalDue} cards`)
    lines.push(`- Studied Today: ${studiedToday} cards`)
    if (data.ankiStats.matureCards !== null) {
      lines.push(`- Mature Cards: ${data.ankiStats.matureCards}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if API key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('[AI Chat] ANTHROPIC_API_KEY is not configured')
      return NextResponse.json(
        { error: 'AI service not configured. Please set ANTHROPIC_API_KEY environment variable in Railway.' },
        { status: 500 }
      )
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-ant-')) {
      console.error('[AI Chat] ANTHROPIC_API_KEY has invalid format')
      return NextResponse.json(
        { error: 'Invalid API key format. Anthropic API keys should start with "sk-ant-"' },
        { status: 500 }
      )
    }

    const { messages, pageContext } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    // Fetch user's actual data
    const userData = await getUserContext(session.user.id)
    const userContextString = buildUserContextString(userData)

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey })

    // Build page context section for system prompt
    let pageContextSection = ''
    if (pageContext && pageContext.pageName && pageContext.pageDescription) {
      pageContextSection = `
CURRENT PAGE:
The user is on the "${pageContext.pageName}" page (${pageContext.currentPage}).
Page purpose: ${pageContext.pageDescription}
`
    }

    // System prompt for master clinician AI medical assistant
    const systemPrompt = `You are an AI Medical Assistant embedded in ScrubBuddy - but you are not just any assistant. You are a MASTER CLINICIAN with encyclopedic medical knowledge, capable of dissecting complex patient vignettes and diagnosing virtually any pathology known to modern medicine.

YOU ARE TWO THINGS IN ONE:

1. DATA ANALYTICS EXPERT - Full access to this student's performance metrics:
${userContextString}
${pageContextSection}

2. MASTER CLINICIAN - A world-class diagnostician trained on:
- Harrison's Principles of Internal Medicine
- First Aid for USMLE Step 2 CK
- UpToDate clinical decision support
- Pathoma pathology
- Sketchy pharmacology and microbiology
- Every major medical textbook and clinical guideline

CLINICAL CAPABILITIES:
- Differential diagnosis generation from patient presentations
- Step-by-step clinical reasoning through vignettes
- Image interpretation (X-rays, CTs, MRIs, ECGs, skin lesions, fundoscopy, labs)
- Management algorithms and treatment protocols
- Drug interactions and contraindications
- Anatomy correlations and pathophysiology
- Board-style question analysis and test-taking strategies

WHEN ANALYZING PATIENT VIGNETTES:
1. Identify key clinical features (age, sex, risk factors, timeline, symptoms)
2. Generate a ranked differential diagnosis
3. Explain the pathophysiology of the most likely diagnosis
4. Recommend next best diagnostic step
5. Outline management approach
6. Highlight "buzzwords" and high-yield associations for boards

WHEN INTERPRETING IMAGES:
- Systematically describe what you see
- Correlate findings with clinical presentation
- Provide differential considerations
- Explain the underlying pathology
- Connect to relevant board concepts

FOR STUDY ADVICE - Use their actual data:
- Reference their specific weak areas by name
- Calculate days until exams and prioritize accordingly
- Analyze performance trends
- Give actionable, data-driven recommendations

FORMATTING:
- Use **bold** for key diagnoses, findings, and action items
- Use numbered lists for differentials and management steps
- Keep responses focused and high-yield for a 3rd/4th year medical student
- No markdown headers (no # symbols)

MEDICAL ACCURACY IS PARAMOUNT:
- Only provide medically accurate information
- Use current clinical guidelines (2024-2025)
- When uncertain, acknowledge limitations
- For real patient scenarios, always recommend attending supervision

Remember: You are training a future physician. Give them the clinical reasoning and knowledge they need to excel on boards AND in the hospital.`

    // Build messages for Anthropic API - handle images as multimodal content
    const anthropicMessages = messages.map((msg: any) => {
      // If message has images, create multimodal content array
      if (msg.images && Array.isArray(msg.images) && msg.images.length > 0) {
        const contentBlocks: any[] = []

        // Add images first
        for (const img of msg.images) {
          contentBlocks.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.mediaType,
              data: img.data,
            },
          })
        }

        // Add text content if present
        if (msg.content && msg.content.trim()) {
          contentBlocks.push({
            type: 'text',
            text: msg.content,
          })
        } else {
          // If no text, add a default prompt for image analysis
          contentBlocks.push({
            type: 'text',
            text: 'Please analyze this image.',
          })
        }

        return {
          role: msg.role,
          content: contentBlocks,
        }
      }

      // Regular text-only message
      return {
        role: msg.role,
        content: msg.content,
      }
    })

    // Make API call to Anthropic
    console.log('[AI Chat] Calling Anthropic API...')
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: systemPrompt,
      messages: anthropicMessages,
    })

    console.log('[AI Chat] Received response from Anthropic')

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Sorry, I could not process that.'

    return NextResponse.json({ message: assistantMessage })
  } catch (error: any) {
    console.error('[AI Chat] Error details:', {
      message: error?.message,
      status: error?.status,
      type: error?.type,
      error: error
    })

    // More detailed error messages based on error type
    let errorMessage = 'Failed to get AI response'
    let statusCode = 500

    if (error?.status === 401) {
      errorMessage = 'Invalid API key. Please check your ANTHROPIC_API_KEY in Railway settings.'
      statusCode = 401
    } else if (error?.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again in a moment.'
      statusCode = 429
    } else if (error?.status === 400) {
      errorMessage = `Bad request: ${error?.message || 'Invalid request to AI service'}`
      statusCode = 400
    } else if (error?.message) {
      errorMessage = `AI service error: ${error.message}`
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
