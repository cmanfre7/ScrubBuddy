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

    const progress = await prisma.ankiProgress.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'desc' },
      take: 30,
    })

    return NextResponse.json({ progress })
  } catch (error) {
    console.error('Error fetching anki progress:', error)
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
    const { date, newCards, reviewCards, totalTime, deckName } = body

    const progressDate = new Date(date)
    progressDate.setHours(0, 0, 0, 0)

    // Upsert to allow updating existing entries for the same day
    const progress = await prisma.ankiProgress.upsert({
      where: {
        userId_date: {
          userId: session.user.id,
          date: progressDate,
        },
      },
      update: {
        newCards: newCards || 0,
        reviewCards: reviewCards || 0,
        totalTime: totalTime || null,
        deckName: deckName || null,
      },
      create: {
        userId: session.user.id,
        date: progressDate,
        newCards: newCards || 0,
        reviewCards: reviewCards || 0,
        totalTime: totalTime || null,
        deckName: deckName || null,
      },
    })

    return NextResponse.json({ progress }, { status: 201 })
  } catch (error) {
    console.error('Error logging anki progress:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
