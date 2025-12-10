import { useMemo } from 'react'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  isAllDay: boolean
  eventType: string
  category?: string
  color?: string
  isRecurring: boolean
  recurrenceRule?: string
  reminderMins: number[]
}

interface DayViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  clinical: 'bg-blue-500 border-blue-600',
  exam: 'bg-red-500 border-red-600',
  study: 'bg-purple-500 border-purple-600',
  lecture: 'bg-green-500 border-green-600',
  presentation: 'bg-orange-500 border-orange-600',
  personal: 'bg-slate-500 border-slate-600',
  meeting: 'bg-cyan-500 border-cyan-600',
  appointment: 'bg-pink-500 border-pink-600',
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function DayView({ currentDate, events, onEventClick }: DayViewProps) {
  const { allDayEvents, timedEvents } = useMemo(() => {
    const dateStart = new Date(currentDate)
    dateStart.setHours(0, 0, 0, 0)
    const dateEnd = new Date(currentDate)
    dateEnd.setHours(23, 59, 59, 999)

    const dayEvents = events.filter((event) => {
      const eventStart = new Date(event.startTime)
      const eventEnd = new Date(event.endTime)

      // For all-day events, compare dates only (ignoring timezone issues)
      // All-day events are stored at noon UTC, so we use UTC date components
      if (event.isAllDay) {
        const dateYear = currentDate.getFullYear()
        const dateMonth = currentDate.getMonth()
        const dateDay = currentDate.getDate()

        const startYear = eventStart.getUTCFullYear()
        const startMonth = eventStart.getUTCMonth()
        const startDay = eventStart.getUTCDate()

        const endYear = eventEnd.getUTCFullYear()
        const endMonth = eventEnd.getUTCMonth()
        const endDay = eventEnd.getUTCDate()

        // Create comparable dates (all at midnight local time)
        const currDate = new Date(dateYear, dateMonth, dateDay)
        const startDate = new Date(startYear, startMonth, startDay)
        const endDate = new Date(endYear, endMonth, endDay)

        return currDate >= startDate && currDate <= endDate
      }

      // For timed events, use the existing logic
      return (
        (eventStart >= dateStart && eventStart <= dateEnd) ||
        (eventEnd >= dateStart && eventEnd <= dateEnd) ||
        (eventStart <= dateStart && eventEnd >= dateEnd)
      )
    })

    return {
      allDayEvents: dayEvents.filter((e) => e.isAllDay),
      timedEvents: dayEvents.filter((e) => !e.isAllDay).sort((a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      ),
    }
  }, [currentDate, events])

  const getEventsForHour = (hour: number) => {
    const hourStart = new Date(currentDate)
    hourStart.setHours(hour, 0, 0, 0)
    const hourEnd = new Date(currentDate)
    hourEnd.setHours(hour, 59, 59, 999)

    return timedEvents.filter((event) => {
      const eventStart = new Date(event.startTime)
      const eventEnd = new Date(event.endTime)

      return (
        (eventStart >= hourStart && eventStart <= hourEnd) ||
        (eventEnd >= hourStart && eventEnd <= hourEnd) ||
        (eventStart <= hourStart && eventEnd >= hourEnd)
      )
    })
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12:00 AM'
    if (hour < 12) return `${hour}:00 AM`
    if (hour === 12) return '12:00 PM'
    return `${hour - 12}:00 PM`
  }

  const formatTimeRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return `${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  }

  return (
    <div className="h-full flex">
      {/* Main content area */}
      <div className="flex-1">
        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div className="border-b border-slate-700/50 p-4 bg-slate-800/30">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">
              All Day
            </div>
            <div className="space-y-2">
              {allDayEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={`w-full text-left px-4 py-3 rounded border-l-4 ${
                    EVENT_TYPE_COLORS[event.eventType] || 'bg-slate-500 border-slate-600'
                  }`}
                >
                  <div className="font-semibold text-white">{event.title}</div>
                  {event.description && (
                    <div className="text-sm text-white/80 mt-1">{event.description}</div>
                  )}
                  {event.location && (
                    <div className="text-xs text-white/60 mt-1">{event.location}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Time grid */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          {HOURS.map((hour) => {
            const hourEvents = getEventsForHour(hour)

            return (
              <div key={hour} className="flex border-t border-slate-700/50">
                <div className="w-24 p-3 text-right text-sm text-slate-400 font-medium shrink-0">
                  {formatHour(hour)}
                </div>
                <div className="flex-1 border-l border-slate-700/50 p-2 min-h-20 relative">
                  {hourEvents.map((event) => {
                    const startTime = new Date(event.startTime)
                    const endTime = new Date(event.endTime)
                    const startHour = startTime.getHours()
                    const startMinute = startTime.getMinutes()
                    const durationMinutes =
                      (endTime.getTime() - startTime.getTime()) / (1000 * 60)
                    const heightPercentage = Math.min((durationMinutes / 60) * 100, 100)

                    return (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className={`absolute left-2 right-2 px-3 py-2 rounded border-l-4 text-white ${
                          EVENT_TYPE_COLORS[event.eventType] || 'bg-slate-500 border-slate-600'
                        }`}
                        style={{
                          top: startHour === hour ? `${(startMinute / 60) * 100}%` : 0,
                          height: `${heightPercentage}%`,
                          minHeight: '50px',
                        }}
                      >
                        <div className="font-semibold">{event.title}</div>
                        <div className="text-xs opacity-90 mt-1">
                          {formatTimeRange(event.startTime, event.endTime)}
                        </div>
                        {event.location && (
                          <div className="text-xs opacity-80 mt-1">{event.location}</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sidebar with event list */}
      <div className="w-80 border-l border-slate-700/50 bg-slate-800/30 p-4 overflow-y-auto">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">
          {currentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </h3>

        {timedEvents.length === 0 && allDayEvents.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-8">No events scheduled</div>
        ) : (
          <div className="space-y-3">
            {allDayEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="w-full text-left p-3 rounded bg-slate-700/50 hover:bg-slate-700/70 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`w-1 h-full rounded ${
                      EVENT_TYPE_COLORS[event.eventType]?.split(' ')[0] || 'bg-slate-500'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-100">{event.title}</div>
                    <div className="text-xs text-slate-400 mt-1">All day</div>
                    {event.location && (
                      <div className="text-xs text-slate-400 mt-1">{event.location}</div>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {timedEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="w-full text-left p-3 rounded bg-slate-700/50 hover:bg-slate-700/70 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`w-1 h-full rounded ${
                      EVENT_TYPE_COLORS[event.eventType]?.split(' ')[0] || 'bg-slate-500'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-100">{event.title}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {formatTimeRange(event.startTime, event.endTime)}
                    </div>
                    {event.location && (
                      <div className="text-xs text-slate-400 mt-1">{event.location}</div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
