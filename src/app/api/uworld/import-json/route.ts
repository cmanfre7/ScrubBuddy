import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Interface for question data from UWorld page scrape
interface ScrapedQuestion {
  questionId: string
  isCorrect: boolean
  subject: string
  system: string
  category: string
  topic: string
  percentOthers: number
  timeSpent: number
}

interface ImportJsonBody {
  testName: string
  testId: string
  score: number
  questions: ScrapedQuestion[]
}

// POST - Import UWorld data from JSON (scraped from browser)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ImportJsonBody = await request.json()
    const { testName, testId, score, questions } = body

    if (!testName || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'testName and questions array are required' },
        { status: 400 }
      )
    }

    const userId = session.user.id

    // Calculate stats
    const totalQuestions = questions.length
    const correctQuestions = questions.filter(q => q.isCorrect)
    const incorrectQuestions = questions.filter(q => !q.isCorrect)
    const totalCorrect = correctQuestions.length
    const totalIncorrect = incorrectQuestions.length
    const percentCorrect = Math.round((totalCorrect / totalQuestions) * 100)

    // Extract unique subjects/systems for categorization
    const uniqueSubjects = [...new Set(questions.map(q => q.subject))]
    const uniqueSystems = [...new Set(questions.map(q => q.system))]

    console.log(`Importing test: ${testName}`)
    console.log(`Questions: ${totalQuestions}, Correct: ${totalCorrect}, Incorrect: ${totalIncorrect}`)
    console.log(`Subjects: ${uniqueSubjects.join(', ')}`)

    // Check for existing test record
    const existingTest = await prisma.uWorldTest.findFirst({
      where: { userId, testName },
    })

    if (existingTest) {
      // Update existing test
      await prisma.uWorldTestSubject.deleteMany({
        where: { testId: existingTest.id },
      })
      await prisma.uWorldTest.update({
        where: { id: existingTest.id },
        data: {
          totalCorrect,
          totalIncorrect,
          totalOmitted: 0,
          percentCorrect,
        },
      })
    } else {
      // Create new test record
      await prisma.uWorldTest.create({
        data: {
          userId,
          testName,
          testId: testId || testName,
          totalCorrect,
          totalIncorrect,
          totalOmitted: 0,
          percentCorrect,
        },
      })
    }

    // Always create a new UWorldLog - each session should be its own record
    // (Previously this would overwrite existing logs with the same blockName, causing data loss)
    await prisma.uWorldLog.create({
      data: {
        userId,
        date: new Date(),
        questionsTotal: totalQuestions,
        questionsCorrect: totalCorrect,
        timeSpentMins: Math.round(questions.reduce((sum, q) => sum + q.timeSpent, 0) / 60),
        mode: 'Test',
        blockName: testName,
        systems: uniqueSubjects,
        subjects: uniqueSystems,
        notes: `Imported via browser scrape - ${testId}`,
      },
    })

    // Save incorrect questions for weak areas
    let savedIncorrects = 0
    for (const q of incorrectQuestions) {
      try {
        const existing = await prisma.uWorldIncorrect.findFirst({
          where: { userId, questionId: q.questionId },
        })

        if (existing) {
          await prisma.uWorldIncorrect.update({
            where: { id: existing.id },
            data: {
              topic: q.topic,
              subject: q.subject,
              system: q.system,
              category: q.category,
              percentOthers: q.percentOthers,
              timeSpent: q.timeSpent,
              testName,
              status: 'needs_review',
            },
          })
        } else {
          await prisma.uWorldIncorrect.create({
            data: {
              userId,
              questionId: q.questionId,
              topic: q.topic,
              subject: q.subject,
              system: q.system,
              category: q.category,
              percentOthers: q.percentOthers,
              timeSpent: q.timeSpent,
              testName,
              status: 'needs_review',
            },
          })
        }
        savedIncorrects++
      } catch (err) {
        console.error(`Failed to save incorrect question ${q.questionId}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        testName,
        totalQuestions,
        totalCorrect,
        totalIncorrect,
        percentCorrect,
        incorrectsSaved: savedIncorrects,
        subjects: uniqueSubjects,
      },
    })
  } catch (error) {
    console.error('Error importing JSON data:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
