import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listCalendars, refreshAccessToken } from '@/lib/google-calendar'

// GET /api/google-calendar/calendars - List user's Google calendars
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
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 404 }
      )
    }

    let accessToken = sync.accessToken

    // Check if token is expired
    if (new Date() >= sync.tokenExpiresAt) {
      // Refresh the token
      const newTokens = await refreshAccessToken(sync.refreshToken)
      accessToken = newTokens.access_token!

      // Update stored tokens
      await prisma.googleCalendarSync.update({
        where: { userId: session.user.id },
        data: {
          accessToken,
          tokenExpiresAt: newTokens.expiry_date
            ? new Date(newTokens.expiry_date)
            : new Date(Date.now() + 3600 * 1000),
        },
      })
    }

    const calendars = await listCalendars(accessToken, sync.refreshToken)

    // Return calendars with selection status
    const calendarList = calendars.map((cal) => ({
      id: cal.id,
      summary: cal.summary,
      primary: cal.primary || false,
      backgroundColor: cal.backgroundColor,
      selected: sync.selectedCalendars.includes(cal.id || ''),
    }))

    return NextResponse.json({ calendars: calendarList })
  } catch (error) {
    console.error('Google Calendar list error:', error)
    return NextResponse.json(
      { error: 'Failed to list calendars' },
      { status: 500 }
    )
  }
}
