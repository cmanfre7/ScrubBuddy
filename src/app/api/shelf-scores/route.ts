import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shelfScores = await prisma.shelfScore.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(shelfScores)
  } catch (error) {
    console.error('Error fetching shelf scores:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    const shelfScore = await prisma.shelfScore.create({
      data: {
        userId: session.user.id,
        rotationName: data.rotationName,
        score: data.score,
        percentile: data.percentile || null,
        date: new Date(data.date),
        notes: data.notes || null,
      },
    })

    return NextResponse.json(shelfScore)
  } catch (error) {
    console.error('Error creating shelf score:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
