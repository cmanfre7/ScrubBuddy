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

    const goal = await prisma.ankiGoal.findUnique({
      where: { userId: session.user.id },
    })

    return NextResponse.json({ goal })
  } catch (error) {
    console.error('Error fetching anki goal:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { totalCards, cardsCompleted, targetDate, dailyNewGoal, dailyReviewGoal } = body

    const goal = await prisma.ankiGoal.upsert({
      where: { userId: session.user.id },
      update: {
        totalCards: totalCards || 0,
        cardsCompleted: cardsCompleted || 0,
        targetDate: targetDate ? new Date(targetDate) : null,
        dailyNewGoal: dailyNewGoal || 30,
        dailyReviewGoal: dailyReviewGoal || 200,
      },
      create: {
        userId: session.user.id,
        totalCards: totalCards || 0,
        cardsCompleted: cardsCompleted || 0,
        targetDate: targetDate ? new Date(targetDate) : null,
        dailyNewGoal: dailyNewGoal || 30,
        dailyReviewGoal: dailyReviewGoal || 200,
      },
    })

    return NextResponse.json({ goal })
  } catch (error) {
    console.error('Error updating anki goal:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
