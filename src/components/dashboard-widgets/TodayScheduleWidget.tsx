import Link from 'next/link'
import { Calendar, MapPin, Clock } from 'lucide-react'

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
  events: ScheduleEvent[]
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
  const sortedEvents = [...events].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  )

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
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
        <div className="space-y-3">
          {sortedEvents.map((event) => {
            const ongoing = isOngoing(event)
            const upcoming = isUpcoming(event)

            return (
              <div
                key={event.id}
                className={`p-3 rounded-lg border-l-4 transition-colors ${
                  ongoing
                    ? 'bg-blue-900/30 border-blue-500'
                    : EVENT_TYPE_COLORS[event.eventType] || 'bg-slate-700/50 border-slate-600'
                } ${ongoing ? 'ring-2 ring-blue-500/30' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-100 text-sm">{event.title}</h3>
                      {ongoing && (
                        <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                          Now
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {event.isAllDay ? 'All Day' : formatTimeRange(event.startTime, event.endTime)}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          {event.location}
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
