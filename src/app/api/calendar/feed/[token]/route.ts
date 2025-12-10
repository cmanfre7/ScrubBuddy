import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateICSFeed } from '@/lib/ics'

// GET /api/calendar/feed/[token] - Return ICS feed for calendar subscription
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token) {
    return new NextResponse('Invalid feed URL', { status: 400 })
  }

  try {
    // Find the feed by token
    const feed = await prisma.calendarFeed.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!feed || !feed.isActive) {
      return new NextResponse('Feed not found or inactive', { status: 404 })
    }

    // Fetch all calendar events for this user
    // Get events from the past 30 days and up to 1 year in the future
    const now = new Date()
    const pastDate = new Date(now)
    pastDate.setDate(pastDate.getDate() - 30)
    const futureDate = new Date(now)
    futureDate.setFullYear(futureDate.getFullYear() + 1)

    const events = await prisma.calendarEvent.findMany({
      where: {
        userId: feed.userId,
        startTime: {
          gte: pastDate,
          lte: futureDate,
        },
      },
      orderBy: { startTime: 'asc' },
    })

    // Generate ICS content
    const icsContent = generateICSFeed(events)

    // Return as .ics file
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="scrubbuddy.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Calendar feed error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
