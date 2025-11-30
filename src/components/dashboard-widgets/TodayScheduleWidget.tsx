'use client'

import Link from 'next/link'
import { Calendar, MapPin, Clock } from 'lucide-react'

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
  // Convert string dates to Date objects (needed when data is serialized from server to client)
  const normalizedEvents: ScheduleEvent[] = events.map((event) => ({
    ...event,
    startTime: event.startTime instanceof Date ? event.startTime : new Date(event.startTime),
    endTime: event.endTime instanceof Date ? event.endTime : new Date(event.endTime),
  }))

  // Filter to only events that are "today" in the user's local timezone
  // Server fetches a wider window to handle timezone differences
  const todayEvents = normalizedEvents.filter((event) => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    // Event is "today" if it starts today, ends today, or spans across today
    const startsToday = event.startTime >= todayStart && event.startTime <= todayEnd
    const endsToday = event.endTime >= todayStart && event.endTime <= todayEnd
    const spansToday = event.startTime <= todayStart && event.endTime >= todayEnd

    return startsToday || endsToday || spansToday
  })

  const sortedEvents = [...todayEvents].sort(
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
          <h2 className="text-lg font-semibold text-white">Today's Schedule</h2>
        </div>
        <Link
          href="/dashboard/calendar"
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
        >
          View Calendar
        </Link>
      </div>

      {sortedEvents.length === 0 ? (
        <div className="text-center py-8">
          <Calendar size={48} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">No events scheduled for today</p>
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
