import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Get a single UWorld log entry with optional questions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const includeQuestions = searchParams.get('includeQuestions') === 'true'

    // Use separate queries to allow proper TypeScript inference
    if (includeQuestions) {
      const log = await prisma.uWorldLog.findFirst({
        where: {
          id,
          userId: session.user.id,
        },
        include: {
          questions: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      if (!log) {
        return NextResponse.json({ error: 'Log not found' }, { status: 404 })
      }

      // Compute summary stats from questions
      const questions = log.questions
      const subjectCounts: Record<string, { total: number; correct: number }> = {}
      const systemCounts: Record<string, { total: number; correct: number }> = {}
      const categoryCounts: Record<string, { total: number; correct: number }> = {}
      const topicCounts: Record<string, { total: number; correct: number }> = {}

      for (const q of questions) {
        // Subject breakdown
        if (!subjectCounts[q.subject]) {
          subjectCounts[q.subject] = { total: 0, correct: 0 }
        }
        subjectCounts[q.subject].total++
        if (q.isCorrect) subjectCounts[q.subject].correct++

        // System breakdown
        if (!systemCounts[q.system]) {
          systemCounts[q.system] = { total: 0, correct: 0 }
        }
        systemCounts[q.system].total++
        if (q.isCorrect) systemCounts[q.system].correct++

        // Category breakdown
        if (!categoryCounts[q.category]) {
          categoryCounts[q.category] = { total: 0, correct: 0 }
        }
        categoryCounts[q.category].total++
        if (q.isCorrect) categoryCounts[q.category].correct++

        // Topic breakdown
        if (!topicCounts[q.topic]) {
          topicCounts[q.topic] = { total: 0, correct: 0 }
        }
        topicCounts[q.topic].total++
        if (q.isCorrect) topicCounts[q.topic].correct++
      }

      return NextResponse.json({
        ...log,
        breakdown: {
          bySubject: Object.entries(subjectCounts).map(([name, data]) => ({
            name,
            total: data.total,
            correct: data.correct,
            incorrect: data.total - data.correct,
            percentage: Math.round((data.correct / data.total) * 100),
          })).sort((a, b) => b.total - a.total),
          bySystem: Object.entries(systemCounts).map(([name, data]) => ({
            name,
            total: data.total,
            correct: data.correct,
            incorrect: data.total - data.correct,
            percentage: Math.round((data.correct / data.total) * 100),
          })).sort((a, b) => b.total - a.total),
          byCategory: Object.entries(categoryCounts).map(([name, data]) => ({
            name,
            total: data.total,
            correct: data.correct,
            incorrect: data.total - data.correct,
            percentage: Math.round((data.correct / data.total) * 100),
          })).sort((a, b) => b.total - a.total),
          byTopic: Object.entries(topicCounts).map(([name, data]) => ({
            name,
            total: data.total,
            correct: data.correct,
            incorrect: data.total - data.correct,
            percentage: Math.round((data.correct / data.total) * 100),
          })).sort((a, b) => b.total - a.total),
        },
      })
    }

    // Without questions - simple query
    const log = await prisma.uWorldLog.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!log) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    }

    return NextResponse.json(log)
  } catch (error) {
    console.error('Error fetching UWorld log:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PATCH - Update a UWorld log entry
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify ownership
    const existing = await prisma.uWorldLog.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    }

    // Build update data - only include fields that were provided
    const updateData: Record<string, unknown> = {}

    if (body.date !== undefined) {
      updateData.date = new Date(body.date)
    }
    if (body.questionsTotal !== undefined) {
      updateData.questionsTotal = body.questionsTotal
    }
    if (body.questionsCorrect !== undefined) {
      updateData.questionsCorrect = body.questionsCorrect
    }
    if (body.timeSpentMins !== undefined) {
      updateData.timeSpentMins = body.timeSpentMins
    }
    if (body.mode !== undefined) {
      updateData.mode = body.mode
    }
    if (body.blockName !== undefined) {
      updateData.blockName = body.blockName
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }

    const log = await prisma.uWorldLog.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(log)
  } catch (error) {
    console.error('Error updating UWorld log:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE - Delete a UWorld log entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const existing = await prisma.uWorldLog.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    }

    await prisma.uWorldLog.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting UWorld log:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
