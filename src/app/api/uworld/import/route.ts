import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle manual entry (JSON)
    const body = await request.json()
    const { totalCorrect, totalIncorrect, notes } = body

    if (totalCorrect === undefined || totalIncorrect === undefined) {
      return NextResponse.json(
        { error: 'totalCorrect and totalIncorrect are required' },
        { status: 400 }
      )
    }

    const totalQuestions = totalCorrect + totalIncorrect

    // Create a bulk import log entry
    const log = await prisma.uWorldLog.create({
      data: {
        userId: session.user.id,
        date: new Date(),
        questionsTotal: totalQuestions,
        questionsCorrect: totalCorrect,
        timeSpentMins: 0,
        mode: 'Bulk Import',
        blockName: 'Initial Progress',
        systems: [],
        subjects: [],
        notes: notes || 'Bulk import of existing UWorld progress',
      },
    })

    return NextResponse.json({
      success: true,
      log,
      stats: {
        totalCorrect,
        totalIncorrect,
        totalQuestions,
        percentage: Math.round((totalCorrect / totalQuestions) * 100),
      },
    })
  } catch (error) {
    console.error('Error importing UWorld data:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
