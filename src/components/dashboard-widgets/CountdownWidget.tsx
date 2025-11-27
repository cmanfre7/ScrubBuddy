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
    <div className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 transition-all hover:border-slate-600/50 ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</span>
        <div className={`w-8 h-8 rounded-lg ${iconBgColor} flex items-center justify-center text-sm`}>
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
          <div className={`text-3xl font-bold mb-1 ${isUrgent ? 'text-amber-400' : 'text-blue-400'}`}>
            {daysLeft ?? 0}
          </div>
          <div className="text-xs text-slate-500 mb-1">days remaining</div>
          {examDate && (
            <div className="text-sm text-slate-400 mb-3">{examDate}</div>
          )}
          {predicted && (
            <div className="mt-3 pt-3 border-t border-slate-700/50 text-sm">
              <span className="text-slate-500">{predictedLabel} </span>
              <span className="text-blue-400 font-semibold">{predicted}</span>
              {target && <span className="text-slate-500"> / Target: {target}</span>}
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
