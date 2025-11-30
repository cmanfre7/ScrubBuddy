import Link from 'next/link'

interface WeekEvent {
  type: 'clinical' | 'exam' | 'study' | 'off' | 'presentation'
  label: string
}

interface WeekDay {
  dayName: string
  isToday: boolean
  events: WeekEvent[]
}

interface WeekCalendarWidgetProps {
  days: WeekDay[]
}

export function WeekCalendarWidget({ days }: WeekCalendarWidgetProps) {
  const eventColors = {
    clinical: 'bg-blue-900/30 text-blue-400 border border-blue-700/30',
    exam: 'bg-red-900/30 text-red-400 border border-red-700/30',
    study: 'bg-green-900/30 text-green-400 border border-green-700/30',
    off: 'bg-slate-700/30 text-slate-500 border border-slate-600/30',
    presentation: 'bg-purple-900/30 text-purple-400 border border-purple-700/30',
  }

  return (
    <div
      className="backdrop-blur-sm rounded-xl p-6 transition-all"
      style={{
        backgroundColor: '#111827',
        border: '1px solid #1e293b'
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">This Week</span>
        <Link href="/dashboard/planner" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
          Open Planner →
        </Link>
      </div>

      <ul className="space-y-0">
        {days.map((day, index) => (
          <li
            key={index}
            className={`flex gap-4 py-2.5 text-sm ${
              day.isToday
                ? 'bg-blue-900/10 -mx-6 px-6 border-l-4 border-l-blue-500'
                : ''
            }`}
            style={index !== days.length - 1 ? { borderBottom: '1px solid #1e293b' } : {}}
          >
            <span
              className={`w-20 flex-shrink-0 ${
                day.isToday ? 'text-blue-400 font-semibold' : 'text-slate-500'
              }`}
            >
              {day.dayName}
            </span>
            <div className="flex-1 flex flex-wrap gap-2">
              {day.events.length > 0 ? (
                day.events.map((event, eventIndex) => (
                  <span
                    key={eventIndex}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs ${
                      eventColors[event.type]
                    }`}
                  >
                    {event.label}
                  </span>
                ))
              ) : (
                <span className="text-slate-600 text-xs">No events</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
