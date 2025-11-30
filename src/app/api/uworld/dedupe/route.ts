import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST - Remove duplicate UWorldLog entries (keep only the latest for each blockName)
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all logs for this user
    const allLogs = await prisma.uWorldLog.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'desc' },
    })

    // Group logs by blockName
    const logsByBlockName: Record<string, typeof allLogs> = {}
    const logsWithoutBlockName: typeof allLogs = []

    for (const log of allLogs) {
      if (log.blockName) {
        if (!logsByBlockName[log.blockName]) {
          logsByBlockName[log.blockName] = []
        }
        logsByBlockName[log.blockName].push(log)
      } else {
        logsWithoutBlockName.push(log)
      }
    }

    // Find duplicates (logs with same blockName)
    const duplicatesToDelete: string[] = []

    for (const [blockName, logs] of Object.entries(logsByBlockName)) {
      if (logs.length > 1) {
        // Keep the first one (most recent due to orderBy: desc), delete the rest
        console.log(`Found ${logs.length} logs for blockName "${blockName}", keeping latest`)
        for (let i = 1; i < logs.length; i++) {
          duplicatesToDelete.push(logs[i].id)
        }
      }
    }

    // Delete duplicates
    if (duplicatesToDelete.length > 0) {
      await prisma.uWorldLog.deleteMany({
        where: {
          id: { in: duplicatesToDelete },
        },
      })
    }

    // Calculate new stats after deduplication
    const remainingLogs = await prisma.uWorldLog.findMany({
      where: { userId: session.user.id },
    })

    const logsWithSystems = remainingLogs.filter(log => log.systems && log.systems.length > 0)
    const totalQuestions = logsWithSystems.reduce((sum, log) => sum + log.questionsTotal, 0)

    return NextResponse.json({
      success: true,
      duplicatesRemoved: duplicatesToDelete.length,
      totalLogsRemaining: remainingLogs.length,
      totalQuestionsAfterDedupe: totalQuestions,
      message: `Removed ${duplicatesToDelete.length} duplicate log entries`,
    })
  } catch (error) {
    console.error('Error deduplicating logs:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
