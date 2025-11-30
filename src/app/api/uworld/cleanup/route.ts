import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST - Delete specific UWorldLog entries by ID
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ids, deleteNoName } = body

    let deletedCount = 0

    // Delete specific IDs if provided
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const result = await prisma.uWorldLog.deleteMany({
        where: {
          id: { in: ids },
          userId: session.user.id, // Ensure user can only delete their own logs
        },
      })
      deletedCount += result.count
    }

    // Delete all logs without a blockName (NO NAME entries)
    if (deleteNoName) {
      const result = await prisma.uWorldLog.deleteMany({
        where: {
          userId: session.user.id,
          OR: [
            { blockName: null },
            { blockName: '' },
          ],
        },
      })
      deletedCount += result.count
    }

    // Get updated stats
    const remainingLogs = await prisma.uWorldLog.findMany({
      where: { userId: session.user.id },
    })

    const logsWithSystems = remainingLogs.filter(log => log.systems && log.systems.length > 0)
    const totalQuestions = logsWithSystems.reduce((sum, log) => sum + log.questionsTotal, 0)

    return NextResponse.json({
      success: true,
      deletedCount,
      totalLogsRemaining: remainingLogs.length,
      totalQuestionsAfterCleanup: totalQuestions,
    })
  } catch (error) {
    console.error('Error cleaning up logs:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
