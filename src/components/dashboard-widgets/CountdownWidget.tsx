import Link from 'next/link'

interface CountdownWidgetProps {
  title: string
  icon: React.ReactNode
  iconBgColor: string
  daysLeft?: number
  totalDays?: number
  currentDay?: number
  examDate?: string
  predicted?: string
  predictedLabel?: string
  target?: string
  href?: string
}

export function CountdownWidget({
  title,
  icon,
  iconBgColor,
  daysLeft,
  totalDays,
  currentDay,
  examDate,
  predicted,
  predictedLabel = 'Predicted:',
  target,
  href,
}: CountdownWidgetProps) {
  const isRotation = currentDay !== undefined && totalDays !== undefined
  const percentage = isRotation ? Math.round((currentDay / totalDays) * 100) : 0
  const isUrgent = daysLeft !== undefined && daysLeft <= 30

  const content = (
    <div
      className={`backdrop-blur-sm rounded-xl p-6 transition-all ${href ? 'cursor-pointer hover:border-slate-600' : ''}`}
      style={{
        backgroundColor: '#111827',
        border: '1px solid #1e293b'
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{title}</span>
        <div className={`w-9 h-9 rounded-lg ${iconBgColor} flex items-center justify-center`}>
          {icon}
        </div>
      </div>

      {isRotation ? (
        <>
          <div className="text-base font-semibold mb-3 text-slate-100">
            {title}
          </div>
          <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Day {currentDay} of {totalDays}</span>
            <span>{percentage}% complete</span>
          </div>
        </>
      ) : (
        <>
          <div className={`text-4xl font-bold mb-1 ${isUrgent ? 'text-amber-400' : 'text-blue-400'}`}>
            {daysLeft ?? 0}
          </div>
          <div className="text-xs text-slate-400 mb-1">days remaining</div>
          {examDate && (
            <div className="text-sm text-slate-300 mb-3">{examDate}</div>
          )}
          {predicted && (
            <div className="mt-3 pt-3 text-sm" style={{ borderTop: '1px solid #1e293b' }}>
              <span className="text-slate-400">{predictedLabel} </span>
              <span className="text-blue-400 font-semibold">{predicted}</span>
              {target && <span className="text-slate-400"> / Target: {target}</span>}
            </div>
          )}
        </>
      )}
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
