import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/calendar/[id] - Get single event
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const event = await prisma.calendarEvent.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Calendar event fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
  }
}

// PATCH /api/calendar/[id] - Update event
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const data = await request.json()

    // Verify ownership
    const existing = await prisma.calendarEvent.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const updateData: any = {}

    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.location !== undefined) updateData.location = data.location
    if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime)
    if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime)
    if (data.isAllDay !== undefined) updateData.isAllDay = data.isAllDay
    if (data.timeZone !== undefined) updateData.timeZone = data.timeZone
    if (data.eventType !== undefined) updateData.eventType = data.eventType
    if (data.category !== undefined) updateData.category = data.category
    if (data.color !== undefined) updateData.color = data.color
    if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring
    if (data.recurrenceRule !== undefined) updateData.recurrenceRule = data.recurrenceRule
    if (data.recurrenceEnd !== undefined) {
      updateData.recurrenceEnd = data.recurrenceEnd ? new Date(data.recurrenceEnd) : null
    }
    if (data.reminderMins !== undefined) updateData.reminderMins = data.reminderMins
    if (data.rotationId !== undefined) updateData.rotationId = data.rotationId
    if (data.taskId !== undefined) updateData.taskId = data.taskId

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('Calendar event update error:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

// DELETE /api/calendar/[id] - Delete event
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    // Verify ownership
    const existing = await prisma.calendarEvent.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    await prisma.calendarEvent.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Calendar event deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}
