import { getCurrentUser } from '@/lib/session'
import prisma from '@/lib/prisma'
import { daysUntil, calculatePercentage } from '@/lib/utils'
import { UWORLD_QUESTION_TOTALS, SHELF_SUBJECTS, ShelfSubject } from '@/types'
import { CountdownWidget } from '@/components/dashboard-widgets/CountdownWidget'
import { UWorldProgressWidget } from '@/components/dashboard-widgets/UWorldProgressWidget'
import { GoalsWidget } from '@/components/dashboard-widgets/GoalsWidget'
import { WeekCalendarWidget } from '@/components/dashboard-widgets/WeekCalendarWidget'
import { QuickActionsWidget } from '@/components/dashboard-widgets/QuickActionsWidget'
import { WeakAreasWidget } from '@/components/dashboard-widgets/WeakAreasWidget'
import { PearlsWidget } from '@/components/dashboard-widgets/PearlsWidget'
import { StreakWidget } from '@/components/dashboard-widgets/StreakWidget'
import { TodayScheduleWidget } from '@/components/dashboard-widgets/TodayScheduleWidget'
import { ExamDateButtons } from '@/components/ExamDateButtons'
import { Calendar as CalendarIcon, Target, FileText, Stethoscope } from 'lucide-react'

async function getDashboardData(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)

  const [
    user,
    todayLogs,
    weekLogs,
    allLogs,
    allIncorrects,
    currentRotation,
    rotations,
    tasks,
    todayEvents,
    uworldSettings,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, step2Date: true, comlexDate: true, dailyGoal: true },
    }),
    prisma.uWorldLog.findMany({
      where: { userId, date: { gte: today } },
    }),
    prisma.uWorldLog.findMany({
      where: { userId, date: { gte: weekAgo } },
    }),
    prisma.uWorldLog.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    }),
    prisma.uWorldIncorrect.findMany({
      where: { userId },
      select: { topic: true, subject: true },
    }),
    prisma.rotation.findFirst({
      where: { userId, isCurrent: true },
    }),
    prisma.rotation.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' },
      select: { id: true, name: true, shelfDate: true },
    }),
    prisma.task.findMany({
      where: { userId, done: false },
      orderBy: { priority: 'desc' },
      take: 5,
      select: { id: true, text: true, done: true, category: true },
    }),
    prisma.calendarEvent.findMany({
      where: {
        userId,
        OR: [
          { startTime: { gte: today, lte: todayEnd } },
          { endTime: { gte: today, lte: todayEnd } },
          { AND: [{ startTime: { lte: today } }, { endTime: { gte: todayEnd } }] },
        ],
      },
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        location: true,
        eventType: true,
        isAllDay: true,
      },
    }),
    prisma.uWorldSettings.findMany({
      where: { userId },
    }),
  ])

  // Fetch pearls separately with error handling (table may not exist yet)
  let pearls: Array<{
    id: string
    content: string
    createdAt: Date
    rotation: { name: string } | null
  }> = []

  try {
    pearls = await prisma.clinicalPearl.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { rotation: { select: { name: true } } },
    })
  } catch (error) {
    // ClinicalPearl table doesn't exist yet - that's okay
    console.log('ClinicalPearl table not found, skipping pearls widget')
  }

  // Calculate UWorld stats - only count logs that have at least one system assigned
  // This excludes bulk imports with empty systems arrays that don't show under any subject
  const logsWithSystems = allLogs.filter(log => log.systems && log.systems.length > 0)
  const todayLogsWithSystems = todayLogs.filter(log => log.systems && log.systems.length > 0)
  const weekLogsWithSystems = weekLogs.filter(log => log.systems && log.systems.length > 0)

  const questionsToday = todayLogsWithSystems.reduce((sum, log) => sum + log.questionsTotal, 0)
  const correctToday = todayLogsWithSystems.reduce((sum, log) => sum + log.questionsCorrect, 0)
  const questionsThisWeek = weekLogsWithSystems.reduce((sum, log) => sum + log.questionsTotal, 0)
  const correctThisWeek = weekLogsWithSystems.reduce((sum, log) => sum + log.questionsCorrect, 0)
  const totalQuestions = logsWithSystems.reduce((sum, log) => sum + log.questionsTotal, 0)
  const totalCorrect = logsWithSystems.reduce((sum, log) => sum + log.questionsCorrect, 0)
  const uworldPercentage = calculatePercentage(totalCorrect, totalQuestions)

  // Calculate total UWorld questions available based on user's custom settings
  // Merge defaults with user's custom totals, then sum all subjects
  const settingsMap: Record<string, number> = {}
  uworldSettings.forEach((s) => {
    settingsMap[s.subject] = s.totalQuestions
  })
  const uworldTotalQuestions = SHELF_SUBJECTS.reduce((sum, subject) => {
    return sum + (settingsMap[subject] ?? UWORLD_QUESTION_TOTALS[subject])
  }, 0)

  // Calculate weak areas (topics with most incorrect answers)
  // Filter by current rotation's subject if one is set
  // Handle flexible matching: "General Surgery" rotation should match "Surgery" subject
  const rotationName = currentRotation?.name || null
  const incorrectsForSubject = rotationName
    ? allIncorrects.filter((inc) => {
        if (!inc.subject) return false
        // Check if rotation name contains subject or subject contains rotation name
        const rotationLower = rotationName.toLowerCase()
        const subjectLower = inc.subject.toLowerCase()
        return rotationLower.includes(subjectLower) || subjectLower.includes(rotationLower)
      })
    : allIncorrects

  // Group by topic and count
  const topicCounts: Record<string, number> = {}
  for (const inc of incorrectsForSubject) {
    topicCounts[inc.topic] = (topicCounts[inc.topic] || 0) + 1
  }

  const weakAreas = Object.entries(topicCounts)
    .map(([topic, count]) => {
      // Calculate a rough percentage based on incorrect count
      // Lower percentage means more incorrect (weaker area)
      // Assume max 20 questions per topic, so percentage = (20 - count) / 20 * 100
      const estimatedPercentage = Math.max(0, Math.round(((20 - count) / 20) * 100))
      return { name: topic, percentage: estimatedPercentage }
    })
    .filter((area) => area.percentage < 70)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 4)

  // Calculate study streak
  const last28Days = Array.from({ length: 28 }, (_, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() - (27 - i))
    const dayLogs = allLogs.filter((log) => {
      const logDate = new Date(log.date)
      return logDate.toDateString() === date.toDateString()
    })
    const dayQuestions = dayLogs.reduce((sum, log) => sum + log.questionsTotal, 0)
    // Map questions to intensity level (0-4)
    if (dayQuestions === 0) return 0
    if (dayQuestions < 20) return 1
    if (dayQuestions < 40) return 2
    if (dayQuestions < 60) return 3
    return 4
  })

  // Calculate current streak
  let currentStreak = 0
  for (let i = last28Days.length - 1; i >= 0; i--) {
    if (last28Days[i] > 0) {
      currentStreak++
    } else {
      break
    }
  }

  // Calculate this week's calendar
  const weekDays = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const isToday = i === 0
    const dayName = isToday
      ? 'TODAY'
      : date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })

    // Mock events - in a real app, fetch from calendar/events table
    const events: { type: 'clinical' | 'exam' | 'study' | 'off' | 'presentation'; label: string }[] = []

    if (
      currentRotation &&
      currentRotation.startDate &&
      currentRotation.endDate &&
      date >= new Date(currentRotation.startDate) &&
      date <= new Date(currentRotation.endDate)
    ) {
      events.push({ type: 'clinical', label: `${currentRotation.name}` })
    }

    return { dayName, isToday, events }
  })

  return {
    user,
    questionsToday,
    correctToday,
    questionsThisWeek,
    correctThisWeek,
    totalQuestions,
    totalCorrect,
    uworldPercentage,
    uworldTotalQuestions,
    currentRotation,
    rotations,
    tasks: tasks.map((t) => ({
      id: t.id,
      text: t.text,
      done: t.done,
      category: t.category || 'General'
    })),
    pearls: pearls.map((p) => ({
      id: p.id,
      content: p.content,
      rotationName: p.rotation?.name ?? null,
      createdAt: new Date(p.createdAt),
    })),
    todayEvents: todayEvents.map((e) => ({
      id: e.id,
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
      location: e.location || undefined,
      eventType: e.eventType,
      isAllDay: e.isAllDay,
    })),
    weakAreas,
    last28Days,
    currentStreak,
    weekDays,
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) return null

  let data
  try {
    data = await getDashboardData(user.id)
  } catch (error) {
    console.error('Dashboard data fetch error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorMessage)

    // Return a fallback UI if data fetching fails
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Unable to load dashboard</h1>
          <p className="text-slate-400 mb-2">Please try refreshing the page</p>
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-red-400 mt-4 max-w-md mx-auto">{errorMessage}</p>
          )}
        </div>
      </div>
    )
  }

  const daysUntilStep2 = data.user?.step2Date ? daysUntil(data.user.step2Date) : null
  const daysUntilComlex = data.user?.comlexDate ? daysUntil(data.user.comlexDate) : null

  // Calculate rotation progress
  const rotationTotalDays =
    data.currentRotation && data.currentRotation.endDate && data.currentRotation.startDate
      ? Math.ceil(
          (new Date(data.currentRotation.endDate).getTime() -
            new Date(data.currentRotation.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : 0
  const rotationCurrentDay =
    data.currentRotation && data.currentRotation.startDate
      ? Math.ceil(
          (new Date().getTime() - new Date(data.currentRotation.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : 0

  // Calculate shelf exam countdown - use current rotation's shelf date
  const daysUntilShelf = data.currentRotation?.shelfDate
    ? daysUntil(new Date(data.currentRotation.shelfDate))
    : null
  const shelfDateFormatted = data.currentRotation?.shelfDate
    ? new Date(data.currentRotation.shelfDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC', // Fix timezone issue - display date in UTC to match stored value
      })
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-slate-400 text-lg">
            {data.currentRotation ? (
              <>
                Currently on <span className="text-blue-400 font-semibold">{data.currentRotation.name}</span> ·
                Day {rotationCurrentDay} of {rotationTotalDays}
              </>
            ) : (
              'Set up your rotations to get started'
            )}
          </p>
        </div>
        <ExamDateButtons
          step2Date={data.user?.step2Date?.toISOString() || null}
          comlexDate={data.user?.comlexDate?.toISOString() || null}
          rotations={data.rotations.map((r) => ({
            id: r.id,
            name: r.name,
            shelfDate: r.shelfDate?.toISOString() || null,
          }))}
        />
      </div>

      {/* Countdown Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.currentRotation && (
          <CountdownWidget
            title="Current Rotation"
            icon={<Stethoscope size={16} />}
            iconBgColor="bg-red-900/40"
            currentDay={rotationCurrentDay}
            totalDays={rotationTotalDays}
            href="/dashboard/settings"
          />
        )}
        {daysUntilShelf !== null && data.currentRotation?.shelfDate && (
          <CountdownWidget
            title="Shelf Exam"
            icon={<FileText size={16} />}
            iconBgColor="bg-amber-900/40"
            daysLeft={daysUntilShelf}
            examDate={shelfDateFormatted || undefined}
            predicted="72-78"
            href="/dashboard/analytics?tab=shelf"
          />
        )}
        {daysUntilStep2 !== null && daysUntilStep2 > 0 && (
          <CountdownWidget
            title="Step 2 CK"
            icon={<Target size={16} />}
            iconBgColor="bg-blue-900/40"
            daysLeft={daysUntilStep2}
            examDate={
              data.user?.step2Date
                ? new Date(data.user.step2Date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : undefined
            }
            predicted="245"
            target="250"
            href="/dashboard/analytics"
          />
        )}
        {daysUntilComlex !== null && daysUntilComlex > 0 && (
          <CountdownWidget
            title="COMLEX Level 2"
            icon={<CalendarIcon size={16} />}
            iconBgColor="bg-green-900/40"
            daysLeft={daysUntilComlex}
            examDate={
              data.user?.comlexDate
                ? new Date(data.user.comlexDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : undefined
            }
            predicted="585"
            target="600"
            href="/dashboard/analytics"
          />
        )}
      </div>

      {/* UWorld + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UWorldProgressWidget
          percentage={
            data.totalQuestions > 0 && data.uworldTotalQuestions > 0
              ? Math.round((data.totalQuestions / data.uworldTotalQuestions) * 100)
              : 0
          }
          questionsDone={data.totalQuestions}
          totalQuestions={data.uworldTotalQuestions}
          overallCorrect={data.uworldPercentage}
          todayQuestions={data.questionsToday}
          todayCorrect={data.correctToday}
          weekQuestions={data.questionsThisWeek}
          weekCorrect={data.correctThisWeek}
        />
        <GoalsWidget initialGoals={data.tasks} />
      </div>

      {/* Today's Schedule */}
      <TodayScheduleWidget events={data.todayEvents} />

      {/* Week Calendar + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WeekCalendarWidget days={data.weekDays} />
        <QuickActionsWidget />
      </div>

      {/* Weak Areas + Recent Pearls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WeakAreasWidget weakAreas={data.weakAreas} />
        <PearlsWidget pearls={data.pearls} />
      </div>

      {/* Study Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StreakWidget currentStreak={data.currentStreak} last28Days={data.last28Days} />
      </div>
    </div>
  )
}
