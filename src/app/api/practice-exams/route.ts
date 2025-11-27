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

    const { searchParams } = new URL(request.url)
    const examType = searchParams.get('examType') // NBME, UWSA, COMSAE

    const where: any = {
      userId: session.user.id,
    }

    if (examType) {
      where.examType = examType
    }

    const practiceExams = await prisma.practiceExam.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(practiceExams)
  } catch (error) {
    console.error('Error fetching practice exams:', error)
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
    const { examType, examName, score, percentCorrect, date, notes } = body

    if (!examType || !examName || !score) {
      return NextResponse.json(
        { error: 'Exam type, name, and score are required' },
        { status: 400 }
      )
    }

    const practiceExam = await prisma.practiceExam.create({
      data: {
        userId: session.user.id,
        examType,
        examName,
        score,
        percentCorrect,
        date: date ? new Date(date) : new Date(),
        notes,
      },
    })

    return NextResponse.json(practiceExam, { status: 201 })
  } catch (error) {
    console.error('Error creating practice exam:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
