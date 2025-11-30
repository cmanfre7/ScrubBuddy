import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Interface for parsed question data
interface ParsedQuestion {
  isCorrect: boolean
  questionId: string
  subject: string
  system: string
  category: string
  topic: string
  percentOthers: number
  timeSpent: number
}

// Parse question-level data from Test Results tab
function parseQuestionRows(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []

  // Pattern to match question rows: × or ✓ followed by row number, questionId, and data
  // Example: × 1 - 104520 Surgery Hematology & Oncology Hemostasis and thrombosis Hypovolemic shock 37% 31 sec 99 sec
  // or: ✓ 5 - 103312 Surgery Gastrointestinal & Nutrition Intestinal and colorectal disorders Rectal prolapse 72% 34 sec 73 sec

  // Split text into lines and look for question rows
  const lines = text.split('\n')

  for (const line of lines) {
    // Match pattern: (×|✓) number - questionId ... percent% time sec avgtime sec
    const match = line.match(/^([×✓])\s*(\d+)\s*-\s*(\d+)\s+(.+?)\s+(\d+)%\s+(\d+)\s*sec\s+\d+\s*sec/)

    if (match) {
      const isCorrect = match[1] === '✓'
      const questionId = match[3]
      const middlePart = match[4].trim()
      const percentOthers = parseInt(match[5])
      const timeSpent = parseInt(match[6])

      // Parse the middle part: Subject System Category Topic
      // Known subjects: Surgery, Medicine, Psychiatry, Pediatrics, OBGYN
      // Systems often contain & (like "Hematology & Oncology", "Pulmonary & Critical Care")

      // Strategy: First word is usually Subject, last words are Topic, middle is System + Category
      const words = middlePart.split(/\s+/)

      if (words.length >= 4) {
        const subject = words[0]

        // Find where the system/category boundary might be
        // Common systems: "Hematology & Oncology", "Pulmonary & Critical Care", "Gastrointestinal & Nutrition", "Ophthalmology"
        let systemEndIndex = 1

        // Look for common system patterns
        for (let i = 1; i < words.length - 2; i++) {
          if (words[i] === '&' && i + 1 < words.length - 2) {
            systemEndIndex = i + 2 // Include the word after &
            break
          } else if (['Ophthalmology', 'Dermatology', 'Neurology', 'Cardiology', 'Immunology'].includes(words[i])) {
            systemEndIndex = i + 1
            break
          }
        }

        // If no & found, assume second word is system
        if (systemEndIndex === 1) {
          systemEndIndex = 2
        }

        const system = words.slice(1, systemEndIndex).join(' ')

        // Everything after system until the last 1-3 words is category + topic
        // Topic is usually the last 1-3 words
        const remaining = words.slice(systemEndIndex)

        // Heuristic: category is often longer, topic is shorter (1-3 words)
        // Look for natural breaks or just split roughly
        let categoryEndIndex = Math.max(1, remaining.length - 2)

        const category = remaining.slice(0, categoryEndIndex).join(' ')
        const topic = remaining.slice(categoryEndIndex).join(' ')

        questions.push({
          isCorrect,
          questionId,
          subject,
          system,
          category: category || topic, // fallback if parsing is off
          topic: topic || category,
          percentOthers,
          timeSpent
        })
      }
    }
  }

  console.log(`Parsed ${questions.length} question rows from PDF`)
  return questions
}

// Helper function to parse test performance PDFs with subject breakdown
async function handleTestPdf(userId: string, text: string, notes?: string) {
  try {
    // Extract test name - try multiple patterns
    let testName = 'Unknown Test'

    // Try "Test Name: X" pattern first
    const testNameMatch = text.match(/Test\s*Name\s*[:.]?\s*(\d+)/i)
    if (testNameMatch) {
      testName = `Test ${testNameMatch[1]}`
    }

    // Also try CustomTestId pattern
    const testIdMatch = text.match(/Custom\s*Test\s*Id\s*[:.]?\s*(\d+)/i)
    if (testIdMatch && testName === 'Unknown Test') {
      testName = testIdMatch[1]
    }

    // Parse question-level data for incorrect tracking
    const parsedQuestions = parseQuestionRows(text)
    const incorrectQuestions = parsedQuestions.filter(q => !q.isCorrect)

    console.log(`Found ${incorrectQuestions.length} incorrect questions to save`)

    // Calculate stats from parsed questions if available, otherwise use regex
    let totalCorrect: number
    let totalIncorrect: number
    let totalOmitted = 0

    if (parsedQuestions.length > 0) {
      totalCorrect = parsedQuestions.filter(q => q.isCorrect).length
      totalIncorrect = parsedQuestions.filter(q => !q.isCorrect).length
    } else {
      // Fallback to regex extraction
      const correctMatch = text.match(/Total Correct\s+(\d+)/i)
      const incorrectMatch = text.match(/Total Incorrect\s+(\d+)/i)
      const omittedMatch = text.match(/Total Omitted\s+(\d+)/i)

      if (!correctMatch || !incorrectMatch) {
        return NextResponse.json(
          { error: 'Could not extract test stats from PDF.' },
          { status: 400 }
        )
      }

      totalCorrect = parseInt(correctMatch[1])
      totalIncorrect = parseInt(incorrectMatch[1])
      totalOmitted = omittedMatch ? parseInt(omittedMatch[1]) : 0
    }

    const totalQuestions = totalCorrect + totalIncorrect + totalOmitted
    const percentCorrect = Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100)

    console.log('Extracted test stats:', { testName, totalCorrect, totalIncorrect, percentCorrect })

    // Extract subject breakdown
    // Pattern: Medicine  2  2 (100%)  0 (0%)  0 (0%)
    // or: Pregnancy, Childbirth & Puerperium  19  12 (63%)  7 (37%)  0 (0%)
    const subjectRegex = /^([A-Za-z,\s&-]+?)\s+(\d+)\s+(\d+)\s+\((\d+)%\)\s+(\d+)\s+\((\d+)%\)\s+(\d+)\s+\((\d+)%\)/gm

    const subjects: Array<{
      name: string
      category: string
      total: number
      correct: number
      incorrect: number
      omitted: number
      percent: number
    }> = []

    // Find the "Subjects" section in the PDF
    const subjectsSection = text.match(/Subjects\s+([\s\S]+?)(?:Systems|Answer Changes|$)/i)
    if (subjectsSection) {
      const subjectsText = subjectsSection[1]
      let match

      while ((match = subjectRegex.exec(subjectsText)) !== null) {
        const subjectName = match[1].trim()
        const total = parseInt(match[2])
        const correct = parseInt(match[3])
        const correctPercent = parseInt(match[4])
        const incorrect = parseInt(match[5])
        const omitted = parseInt(match[7])

        // Determine category based on context (Medicine, OBGYN, Surgery, etc.)
        // We'll look for the category in the previous lines or default to first word
        let category = 'Medicine' // default
        if (subjectName.includes('OBGYN') || subjectName.includes('Reproductive') || subjectName.includes('Pregnancy')) {
          category = 'OBGYN'
        } else if (subjectName.includes('Surgery')) {
          category = 'Surgery'
        } else if (subjectName.includes('Pediatrics')) {
          category = 'Pediatrics'
        } else if (subjectName.includes('Psychiatry')) {
          category = 'Psychiatry'
        }

        // Skip the category headers themselves (like "Medicine" or "OBGYN" with large totals)
        // Only add if it's a specific subject/system
        if (subjectName !== 'Medicine' && subjectName !== 'OBGYN' && subjectName !== 'Surgery') {
          subjects.push({
            name: subjectName,
            category,
            total,
            correct,
            incorrect,
            omitted,
            percent: correctPercent
          })
        }
      }
    }

    console.log(`Extracted ${subjects.length} subjects:`, subjects.map(s => s.name))

    // Check for existing test record to prevent duplicates
    const existingTest = await prisma.uWorldTest.findFirst({
      where: {
        userId,
        testName,
      },
      include: { subjects: true },
    })

    let test
    if (existingTest) {
      // Update existing test record
      console.log(`Updating existing UWorldTest: ${testName}`)
      // Delete old subjects and recreate
      await prisma.uWorldTestSubject.deleteMany({
        where: { testId: existingTest.id },
      })
      test = await prisma.uWorldTest.update({
        where: { id: existingTest.id },
        data: {
          totalCorrect,
          totalIncorrect,
          totalOmitted,
          percentCorrect,
          notes,
          subjects: {
            create: subjects.map(s => ({
              subjectName: s.name,
              category: s.category,
              totalQuestions: s.total,
              correct: s.correct,
              incorrect: s.incorrect,
              omitted: s.omitted,
              percentCorrect: s.percent
            }))
          }
        },
        include: { subjects: true },
      })
    } else {
      // Create new test record with subjects
      test = await prisma.uWorldTest.create({
        data: {
          userId,
          testName,
          testId: testName, // Use testName as testId for now
          totalCorrect,
          totalIncorrect,
          totalOmitted,
          percentCorrect,
          notes,
          subjects: {
            create: subjects.map(s => ({
              subjectName: s.name,
              category: s.category,
              totalQuestions: s.total,
              correct: s.correct,
              incorrect: s.incorrect,
              omitted: s.omitted,
              percentCorrect: s.percent
            }))
          }
        },
        include: {
          subjects: true
        }
      })
    }

    // Also create a UWorldLog entry so stats show up on the main page
    // Determine the primary system/subject from parsed questions first, then fall back to test name
    const systemsFromQuestions: string[] = []

    // Extract unique subjects from parsed questions (this is the most reliable source)
    if (parsedQuestions.length > 0) {
      const uniqueSubjects = new Set(parsedQuestions.map(q => q.subject))
      systemsFromQuestions.push(...Array.from(uniqueSubjects))
      console.log('Systems from parsed questions:', systemsFromQuestions)
    }

    // If no systems from questions, fall back to test name
    if (systemsFromQuestions.length === 0) {
      const testNameLower = testName.toLowerCase()
      if (testNameLower.includes('obgyn') || testNameLower.includes('ob/gyn') || testNameLower.includes('obstetrics')) {
        systemsFromQuestions.push('OBGYN')
      }
      if (testNameLower.includes('medicine') || testNameLower.includes('internal')) {
        systemsFromQuestions.push('Medicine')
      }
      if (testNameLower.includes('surgery')) {
        systemsFromQuestions.push('Surgery')
      }
      if (testNameLower.includes('pediatrics') || testNameLower.includes('peds')) {
        systemsFromQuestions.push('Pediatrics')
      }
      if (testNameLower.includes('psychiatry') || testNameLower.includes('psych')) {
        systemsFromQuestions.push('Psychiatry')
      }
      if (testNameLower.includes('family') || testNameLower.includes('ambulatory')) {
        systemsFromQuestions.push('Family Medicine')
      }
      if (testNameLower.includes('neuro')) {
        systemsFromQuestions.push('Neurology')
      }
      // Default to Medicine if no match
      if (systemsFromQuestions.length === 0) {
        systemsFromQuestions.push('Medicine')
      }
    }

    // Check for existing UWorldLog with the same test name to prevent duplicates
    const existingLog = await prisma.uWorldLog.findFirst({
      where: {
        userId,
        blockName: testName,
      },
    })

    if (existingLog) {
      // Update existing log instead of creating duplicate
      console.log(`Updating existing UWorldLog for test: ${testName}`)
      await prisma.uWorldLog.update({
        where: { id: existingLog.id },
        data: {
          questionsTotal: totalQuestions,
          questionsCorrect: totalCorrect,
          systems: systemsFromQuestions,
          subjects: subjects.map(s => s.name),
          notes: notes || `Imported from test: ${testName}`,
        },
      })
    } else {
      // Create new log entry
      await prisma.uWorldLog.create({
        data: {
          userId,
          date: new Date(),
          questionsTotal: totalQuestions,
          questionsCorrect: totalCorrect,
          timeSpentMins: 0,
          mode: 'Test',
          blockName: testName,
          systems: systemsFromQuestions,
          subjects: subjects.map(s => s.name),
          notes: notes || `Imported from test: ${testName}`,
        },
      })
    }

    // Save incorrect questions for weak areas tracking
    let savedIncorrects = 0
    if (incorrectQuestions.length > 0) {
      for (const q of incorrectQuestions) {
        try {
          // Check if question already exists
          const existing = await prisma.uWorldIncorrect.findFirst({
            where: {
              userId,
              questionId: q.questionId
            }
          })

          if (existing) {
            // Update existing record
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
              }
            })
          } else {
            // Create new record
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
              }
            })
          }
          savedIncorrects++
        } catch (err) {
          console.error(`Failed to save incorrect question ${q.questionId}:`, err)
        }
      }
      console.log(`Saved ${savedIncorrects} incorrect questions for weak areas`)
    }

    return NextResponse.json({
      success: true,
      type: 'test',
      test,
      stats: {
        testName,
        totalCorrect,
        totalIncorrect,
        totalQuestions,
        percentCorrect,
        subjectsCount: subjects.length,
        incorrectsSaved: savedIncorrects
      }
    })
  } catch (error) {
    console.error('Error handling test PDF:', error)
    return NextResponse.json(
      { error: `Failed to parse test PDF: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') || ''

    let totalCorrect: number
    let totalIncorrect: number
    let notes: string | undefined

    // Handle PDF upload (FormData)
    if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        notes = (formData.get('notes') as string) || undefined

        if (!file) {
          return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        console.log('Processing PDF:', file.name, 'Size:', file.size)

        // Convert File to ArrayBuffer for unpdf
        const arrayBuffer = await file.arrayBuffer()

        // Create a Buffer copy immediately before any processing
        // This prevents "detached ArrayBuffer" errors when unpdf transfers the buffer
        const bufferCopy = Buffer.from(new Uint8Array(arrayBuffer))

        // Parse PDF using unpdf first, fallback to pdf-parse if text extraction fails
        let text = ''

        // Try unpdf first (serverless-friendly)
        console.log('Parsing PDF with unpdf...')
        try {
          const { extractText } = await import('unpdf')
          const result = await extractText(arrayBuffer)
          text = Array.isArray(result.text) ? result.text.join('\n') : result.text
          console.log('unpdf extracted text length:', text.length)
        } catch (unpdfError) {
          console.log('unpdf failed:', unpdfError)
        }

        // If unpdf didn't extract enough text, try pdf-parse as fallback
        if (text.length < 50) {
          console.log('unpdf extracted insufficient text, trying pdf-parse fallback...')
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const pdfParse = require('pdf-parse')
            // Use the pre-copied buffer to avoid detached ArrayBuffer issues
            const pdfData = await pdfParse(bufferCopy)
            text = pdfData.text
            console.log('pdf-parse extracted text length:', text.length)
          } catch (pdfParseError) {
            console.log('pdf-parse also failed:', pdfParseError)
          }
        }

        console.log('PDF parsed successfully. Text length:', text.length)

        // Check if this is a test performance PDF
        // Detect by: "Custom Test Id", "TestId", or presence of question rows (× or ✓ patterns)
        const hasCustomTestId = text.match(/Custom\s*Test\s*Id\s*[:.]?\s*\d+/i)
        const hasTestId = text.match(/TestId\s*:\s*(.+)/i)
        const hasQuestionRows = text.match(/[×✓]\s*\d+\s*-\s*\d+/)
        const hasTestName = text.match(/Test\s*Name\s*[:.]?\s*\d+/i)

        const isTestPdf = hasCustomTestId || hasTestId || hasQuestionRows || hasTestName

        console.log('PDF Detection:', { hasCustomTestId: !!hasCustomTestId, hasTestId: !!hasTestId, hasQuestionRows: !!hasQuestionRows, hasTestName: !!hasTestName })

        if (isTestPdf) {
          // This is a TEST PERFORMANCE PDF with question-level data
          console.log('Detected: Test Performance PDF')
          return await handleTestPdf(session.user.id, text, notes)
        } else {
          // This is an OVERALL PERFORMANCE PDF (cumulative stats)
          console.log('Detected: Overall Performance PDF')

          const correctMatch = text.match(/Total Correct\s+(\d+)/i)
          const incorrectMatch = text.match(/Total Incorrect\s+(\d+)/i)

          console.log('Regex matches:', { correctMatch: correctMatch?.[1], incorrectMatch: incorrectMatch?.[1] })

          if (!correctMatch || !incorrectMatch) {
            console.error('Failed to extract stats. PDF text sample:', text.substring(0, 500))
            return NextResponse.json(
              { error: 'Could not extract stats from PDF. Please ensure it contains "Total Correct" and "Total Incorrect" fields.' },
              { status: 400 }
            )
          }

          totalCorrect = parseInt(correctMatch[1])
          totalIncorrect = parseInt(incorrectMatch[1])
          console.log('Extracted stats:', { totalCorrect, totalIncorrect })
        }
      } catch (pdfError) {
        console.error('PDF processing error:', pdfError)
        return NextResponse.json(
          { error: `PDF processing failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}` },
          { status: 500 }
        )
      }
    }
    // Handle manual entry (JSON)
    else {
      const body = await request.json()
      totalCorrect = body.totalCorrect
      totalIncorrect = body.totalIncorrect
      notes = body.notes

      if (totalCorrect === undefined || totalIncorrect === undefined) {
        return NextResponse.json(
          { error: 'totalCorrect and totalIncorrect are required' },
          { status: 400 }
        )
      }
    }

    const totalQuestions = totalCorrect + totalIncorrect

    // Create a bulk import log entry
    const log = await prisma.uWorldLog.create({
      data: {
        userId: session.user.id,
        date: new Date(),
        questionsTotal: totalQuestions,
        questionsCorrect: totalCorrect,
        timeSpentMins: 0,
        mode: 'Bulk Import',
        blockName: 'Initial Progress',
        systems: [],
        subjects: [],
        notes: notes || 'Bulk import of existing UWorld progress',
      },
    })

    return NextResponse.json({
      success: true,
      type: 'overall',
      log,
      stats: {
        totalCorrect,
        totalIncorrect,
        totalQuestions,
        percentage: Math.round((totalCorrect / totalQuestions) * 100),
      },
    })
  } catch (error) {
    console.error('Error importing UWorld data:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
