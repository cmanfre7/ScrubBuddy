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

interface MonthViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onDateClick: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  clinical: 'bg-blue-500/80 hover:bg-blue-500',
  exam: 'bg-red-500/80 hover:bg-red-500',
  study: 'bg-purple-500/80 hover:bg-purple-500',
  lecture: 'bg-green-500/80 hover:bg-green-500',
  presentation: 'bg-orange-500/80 hover:bg-orange-500',
  personal: 'bg-slate-500/80 hover:bg-slate-500',
  meeting: 'bg-cyan-500/80 hover:bg-cyan-500',
  appointment: 'bg-pink-500/80 hover:bg-pink-500',
}

export function MonthView({ currentDate, events, onDateClick, onEventClick }: MonthViewProps) {
  const calendar = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay())

    const weeks: Date[][] = []
    let currentWeek: Date[] = []

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      currentWeek.push(date)

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }

    return { weeks, firstDay, lastDay }
  }, [currentDate])

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventStart = new Date(event.startTime)
      const eventEnd = new Date(event.endTime)
      const dateStart = new Date(date)
      dateStart.setHours(0, 0, 0, 0)
      const dateEnd = new Date(date)
      dateEnd.setHours(23, 59, 59, 999)

      return (
        (eventStart >= dateStart && eventStart <= dateEnd) ||
        (eventEnd >= dateStart && eventEnd <= dateEnd) ||
        (eventStart <= dateStart && eventEnd >= dateEnd)
      )
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

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  return (
    <div className="h-full">
      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b border-slate-700/50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="p-3 text-center text-sm font-semibold text-slate-400 uppercase tracking-wide"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendar.weeks.map((week, weekIdx) =>
          week.map((date, dayIdx) => {
            const dayEvents = getEventsForDate(date)
            const today = isToday(date)
            const currentMonth = isCurrentMonth(date)

            return (
              <div
                key={`${weekIdx}-${dayIdx}`}
                className={`min-h-32 border-b border-r border-slate-700/50 p-2 cursor-pointer transition-colors ${
                  currentMonth ? 'bg-slate-800/30 hover:bg-slate-700/30' : 'bg-slate-900/50'
                }`}
                onClick={() => onDateClick(date)}
              >
                <div
                  className={`text-sm font-medium mb-1 ${
                    today
                      ? 'bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center'
                      : currentMonth
                        ? 'text-slate-200'
                        : 'text-slate-600'
                  }`}
                >
                  {date.getDate()}
                </div>

                {/* Events for this day */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick(event)
                      }}
                      className={`w-full text-left px-2 py-1 rounded text-xs font-medium text-white truncate transition-colors ${
                        event.color
                          ? `bg-${event.color}-500/80 hover:bg-${event.color}-500`
                          : EVENT_TYPE_COLORS[event.eventType] || 'bg-slate-500/80 hover:bg-slate-500'
                      }`}
                    >
                      {event.isAllDay ? '' : new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}{' '}
                      {event.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-slate-400 px-2">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
