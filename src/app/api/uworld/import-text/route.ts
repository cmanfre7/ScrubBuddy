import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface ParsedQuestion {
  questionId: string
  subject: string
  system: string
  category: string
  topic: string
  percentOthers: number
  timeSpent: number
}

// Parse UWorld table text into questions
function parseQuestions(text: string): ParsedQuestion[] {
  if (!text.trim()) return []

  const lines = text.trim().split('\n')
  const questions: ParsedQuestion[] = []

  for (const line of lines) {
    // Skip header row
    if (line.includes('SUBJECTS') || line.includes('SYSTEMS') || (line.includes('ID') && line.includes('TOPICS'))) {
      continue
    }

    // Split by tab
    const parts = line.split('\t').map((p: string) => p.trim())
    if (parts.length < 5) continue

    // First column is "row - QID" format like "1 - 118154"
    const idMatch = parts[0].match(/(\d+)\s*[-–]\s*(\d+)/)
    if (!idMatch) continue

    questions.push({
      questionId: idMatch[2],
      subject: parts[1] || 'Unknown',
      system: parts[2] || 'Unknown',
      category: parts[3] || 'Unknown',
      topic: parts[4] || 'Unknown',
      percentOthers: parseInt(parts[5]?.match(/(\d+)/)?.[1] || '0'),
      timeSpent: parseInt(parts[6]?.match(/(\d+)/)?.[1] || '0'),
    })
  }

  return questions
}

// POST - Import UWorld data from copy-pasted text (separate correct and incorrect)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { testName, correctText, incorrectText, shelfSubject } = body

    if (!testName) {
      return NextResponse.json({ error: 'testName is required' }, { status: 400 })
    }

    if (!correctText && !incorrectText) {
      return NextResponse.json({ error: 'At least one of correctText or incorrectText is required' }, { status: 400 })
    }

    const userId = session.user.id

    // Parse both correct and incorrect questions
    const correctQuestions = parseQuestions(correctText || '')
    const incorrectQuestions = parseQuestions(incorrectText || '')

    const totalCorrect = correctQuestions.length
    const totalIncorrect = incorrectQuestions.length
    const totalQuestions = totalCorrect + totalIncorrect

    console.log(`Parsed ${totalCorrect} correct, ${totalIncorrect} incorrect questions for ${testName}`)

    if (totalQuestions === 0) {
      return NextResponse.json(
        { error: 'No questions found in the pasted text. Make sure you copied the table data correctly.' },
        { status: 400 }
      )
    }

    const percentCorrect = Math.round((totalCorrect / totalQuestions) * 100)

    // Create or update UWorldLog - use shelfSubject as the primary subject for filtering
    let logId: string | null = null
    const existingLog = await prisma.uWorldLog.findFirst({
      where: { userId, blockName: testName },
    })

    if (existingLog) {
      await prisma.uWorldLog.update({
        where: { id: existingLog.id },
        data: {
          questionsTotal: totalQuestions,
          questionsCorrect: totalCorrect,
          // Store shelf subject as the primary system for filtering
          systems: shelfSubject ? [shelfSubject] : existingLog.systems,
        },
      })
      logId = existingLog.id
    } else {
      const allQuestions = [...correctQuestions, ...incorrectQuestions]
      const newLog = await prisma.uWorldLog.create({
        data: {
          userId,
          date: new Date(),
          questionsTotal: totalQuestions,
          questionsCorrect: totalCorrect,
          timeSpentMins: Math.round(allQuestions.reduce((sum, q) => sum + q.timeSpent, 0) / 60),
          mode: 'Test',
          blockName: testName,
          // Use shelf subject as primary - this is what determines which subject tab it shows under
          systems: shelfSubject ? [shelfSubject] : [],
          subjects: [...new Set(allQuestions.map(q => q.system))],
          notes: `Imported via text paste - ${totalCorrect} correct, ${totalIncorrect} incorrect`,
        },
      })
      logId = newLog.id
    }

    // Save all questions to UWorldQuestion
    let savedCount = 0

    // Save correct questions
    for (const q of correctQuestions) {
      try {
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
              isCorrect: true,
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
              isCorrect: true,
              testName,
            },
          })
        }
        savedCount++
      } catch (err) {
        console.error(`Failed to save correct question ${q.questionId}:`, err)
      }
    }

    // Save incorrect questions
    for (const q of incorrectQuestions) {
      try {
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
              isCorrect: false,
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
              isCorrect: false,
              testName,
            },
          })
        }

        // Also save to UWorldIncorrect for backward compatibility with weak areas
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

        savedCount++
      } catch (err) {
        console.error(`Failed to save incorrect question ${q.questionId}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        testName,
        questionsParsed: totalQuestions,
        questionsSaved: savedCount,
        totalQuestions,
        totalCorrect,
        totalIncorrect,
        percentCorrect,
        logId,
      },
    })
  } catch (error) {
    console.error('Error importing text data:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
