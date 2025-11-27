import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const boardExams = await prisma.boardExam.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate daysUntilExam for each exam
    const examsWithDays = boardExams.map(exam => ({
      ...exam,
      daysUntilExam: exam.examDate
        ? Math.ceil((new Date(exam.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    }))

    return NextResponse.json(examsWithDays)
  } catch (error) {
    console.error('Error fetching board exams:', error)
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
    const { examType, targetScore, examDate, predictedScore, readinessPercent } = body

    if (!examType || !targetScore) {
      return NextResponse.json(
        { error: 'Exam type and target score are required' },
        { status: 400 }
      )
    }

    // Upsert (create or update) the board exam for this user and exam type
    const boardExam = await prisma.boardExam.upsert({
      where: {
        userId_examType: {
          userId: session.user.id,
          examType,
        },
      },
      update: {
        targetScore,
        examDate: examDate ? new Date(examDate) : null,
        predictedScore,
        readinessPercent,
        lastUpdated: new Date(),
      },
      create: {
        userId: session.user.id,
        examType,
        targetScore,
        examDate: examDate ? new Date(examDate) : null,
        predictedScore,
        readinessPercent,
      },
    })

    return NextResponse.json(boardExam, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating board exam:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
