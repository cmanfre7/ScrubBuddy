import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Debug endpoint to see all UWorld logs and identify issues
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    // Get all logs
    const allLogs = await prisma.uWorldLog.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'desc' },
    })

    // Categorize logs
    const logsWithSystems = allLogs.filter(log => log.systems && log.systems.length > 0)
    const logsWithoutSystems = allLogs.filter(log => !log.systems || log.systems.length === 0)

    // Week logs
    const weekLogs = allLogs.filter(log => new Date(log.date) >= weekAgo)
    const weekLogsWithSystems = weekLogs.filter(log => log.systems && log.systems.length > 0)

    // Today logs
    const todayLogs = allLogs.filter(log => new Date(log.date) >= today)
    const todayLogsWithSystems = todayLogs.filter(log => log.systems && log.systems.length > 0)

    // Calculate totals
    const totalQuestions = logsWithSystems.reduce((sum, log) => sum + log.questionsTotal, 0)
    const weekQuestions = weekLogsWithSystems.reduce((sum, log) => sum + log.questionsTotal, 0)
    const todayQuestions = todayLogsWithSystems.reduce((sum, log) => sum + log.questionsTotal, 0)

    return NextResponse.json({
      serverTime: new Date().toISOString(),
      serverToday: today.toISOString(),
      serverWeekAgo: weekAgo.toISOString(),
      summary: {
        totalLogs: allLogs.length,
        logsWithSystems: logsWithSystems.length,
        logsWithoutSystems: logsWithoutSystems.length,
        totalQuestions,
        weekLogs: weekLogsWithSystems.length,
        weekQuestions,
        todayLogs: todayLogsWithSystems.length,
        todayQuestions,
      },
      // Show all logs that contribute to "This Week" stats
      weekLogsDetail: weekLogsWithSystems.map(log => ({
        id: log.id,
        date: log.date,
        blockName: log.blockName,
        questionsTotal: log.questionsTotal,
        questionsCorrect: log.questionsCorrect,
        systems: log.systems,
        mode: log.mode,
      })),
      // Show logs without systems (excluded from stats)
      excludedLogs: logsWithoutSystems.map(log => ({
        id: log.id,
        date: log.date,
        blockName: log.blockName,
        questionsTotal: log.questionsTotal,
        mode: log.mode,
        reason: 'No systems array',
      })),
    })
  } catch (error) {
    console.error('Error in debug endpoint:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
