import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { UWORLD_QUESTION_TOTALS } from '@/types'

// GET - Get user's UWorld settings (custom totals)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.uWorldSettings.findMany({
      where: { userId: session.user.id },
    })

    // Convert to object keyed by subject
    const settingsMap: Record<string, number> = {}
    settings.forEach((s) => {
      settingsMap[s.subject] = s.totalQuestions
    })

    // Merge with defaults
    const merged = { ...UWORLD_QUESTION_TOTALS }
    Object.keys(settingsMap).forEach((subject) => {
      if (subject in merged) {
        (merged as Record<string, number>)[subject] = settingsMap[subject]
      }
    })

    return NextResponse.json({ settings: merged })
  } catch (error) {
    console.error('Error fetching UWorld settings:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PATCH - Update UWorld settings for a subject
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subject, totalQuestions } = body

    if (!subject || totalQuestions === undefined) {
      return NextResponse.json(
        { error: 'subject and totalQuestions are required' },
        { status: 400 }
      )
    }

    // Upsert the setting
    const setting = await prisma.uWorldSettings.upsert({
      where: {
        userId_subject: {
          userId: session.user.id,
          subject,
        },
      },
      update: {
        totalQuestions,
      },
      create: {
        userId: session.user.id,
        subject,
        totalQuestions,
      },
    })

    return NextResponse.json(setting)
  } catch (error) {
    console.error('Error updating UWorld settings:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
