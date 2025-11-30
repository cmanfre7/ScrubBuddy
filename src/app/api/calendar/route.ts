import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/calendar - List calendar events
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const eventType = searchParams.get('eventType')

  try {
    const where: any = {
      userId: session.user.id,
    }

    // Filter by date range if provided
    if (startDate && endDate) {
      where.OR = [
        {
          startTime: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        {
          endTime: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        {
          AND: [
            { startTime: { lte: new Date(startDate) } },
            { endTime: { gte: new Date(endDate) } },
          ],
        },
      ]
    }

    // Filter by event type if provided
    if (eventType) {
      where.eventType = eventType
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startTime: 'asc' },
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('Calendar events fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

// POST /api/calendar - Create new event
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()

    // Validate required fields
    if (!data.title || !data.startTime || !data.endTime || !data.eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: title, startTime, endTime, eventType' },
        { status: 400 }
      )
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId: session.user.id,
        title: data.title,
        description: data.description || null,
        location: data.location || null,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        isAllDay: data.isAllDay || false,
        timeZone: data.timeZone || 'America/New_York',
        eventType: data.eventType,
        category: data.category || null,
        color: data.color || null,
        isRecurring: data.isRecurring || false,
        recurrenceRule: data.recurrenceRule || null,
        recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
        parentEventId: data.parentEventId || null,
        reminderMins: data.reminderMins || [],
        rotationId: data.rotationId || null,
        taskId: data.taskId || null,
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Calendar event creation error:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
