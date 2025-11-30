import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Helper function to parse test performance PDFs with subject breakdown
async function handleTestPdf(userId: string, text: string, notes?: string) {
  try {
    // Extract test name and ID
    const testIdMatch = text.match(/TestId\s*:\s*(.+)/i)
    const testName = testIdMatch ? testIdMatch[1].trim() : 'Unknown Test'

    // Extract overall stats
    const correctMatch = text.match(/Total Correct\s+(\d+)/i)
    const incorrectMatch = text.match(/Total Incorrect\s+(\d+)/i)
    const omittedMatch = text.match(/Total Omitted\s+(\d+)/i)

    if (!correctMatch || !incorrectMatch) {
      return NextResponse.json(
        { error: 'Could not extract test stats from PDF.' },
        { status: 400 }
      )
    }

    const totalCorrect = parseInt(correctMatch[1])
    const totalIncorrect = parseInt(incorrectMatch[1])
    const totalOmitted = omittedMatch ? parseInt(omittedMatch[1]) : 0
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

    // Create the test record with subjects
    const test = await prisma.uWorldTest.create({
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
        subjectsCount: subjects.length
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

        // Convert File to ArrayBuffer for PDF.js
        const arrayBuffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        // Parse PDF using pdfjs-dist legacy build (for Node.js - no DOM deps)
        console.log('Parsing PDF with pdfjs-dist (legacy)...')
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

        // Set a fake worker source to prevent the "no workerSrc" error
        // Then disable the worker in document options
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'data:,'

        // Load the PDF document with worker disabled
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const loadingTask = pdfjsLib.getDocument({
          data: uint8Array,
          disableWorker: true,
          useWorkerFetch: false,
          isEvalSupported: false,
          useSystemFonts: true,
        } as any)
        const pdf = await loadingTask.promise

        // Extract text from all pages
        let text = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pageText = (textContent.items as any[])
            .filter((item) => 'str' in item && item.str)
            .map((item) => item.str)
            .join(' ')
          text += pageText + '\n'
        }

        console.log('PDF parsed successfully. Text length:', text.length)

        // Check if this is a test performance PDF (has "TestId:" field) or overall performance PDF
        const testIdMatch = text.match(/TestId\s*:\s*(.+)/i)

        if (testIdMatch) {
          // This is a TEST PERFORMANCE PDF with subject breakdown
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
