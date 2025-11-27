import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const logs = await prisma.uWorldLog.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'desc' },
    })

    // Calculate stats
    const totalQuestions = logs.reduce((sum, log) => sum + log.questionsTotal, 0)
    const totalCorrect = logs.reduce((sum, log) => sum + log.questionsCorrect, 0)
    const percentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

    // Group by system
    const systemStats: Record<string, { total: number; correct: number }> = {}
    logs.forEach((log) => {
      log.systems.forEach((system) => {
        if (!systemStats[system]) {
          systemStats[system] = { total: 0, correct: 0 }
        }
        systemStats[system].total += log.questionsTotal
        systemStats[system].correct += log.questionsCorrect
      })
    })

    return NextResponse.json({
      logs,
      stats: {
        totalQuestions,
        totalCorrect,
        percentage,
        systemStats,
      },
    })
  } catch (error) {
    console.error('Error fetching UWorld logs:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      date,
      questionsTotal,
      questionsCorrect,
      timeSpentMins,
      mode,
      blockName,
      systems,
      subjects,
      notes,
    } = body

    if (!questionsTotal || questionsCorrect === undefined) {
      return NextResponse.json(
        { error: 'Questions total and correct are required' },
        { status: 400 }
      )
    }

    const log = await prisma.uWorldLog.create({
      data: {
        userId: session.user.id,
        date: date ? new Date(date) : new Date(),
        questionsTotal,
        questionsCorrect,
        timeSpentMins,
        mode,
        blockName,
        systems: systems || [],
        subjects: subjects || [],
        notes,
      },
    })

    return NextResponse.json({ log }, { status: 201 })
  } catch (error) {
    console.error('Error creating UWorld log:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
