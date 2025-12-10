'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Clock, ChevronLeft, ChevronRight } from 'lucide-react'

interface ScheduleEventInput {
  id: string
  title: string
  startTime: Date | string
  endTime: Date | string
  location?: string
  eventType: string
  isAllDay: boolean
}

interface ScheduleEvent {
  id: string
  title: string
  startTime: Date
  endTime: Date
  location?: string
  eventType: string
  isAllDay: boolean
}

interface TodayScheduleWidgetProps {
  events: ScheduleEventInput[]
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

export function TodayScheduleWidget({ events }: TodayScheduleWidgetProps) {
  const [dayOffset, setDayOffset] = useState(0)

  // Convert string dates to Date objects (needed when data is serialized from server to client)
  const normalizedEvents: ScheduleEvent[] = events.map((event) => ({
    ...event,
    startTime: event.startTime instanceof Date ? event.startTime : new Date(event.startTime),
    endTime: event.endTime instanceof Date ? event.endTime : new Date(event.endTime),
  }))

  // Get the selected date based on offset
  const getSelectedDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + dayOffset)
    return date
  }

  const selectedDate = getSelectedDate()

  // Format the date for display
  const formatDateLabel = () => {
    if (dayOffset === 0) return "Today's Schedule"
    if (dayOffset === 1) return "Tomorrow's Schedule"
    if (dayOffset === -1) return "Yesterday's Schedule"
    return selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // Filter to only events for the selected day
  const selectedDayEvents = normalizedEvents.filter((event) => {
    // For all-day events, compare dates only (ignoring timezone issues)
    // All-day events are stored at noon UTC, so we use UTC date components
    if (event.isAllDay) {
      const dateYear = selectedDate.getFullYear()
      const dateMonth = selectedDate.getMonth()
      const dateDay = selectedDate.getDate()

      const startYear = event.startTime.getUTCFullYear()
      const startMonth = event.startTime.getUTCMonth()
      const startDay = event.startTime.getUTCDate()

      const endYear = event.endTime.getUTCFullYear()
      const endMonth = event.endTime.getUTCMonth()
      const endDay = event.endTime.getUTCDate()

      // Create comparable dates (all at midnight local time)
      const currDate = new Date(dateYear, dateMonth, dateDay)
      const startDate = new Date(startYear, startMonth, startDay)
      const endDate = new Date(endYear, endMonth, endDay)

      return currDate >= startDate && currDate <= endDate
    }

    // For timed events, use the existing logic
    const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0)
    const dayEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999)

    // Event is for this day if it starts, ends, or spans across the day
    const startsOnDay = event.startTime >= dayStart && event.startTime <= dayEnd
    const endsOnDay = event.endTime >= dayStart && event.endTime <= dayEnd
    const spansDay = event.startTime <= dayStart && event.endTime >= dayEnd

    return startsOnDay || endsOnDay || spansDay
  })

  const sortedEvents = [...selectedDayEvents].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  )

  const formatTime = (date: Date) => {
    // Use local timezone (browser's default) - no timeZone specified
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatTimeRange = (start: Date, end: Date) => {
    return `${formatTime(start)} - ${formatTime(end)}`
  }

  const isUpcoming = (event: ScheduleEvent) => {
    const now = new Date()
    return event.startTime > now
  }

  const isOngoing = (event: ScheduleEvent) => {
    // Only show "Now" badge when viewing today
    if (dayOffset !== 0) return false
    const now = new Date()
    return event.startTime <= now && event.endTime >= now
  }

  return (
    <div
      className="backdrop-blur-sm rounded-xl p-6"
      style={{
        backgroundColor: '#111827',
        border: '1px solid #1e293b'
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-blue-400" />
          <h2 className="text-lg font-semibold text-white">{formatDateLabel()}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDayOffset(d => d - 1)}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft size={16} />
          </button>
          {dayOffset !== 0 && (
            <button
              onClick={() => setDayOffset(0)}
              className="px-2 py-1 rounded-md text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-700/50 transition-colors"
            >
              Today
            </button>
          )}
          <button
            onClick={() => setDayOffset(d => d + 1)}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            aria-label="Next day"
          >
            <ChevronRight size={16} />
          </button>
          <Link
            href="/dashboard/calendar"
            className="ml-2 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            View Calendar
          </Link>
        </div>
      </div>

      {sortedEvents.length === 0 ? (
        <div className="text-center py-8">
          <Calendar size={48} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">
            No events scheduled for {dayOffset === 0 ? 'today' : dayOffset === 1 ? 'tomorrow' : dayOffset === -1 ? 'yesterday' : 'this day'}
          </p>
          <Link
            href="/dashboard/calendar"
            className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
          >
            Add an event
          </Link>
        </div>
      ) : (
        <div className={`${sortedEvents.length >= 4 ? 'space-y-1.5' : sortedEvents.length >= 3 ? 'space-y-2' : 'space-y-3'}`}>
          {sortedEvents.map((event) => {
            const ongoing = isOngoing(event)
            // Dynamic sizing based on event count
            const isCompact = sortedEvents.length >= 3
            const isVeryCompact = sortedEvents.length >= 4

            return (
              <div
                key={event.id}
                className={`${isVeryCompact ? 'p-2' : isCompact ? 'p-2.5' : 'p-3'} rounded-lg border-l-4 transition-colors ${
                  ongoing
                    ? 'bg-blue-900/30 border-blue-500'
                    : EVENT_TYPE_COLORS[event.eventType] || 'bg-slate-700/50 border-slate-600'
                } ${ongoing ? 'ring-2 ring-blue-500/30' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-center gap-2 ${isCompact ? 'mb-0.5' : 'mb-1'}`}>
                      <h3 className={`font-medium text-slate-100 ${isVeryCompact ? 'text-xs' : 'text-sm'} truncate`}>{event.title}</h3>
                      {ongoing && (
                        <span className={`${isVeryCompact ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs'} bg-blue-500 text-white rounded-full flex-shrink-0`}>
                          Now
                        </span>
                      )}
                    </div>

                    <div className={`flex items-center gap-2 ${isVeryCompact ? 'text-[10px]' : 'text-xs'} text-slate-400`}>
                      <div className="flex items-center gap-1">
                        <Clock size={isVeryCompact ? 10 : 12} />
                        {event.isAllDay ? 'All Day' : formatTimeRange(event.startTime, event.endTime)}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1 truncate">
                          <MapPin size={isVeryCompact ? 10 : 12} className="flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
