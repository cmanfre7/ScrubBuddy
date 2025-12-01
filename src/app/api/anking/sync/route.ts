import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createHash } from 'crypto'

// This endpoint uses token authentication (for Anki add-on)
// Token is passed in Authorization header as "Bearer <token>"

async function authenticateToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const rawToken = authHeader.substring(7)
  const hashedToken = createHash('sha256').update(rawToken).digest('hex')

  const tokenRecord = await prisma.ankiSyncToken.findUnique({
    where: { token: hashedToken },
    include: { user: true },
  })

  if (!tokenRecord || !tokenRecord.isActive) {
    return null
  }

  return tokenRecord
}

export async function POST(request: NextRequest) {
  try {
    const tokenRecord = await authenticateToken(request)
    if (!tokenRecord) {
      return NextResponse.json({ error: 'Invalid or missing token' }, { status: 401 })
    }

    const userId = tokenRecord.userId
    const body = await request.json()

    const {
      // Cards due today
      newDue = 0,
      reviewDue = 0,
      learningDue = 0,
      totalDue = 0,

      // Today's completed stats
      newStudied = 0,
      reviewsStudied = 0,
      learnedToday = 0,
      timeStudiedSecs = 0,

      // Answer breakdown
      againCount = 0,
      hardCount = 0,
      goodCount = 0,
      easyCount = 0,

      // Collection stats
      totalCards = 0,
      totalNotes = 0,
      matureCards = 0,
      youngCards = 0,
      suspendedCards = 0,
      buriedCards = 0,

      // Retention
      retentionRate = null,

      // Per-deck stats (optional)
      decks = [],
    } = body

    // Create sync stats record
    const syncStats = await prisma.ankiSyncStats.create({
      data: {
        userId,
        newDue,
        reviewDue,
        learningDue,
        totalDue,
        newStudied,
        reviewsStudied,
        learnedToday,
        timeStudiedSecs,
        againCount,
        hardCount,
        goodCount,
        easyCount,
        totalCards,
        totalNotes,
        matureCards,
        youngCards,
        suspendedCards,
        buriedCards,
        retentionRate,
      },
    })

    // Update per-deck stats if provided
    if (Array.isArray(decks) && decks.length > 0) {
      for (const deck of decks) {
        await prisma.ankiDeckStats.upsert({
          where: {
            userId_deckName: {
              userId,
              deckName: deck.name,
            },
          },
          update: {
            deckId: deck.id || null,
            newDue: deck.newDue || 0,
            reviewDue: deck.reviewDue || 0,
            learningDue: deck.learningDue || 0,
            totalCards: deck.totalCards || 0,
            totalNew: deck.totalNew || 0,
            totalLearning: deck.totalLearning || 0,
            totalReview: deck.totalReview || 0,
            totalSuspended: deck.totalSuspended || 0,
            syncedAt: new Date(),
          },
          create: {
            userId,
            deckName: deck.name,
            deckId: deck.id || null,
            newDue: deck.newDue || 0,
            reviewDue: deck.reviewDue || 0,
            learningDue: deck.learningDue || 0,
            totalCards: deck.totalCards || 0,
            totalNew: deck.totalNew || 0,
            totalLearning: deck.totalLearning || 0,
            totalReview: deck.totalReview || 0,
            totalSuspended: deck.totalSuspended || 0,
          },
        })
      }
    }

    // Also update the daily progress for historical tracking
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.ankiProgress.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        newCards: newStudied,
        reviewCards: reviewsStudied,
        totalTime: Math.round(timeStudiedSecs / 60), // Convert to minutes
      },
      create: {
        userId,
        date: today,
        newCards: newStudied,
        reviewCards: reviewsStudied,
        totalTime: Math.round(timeStudiedSecs / 60),
      },
    })

    // Update AnkiGoal with current totals
    await prisma.ankiGoal.upsert({
      where: { userId },
      update: {
        totalCards,
        cardsCompleted: matureCards,
      },
      create: {
        userId,
        totalCards,
        cardsCompleted: matureCards,
      },
    })

    // Update token's lastSyncAt
    await prisma.ankiSyncToken.update({
      where: { id: tokenRecord.id },
      data: { lastSyncAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      syncedAt: syncStats.syncedAt,
      message: 'Anki stats synced successfully',
    })
  } catch (error) {
    console.error('Error syncing anki stats:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// GET - Return latest sync stats (requires session auth for web UI)
export async function GET(request: NextRequest) {
  try {
    // Try token auth first (for add-on)
    const tokenRecord = await authenticateToken(request)

    let userId: string

    if (tokenRecord) {
      userId = tokenRecord.userId
    } else {
      // Fall back to session auth (for web UI)
      const { getServerSession } = await import('next-auth')
      const { authOptions } = await import('@/lib/auth')
      const session = await getServerSession(authOptions)

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = session.user.id
    }

    // Get latest sync stats
    const latestStats = await prisma.ankiSyncStats.findFirst({
      where: { userId },
      orderBy: { syncedAt: 'desc' },
    })

    // Get deck stats
    const deckStats = await prisma.ankiDeckStats.findMany({
      where: { userId },
      orderBy: { deckName: 'asc' },
    })

    // Get token info
    const tokenInfo = await prisma.ankiSyncToken.findUnique({
      where: { userId },
      select: { lastSyncAt: true, isActive: true },
    })

    return NextResponse.json({
      stats: latestStats,
      decks: deckStats,
      lastSyncAt: tokenInfo?.lastSyncAt || null,
      isSyncConfigured: !!tokenInfo?.isActive,
    })
  } catch (error) {
    console.error('Error fetching anki sync stats:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
