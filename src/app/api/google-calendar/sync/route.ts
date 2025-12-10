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
            // For all-day events, Google returns date strings like "2024-12-13"
            // We need to parse these as LOCAL dates, not UTC
            let startTime: Date | null = null
            let endTime: Date | null = null
            const isAllDay = !!gEvent.start?.date

            if (gEvent.start?.dateTime) {
              startTime = new Date(gEvent.start.dateTime)
            } else if (gEvent.start?.date) {
              // Parse as local date: "2024-12-13" -> December 13 at midnight LOCAL time
              const [year, month, day] = gEvent.start.date.split('-').map(Number)
              startTime = new Date(year, month - 1, day, 0, 0, 0)
            }

            if (gEvent.end?.dateTime) {
              endTime = new Date(gEvent.end.dateTime)
            } else if (gEvent.end?.date) {
              // For all-day events, Google's end date is exclusive (next day)
              // So "2024-12-14" end means the event ends at end of "2024-12-13"
              // We'll set end to 23:59:59 of the previous day
              const [year, month, day] = gEvent.end.date.split('-').map(Number)
              const exclusiveEnd = new Date(year, month - 1, day, 0, 0, 0)
              // Subtract 1 second to get 23:59:59 of the actual end day
              endTime = new Date(exclusiveEnd.getTime() - 1000)
            }

            if (!startTime || !endTime) continue

            // Check if local event exists and was modified after last sync
            const existingEvent = await prisma.calendarEvent.findUnique({
              where: { googleEventId: gEvent.id },
            })

            if (existingEvent) {
              // If local event was modified after last sync, skip pulling (we'll push instead)
              const locallyModified = existingEvent.updatedAt > (existingEvent.lastSyncedAt || new Date(0))
              if (locallyModified) {
                // Skip this event - it will be pushed to Google instead
                continue
              }
            }

            // Upsert local event (only if not locally modified)
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
          // Get local events that need to be pushed:
          // 1. New events (googleEventId is null)
          // 2. Modified events (updatedAt > lastSyncedAt)
          const newLocalEvents = await prisma.calendarEvent.findMany({
            where: {
              userId: session.user.id,
              googleEventId: null,
              startTime: { gte: timeMin, lte: timeMax },
            },
          })

          const modifiedLocalEvents = await prisma.calendarEvent.findMany({
            where: {
              userId: session.user.id,
              googleEventId: { not: null },
              startTime: { gte: timeMin, lte: timeMax },
            },
          })

          // Filter to only events modified after last sync
          const eventsToUpdate = modifiedLocalEvents.filter(
            (event) => event.updatedAt > (event.lastSyncedAt || new Date(0))
          )

          // Push new events (create in Google)
          for (const localEvent of newLocalEvents) {
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
              results.errors.push(`Failed to push new event: ${localEvent.title}`)
            }
          }

          // Push modified events (update in Google)
          for (const localEvent of eventsToUpdate) {
            try {
              if (!localEvent.googleEventId) continue

              await updateGoogleEvent(
                accessToken,
                sync.refreshToken,
                localEvent.googleCalendarId || calendarId,
                localEvent.googleEventId,
                {
                  summary: localEvent.title,
                  description: localEvent.description || undefined,
                  location: localEvent.location || undefined,
                  start: localEvent.startTime,
                  end: localEvent.endTime,
                  allDay: localEvent.isAllDay,
                }
              )

              // Update last synced time
              await prisma.calendarEvent.update({
                where: { id: localEvent.id },
                data: {
                  isSynced: true,
                  lastSyncedAt: new Date(),
                },
              })
              results.pushed++
            } catch (err) {
              results.errors.push(`Failed to update event: ${localEvent.title}`)
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
