import icalGenerator, { ICalCalendar, ICalEventData } from 'ical-generator'

interface CalendarEvent {
  id: string
  title: string
  description?: string | null
  location?: string | null
  startTime: Date
  endTime: Date
  isAllDay: boolean
  eventType: string
}

export function generateICSFeed(events: CalendarEvent[]): string {
  const calendar: ICalCalendar = icalGenerator({
    name: 'ScrubBuddy',
    prodId: { company: 'ScrubBuddy', product: 'Calendar' },
    timezone: 'America/New_York',
  })

  for (const event of events) {
    const eventData: ICalEventData = {
      id: `${event.id}@scrubbuddy.app`,
      start: event.startTime,
      end: event.endTime,
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      allDay: event.isAllDay,
    }

    calendar.createEvent(eventData)
  }

  return calendar.toString()
}
