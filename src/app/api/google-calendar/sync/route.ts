import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  listEvents,
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
  refreshAccessToken,
} from '@/lib/google-calendar'

// POST /api/google-calendar/sync - Perform sync
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sync = await prisma.googleCalendarSync.findUnique({
      where: { userId: session.user.id },
    })

    if (!sync || !sync.syncEnabled) {
      return NextResponse.json(
        { error: 'Google Calendar sync not enabled' },
        { status: 400 }
      )
    }

    let accessToken = sync.accessToken

    // Check if token is expired
    if (new Date() >= sync.tokenExpiresAt) {
      const newTokens = await refreshAccessToken(sync.refreshToken)
      accessToken = newTokens.access_token!

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

    const results = {
      pulled: 0,
      pushed: 0,
      errors: [] as string[],
    }

    // Get time range for sync (past 30 days to 1 year ahead)
    const timeMin = new Date()
    timeMin.setDate(timeMin.getDate() - 30)
    const timeMax = new Date()
    timeMax.setFullYear(timeMax.getFullYear() + 1)

    // Sync for each selected calendar
    for (const calendarId of sync.selectedCalendars) {
      try {
        // PULL: Get events from Google
        if (sync.syncDirection === 'both' || sync.syncDirection === 'from_google') {
          const { events: googleEvents, nextSyncToken } = await listEvents(
            accessToken,
            sync.refreshToken,
            calendarId,
            { timeMin, timeMax, syncToken: sync.syncToken || undefined }
          )

          for (const gEvent of googleEvents) {
            if (!gEvent.id) continue

            // Check if event was cancelled (deleted in Google)
            if (gEvent.status === 'cancelled') {
              // Delete local event if it exists
              await prisma.calendarEvent.deleteMany({
                where: {
                  userId: session.user.id,
                  googleEventId: gEvent.id,
                },
              })
              continue
            }

            // Parse start/end times
            const startTime = gEvent.start?.dateTime
              ? new Date(gEvent.start.dateTime)
              : gEvent.start?.date
                ? new Date(gEvent.start.date)
                : null
            const endTime = gEvent.end?.dateTime
              ? new Date(gEvent.end.dateTime)
              : gEvent.end?.date
                ? new Date(gEvent.end.date)
                : null

            if (!startTime || !endTime) continue

            const isAllDay = !!gEvent.start?.date

            // Upsert local event
            await prisma.calendarEvent.upsert({
              where: {
                googleEventId: gEvent.id,
              },
              update: {
                title: gEvent.summary || 'Untitled',
                description: gEvent.description || null,
                location: gEvent.location || null,
                startTime,
                endTime,
                isAllDay,
                isSynced: true,
                lastSyncedAt: new Date(),
              },
              create: {
                userId: session.user.id,
                title: gEvent.summary || 'Untitled',
                description: gEvent.description || null,
                location: gEvent.location || null,
                startTime,
                endTime,
                isAllDay,
                eventType: 'personal', // Default type for imported events
                googleEventId: gEvent.id,
                googleCalendarId: calendarId,
                isSynced: true,
                lastSyncedAt: new Date(),
              },
            })
            results.pulled++
          }

          // Save sync token for incremental sync
          if (nextSyncToken) {
            await prisma.googleCalendarSync.update({
              where: { userId: session.user.id },
              data: { syncToken: nextSyncToken },
            })
          }
        }

        // PUSH: Send local events to Google
        if (sync.syncDirection === 'both' || sync.syncDirection === 'to_google') {
          // Get local events that aren't synced yet
          const localEvents = await prisma.calendarEvent.findMany({
            where: {
              userId: session.user.id,
              googleEventId: null,
              startTime: { gte: timeMin, lte: timeMax },
            },
          })

          for (const localEvent of localEvents) {
            try {
              const gEvent = await createGoogleEvent(
                accessToken,
                sync.refreshToken,
                calendarId,
                {
                  summary: localEvent.title,
                  description: localEvent.description || undefined,
                  location: localEvent.location || undefined,
                  start: localEvent.startTime,
                  end: localEvent.endTime,
                  allDay: localEvent.isAllDay,
                }
              )

              // Update local event with Google ID
              await prisma.calendarEvent.update({
                where: { id: localEvent.id },
                data: {
                  googleEventId: gEvent.id,
                  googleCalendarId: calendarId,
                  isSynced: true,
                  lastSyncedAt: new Date(),
                },
              })
              results.pushed++
            } catch (err) {
              results.errors.push(`Failed to push event: ${localEvent.title}`)
            }
          }
        }
      } catch (calError) {
        results.errors.push(`Failed to sync calendar ${calendarId}`)
      }
    }

    // Update last sync time
    await prisma.googleCalendarSync.update({
      where: { userId: session.user.id },
      data: { lastSyncAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    console.error('Google Calendar sync error:', error)
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    )
  }
}
