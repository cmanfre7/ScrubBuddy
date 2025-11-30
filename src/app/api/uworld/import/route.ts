import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

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

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Parse PDF using CommonJS require (pdf-parse is a CommonJS module)
        console.log('Parsing PDF with pdf-parse...')
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require('pdf-parse')
        const pdfData = await pdfParse(buffer)
        const text = pdfData.text
        console.log('PDF parsed successfully. Text length:', text.length)

        // Extract stats from PDF text
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
