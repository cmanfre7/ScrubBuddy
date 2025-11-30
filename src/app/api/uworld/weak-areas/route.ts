import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Get weak areas based on incorrect questions
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all incorrect questions for this user
    const incorrects = await prisma.uWorldIncorrect.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    // Group by topic and count
    const topicCounts: Record<string, { count: number; system: string | null; subject: string | null; avgPercentOthers: number }> = {}

    for (const q of incorrects) {
      const topic = q.topic
      if (!topicCounts[topic]) {
        topicCounts[topic] = {
          count: 0,
          system: q.system,
          subject: q.subject,
          avgPercentOthers: 0,
        }
      }
      topicCounts[topic].count++
      topicCounts[topic].avgPercentOthers += q.percentOthers || 0
    }

    // Calculate averages and sort by count
    const weakAreas = Object.entries(topicCounts)
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        system: data.system,
        subject: data.subject,
        avgPercentOthers: Math.round(data.avgPercentOthers / data.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 weak areas

    // Group by system for summary
    const systemCounts: Record<string, number> = {}
    for (const q of incorrects) {
      if (q.system) {
        systemCounts[q.system] = (systemCounts[q.system] || 0) + 1
      }
    }

    const weakSystems = Object.entries(systemCounts)
      .map(([system, count]) => ({ system, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Group by subject
    const subjectCounts: Record<string, number> = {}
    for (const q of incorrects) {
      if (q.subject) {
        subjectCounts[q.subject] = (subjectCounts[q.subject] || 0) + 1
      }
    }

    const weakSubjects = Object.entries(subjectCounts)
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count)

    // Get recent incorrects for review
    const recentIncorrects = incorrects.slice(0, 20).map(q => ({
      id: q.id,
      questionId: q.questionId,
      topic: q.topic,
      system: q.system,
      subject: q.subject,
      category: q.category,
      percentOthers: q.percentOthers,
      status: q.status,
      testName: q.testName,
      createdAt: q.createdAt,
    }))

    return NextResponse.json({
      weakAreas,
      weakSystems,
      weakSubjects,
      recentIncorrects,
      totalIncorrects: incorrects.length,
    })
  } catch (error) {
    console.error('Error fetching weak areas:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
