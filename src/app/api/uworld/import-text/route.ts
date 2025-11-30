import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST - Import UWorld data from copy-pasted text
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { testName, text, totalQuestions, totalCorrect, isIncorrectOnly } = body

    if (!testName || !text) {
      return NextResponse.json(
        { error: 'testName and text are required' },
        { status: 400 }
      )
    }

    const userId = session.user.id

    // Parse the pasted text
    const lines = text.trim().split('\n')
    const questions: Array<{
      questionId: string
      subject: string
      system: string
      category: string
      topic: string
      percentOthers: number
      timeSpent: number
    }> = []

    for (const line of lines) {
      // Skip header row
      if (line.includes('SUBJECTS') || line.includes('SYSTEMS') || line.includes('ID') && line.includes('TOPICS')) {
        continue
      }

      // Split by tab
      const parts = line.split('\t').map((p: string) => p.trim())

      if (parts.length < 5) continue

      // First column is "row - QID" format like "1 - 118154"
      const idMatch = parts[0].match(/(\d+)\s*[-–]\s*(\d+)/)
      if (!idMatch) continue

      const questionId = idMatch[2]
      const subject = parts[1] || 'Unknown'
      const system = parts[2] || 'Unknown'
      const category = parts[3] || 'Unknown'
      const topic = parts[4] || 'Unknown'

      // Parse percentage (remove % sign)
      const percentMatch = parts[5]?.match(/(\d+)/)
      const percentOthers = percentMatch ? parseInt(percentMatch[1]) : 0

      // Parse time spent (remove "sec")
      const timeMatch = parts[6]?.match(/(\d+)/)
      const timeSpent = timeMatch ? parseInt(timeMatch[1]) : 0

      questions.push({
        questionId,
        subject,
        system,
        category,
        topic,
        percentOthers,
        timeSpent,
      })
    }

    console.log(`Parsed ${questions.length} questions from text`)

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions found in the pasted text. Make sure you copied the table data correctly.' },
        { status: 400 }
      )
    }

    // Calculate stats
    const incorrectCount = questions.length
    let calcTotalQuestions = totalQuestions || 0
    let calcTotalCorrect = totalCorrect || 0

    // If only incorrect questions were pasted, calculate correct count
    if (isIncorrectOnly && totalQuestions) {
      calcTotalCorrect = totalQuestions - incorrectCount
    }

    const percentCorrect = calcTotalQuestions > 0
      ? Math.round((calcTotalCorrect / calcTotalQuestions) * 100)
      : 0

    // Get unique subjects for categorization
    const uniqueSubjects = [...new Set(questions.map(q => q.subject))]

    console.log(`Test: ${testName}, Total: ${calcTotalQuestions}, Correct: ${calcTotalCorrect}, Incorrect: ${incorrectCount}`)

    // Check for existing UWorldLog with same test name
    const existingLog = await prisma.uWorldLog.findFirst({
      where: { userId, blockName: testName },
    })

    if (existingLog) {
      await prisma.uWorldLog.update({
        where: { id: existingLog.id },
        data: {
          questionsTotal: calcTotalQuestions || existingLog.questionsTotal,
          questionsCorrect: calcTotalCorrect || existingLog.questionsCorrect,
          systems: uniqueSubjects,
        },
      })
    } else if (calcTotalQuestions > 0) {
      await prisma.uWorldLog.create({
        data: {
          userId,
          date: new Date(),
          questionsTotal: calcTotalQuestions,
          questionsCorrect: calcTotalCorrect,
          timeSpentMins: Math.round(questions.reduce((sum, q) => sum + q.timeSpent, 0) / 60),
          mode: 'Test',
          blockName: testName,
          systems: uniqueSubjects,
          subjects: [...new Set(questions.map(q => q.system))],
          notes: `Imported via text paste - ${incorrectCount} incorrect questions`,
        },
      })
    }

    // Save incorrect questions
    let savedCount = 0
    for (const q of questions) {
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
        savedCount++
      } catch (err) {
        console.error(`Failed to save question ${q.questionId}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        testName,
        questionsParsed: questions.length,
        questionsSaved: savedCount,
        totalQuestions: calcTotalQuestions,
        totalCorrect: calcTotalCorrect,
        percentCorrect,
        subjects: uniqueSubjects,
        topics: questions.map(q => q.topic),
      },
    })
  } catch (error) {
    console.error('Error importing text data:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
