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

    // Calculate stats based on whether pasting incorrect only or all questions
    const pastedCount = questions.length
    let calcTotalQuestions = totalQuestions || 0
    let calcTotalCorrect = totalCorrect || 0

    if (isIncorrectOnly) {
      // If pasting incorrect only, calculate correct from total
      if (totalQuestions) {
        calcTotalCorrect = totalQuestions - pastedCount
      }
    } else {
      // If pasting all questions, total = pasted count
      // In this case, we don't know which are correct yet without more info
      // For now, assume all pasted questions are part of the test
      calcTotalQuestions = pastedCount
      calcTotalCorrect = 0 // Will be updated based on actual tracking
    }

    const percentCorrect = calcTotalQuestions > 0
      ? Math.round((calcTotalCorrect / calcTotalQuestions) * 100)
      : 0

    // Get unique subjects for categorization
    const uniqueSubjects = [...new Set(questions.map(q => q.subject))]

    console.log(`Test: ${testName}, Total: ${calcTotalQuestions}, Correct: ${calcTotalCorrect}, Pasted: ${pastedCount}`)

    // Check for existing UWorldLog with same test name
    let logId: string | null = null
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
      logId = existingLog.id
    } else if (calcTotalQuestions > 0 || !isIncorrectOnly) {
      const newLog = await prisma.uWorldLog.create({
        data: {
          userId,
          date: new Date(),
          questionsTotal: calcTotalQuestions || pastedCount,
          questionsCorrect: calcTotalCorrect,
          timeSpentMins: Math.round(questions.reduce((sum, q) => sum + q.timeSpent, 0) / 60),
          mode: 'Test',
          blockName: testName,
          systems: uniqueSubjects,
          subjects: [...new Set(questions.map(q => q.system))],
          notes: isIncorrectOnly
            ? `Imported via text paste - ${pastedCount} incorrect questions`
            : `Imported via text paste - ${pastedCount} questions`,
        },
      })
      logId = newLog.id
    }

    // Save questions to UWorldQuestion (new model for ALL questions)
    let savedCount = 0
    for (const q of questions) {
      try {
        // For UWorldQuestion - store all questions with isCorrect flag
        // When isIncorrectOnly is true, all pasted questions are incorrect
        const isCorrect = !isIncorrectOnly // If pasting all, we assume they're mixed (default to false for now)

        const existingQuestion = await prisma.uWorldQuestion.findFirst({
          where: { userId, questionId: q.questionId },
        })

        if (existingQuestion) {
          await prisma.uWorldQuestion.update({
            where: { id: existingQuestion.id },
            data: {
              logId,
              topic: q.topic,
              subject: q.subject,
              system: q.system,
              category: q.category,
              percentOthers: q.percentOthers,
              timeSpent: q.timeSpent,
              isCorrect: isIncorrectOnly ? false : existingQuestion.isCorrect, // Keep existing if not pasting incorrect only
              testName,
            },
          })
        } else {
          await prisma.uWorldQuestion.create({
            data: {
              userId,
              logId,
              questionId: q.questionId,
              topic: q.topic,
              subject: q.subject,
              system: q.system,
              category: q.category,
              percentOthers: q.percentOthers,
              timeSpent: q.timeSpent,
              isCorrect: isIncorrectOnly ? false : true, // If pasting all, default to correct (user can fix)
              testName,
            },
          })
        }

        // Also save to UWorldIncorrect for backward compatibility with weak areas feature
        if (isIncorrectOnly) {
          const existingIncorrect = await prisma.uWorldIncorrect.findFirst({
            where: { userId, questionId: q.questionId },
          })

          if (existingIncorrect) {
            await prisma.uWorldIncorrect.update({
              where: { id: existingIncorrect.id },
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
        totalQuestions: calcTotalQuestions || pastedCount,
        totalCorrect: calcTotalCorrect,
        percentCorrect,
        subjects: uniqueSubjects,
        topics: questions.map(q => q.topic),
        logId,
      },
    })
  } catch (error) {
    console.error('Error importing text data:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
