import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/google-calendar/status - Get Google Calendar connection status
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sync = await prisma.googleCalendarSync.findUnique({
      where: { userId: session.user.id },
    })

    if (!sync) {
      return NextResponse.json({
        connected: false,
      })
    }

    return NextResponse.json({
      connected: true,
      googleEmail: sync.googleEmail,
      syncEnabled: sync.syncEnabled,
      selectedCalendars: sync.selectedCalendars,
      lastSyncAt: sync.lastSyncAt,
      syncDirection: sync.syncDirection,
    })
  } catch (error) {
    console.error('Google Calendar status error:', error)
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}

// PATCH /api/google-calendar/status - Update sync settings
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()

    const sync = await prisma.googleCalendarSync.update({
      where: { userId: session.user.id },
      data: {
        syncEnabled: data.syncEnabled,
        selectedCalendars: data.selectedCalendars,
        syncDirection: data.syncDirection,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      connected: true,
      googleEmail: sync.googleEmail,
      syncEnabled: sync.syncEnabled,
      selectedCalendars: sync.selectedCalendars,
      lastSyncAt: sync.lastSyncAt,
      syncDirection: sync.syncDirection,
    })
  } catch (error) {
    console.error('Google Calendar status update error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
