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

interface WeekViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onDateClick: (date: Date) => void
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

export function WeekView({ currentDate, events, onDateClick, onEventClick }: WeekViewProps) {
  const weekDays = useMemo(() => {
    const start = new Date(currentDate)
    const day = start.getDay()
    start.setDate(start.getDate() - day)

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start)
      date.setDate(date.getDate() + i)
      return date
    })
  }, [currentDate])

  const getEventsForDateAndHour = (date: Date, hour: number) => {
    const hourStart = new Date(date)
    hourStart.setHours(hour, 0, 0, 0)
    const hourEnd = new Date(date)
    hourEnd.setHours(hour, 59, 59, 999)

    return events.filter((event) => {
      if (event.isAllDay) return false
      const eventStart = new Date(event.startTime)
      const eventEnd = new Date(event.endTime)

      return (
        (eventStart >= hourStart && eventStart <= hourEnd) ||
        (eventEnd >= hourStart && eventEnd <= hourEnd) ||
        (eventStart <= hourStart && eventEnd >= hourEnd)
      )
    })
  }

  const getAllDayEvents = (date: Date) => {
    return events.filter((event) => {
      if (!event.isAllDay) return false
      const eventStart = new Date(event.startTime)
      const eventEnd = new Date(event.endTime)

      // For all-day events, compare dates only (ignoring timezone issues)
      // All-day events are stored at noon UTC, so we use UTC date components
      const dateYear = date.getFullYear()
      const dateMonth = date.getMonth()
      const dateDay = date.getDate()

      const startYear = eventStart.getUTCFullYear()
      const startMonth = eventStart.getUTCMonth()
      const startDay = eventStart.getUTCDate()

      const endYear = eventEnd.getUTCFullYear()
      const endMonth = eventEnd.getUTCMonth()
      const endDay = eventEnd.getUTCDate()

      // Create comparable dates (all at midnight local time)
      const currentDate = new Date(dateYear, dateMonth, dateDay)
      const startDate = new Date(startYear, startMonth, startDay)
      const endDate = new Date(endYear, endMonth, endDay)

      return currentDate >= startDate && currentDate <= endDate
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM'
    if (hour < 12) return `${hour} AM`
    if (hour === 12) return '12 PM'
    return `${hour - 12} PM`
  }

  return (
    <div className="flex flex-col h-full">
      {/* All-day events row */}
      <div className="border-b border-slate-700/50">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          <div className="p-2 text-xs text-slate-400 font-medium">All day</div>
          {weekDays.map((date) => {
            const allDayEvents = getAllDayEvents(date)
            const today = isToday(date)

            return (
              <div
                key={date.toISOString()}
                className={`border-l border-slate-700/50 p-2 min-h-16 ${today ? 'bg-blue-900/10' : ''}`}
              >
                {allDayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={`w-full text-left px-2 py-1 rounded text-xs font-medium text-white mb-1 ${
                      EVENT_TYPE_COLORS[event.eventType] || 'bg-slate-500 border-slate-600'
                    }`}
                  >
                    {event.title}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-700/50 sticky top-0 bg-slate-800/95 backdrop-blur-sm z-10">
        <div></div>
        {weekDays.map((date) => {
          const today = isToday(date)
          return (
            <div
              key={date.toISOString()}
              className={`border-l border-slate-700/50 p-3 text-center ${today ? 'bg-blue-900/20' : ''}`}
            >
              <div className="text-xs text-slate-400 uppercase tracking-wide">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div
                className={`text-xl font-semibold mt-1 ${today ? 'text-blue-400' : 'text-slate-200'}`}
              >
                {date.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {HOURS.map((hour) => (
            <>
              <div
                key={`hour-${hour}`}
                className="p-2 text-xs text-slate-400 font-medium text-right pr-3 border-t border-slate-700/50"
              >
                {formatHour(hour)}
              </div>
              {weekDays.map((date) => {
                const hourEvents = getEventsForDateAndHour(date, hour)
                const today = isToday(date)

                return (
                  <div
                    key={`${date.toISOString()}-${hour}`}
                    className={`border-l border-t border-slate-700/50 p-1 min-h-16 cursor-pointer hover:bg-slate-700/20 relative ${
                      today ? 'bg-blue-900/5' : ''
                    }`}
                    onClick={() => {
                      const clickedDate = new Date(date)
                      clickedDate.setHours(hour, 0, 0, 0)
                      onDateClick(clickedDate)
                    }}
                  >
                    {hourEvents.map((event) => {
                      const startTime = new Date(event.startTime)
                      const minutes = startTime.getMinutes()

                      return (
                        <button
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick(event)
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-xs font-medium text-white mb-1 border-l-2 ${
                            EVENT_TYPE_COLORS[event.eventType] || 'bg-slate-500 border-slate-600'
                          }`}
                          style={{
                            marginTop: minutes > 0 ? `${(minutes / 60) * 100}%` : 0,
                          }}
                        >
                          <div className="font-semibold">{event.title}</div>
                          {event.location && (
                            <div className="text-xs opacity-80">{event.location}</div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  )
}
