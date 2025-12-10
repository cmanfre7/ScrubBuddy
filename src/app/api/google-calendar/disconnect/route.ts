import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/google-calendar/disconnect - Disconnect Google Calendar
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Delete the Google Calendar sync record
    await prisma.googleCalendarSync.delete({
      where: { userId: session.user.id },
    })

    // Optionally: Clear googleEventId from all calendar events
    // This keeps the local events but breaks the link to Google
    await prisma.calendarEvent.updateMany({
      where: { userId: session.user.id },
      data: {
        googleEventId: null,
        googleCalendarId: null,
        isSynced: false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Google Calendar disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
