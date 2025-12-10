'use client'

import { useMemo } from 'react'
import Link from 'next/link'

interface CountdownWidgetProps {
  title: string
  icon: React.ReactNode
  iconBgColor: string
  // For countdown widgets - pass the ISO date string and let client calculate days
  examDateISO?: string
  // For rotation progress widgets
  totalDays?: number
  currentDay?: number
  startDateISO?: string
  // Display options
  predicted?: string
  predictedLabel?: string
  target?: string
  href?: string
}

// Calculate days until a target date using LOCAL timezone
// This must run on the client to get the user's actual local date
function calculateDaysUntil(targetDateISO: string): number {
  const now = new Date()
  const target = new Date(targetDateISO)

  // Get today's date at midnight LOCAL time
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Get target date at midnight LOCAL time
  // Since dates are stored as midnight UTC, extract the UTC date components
  // and create a local midnight date for comparison
  const targetMidnight = new Date(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    target.getUTCDate()
  )

  // Calculate difference in days
  const diffTime = targetMidnight.getTime() - todayMidnight.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

// Calculate current day of rotation using LOCAL timezone
function calculateCurrentDay(startDateISO: string): number {
  const now = new Date()
  const start = new Date(startDateISO)

  // Get today's date at midnight LOCAL time
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Get start date at midnight LOCAL time (using UTC components from stored date)
  const startMidnight = new Date(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate()
  )

  // Calculate days since start (add 1 because day 1 is the start date)
  const diffTime = todayMidnight.getTime() - startMidnight.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1
}

// Format a date for display using LOCAL timezone
function formatExamDate(dateISO: string): string {
  const date = new Date(dateISO)
  // Use UTC components to get the actual stored date
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function CountdownWidget({
  title,
  icon,
  iconBgColor,
  examDateISO,
  totalDays,
  currentDay: currentDayProp,
  startDateISO,
  predicted,
  predictedLabel = 'Predicted:',
  target,
  href,
}: CountdownWidgetProps) {
  // Calculate values on the client using local timezone
  const daysLeft = useMemo(() => {
    if (!examDateISO) return undefined
    return calculateDaysUntil(examDateISO)
  }, [examDateISO])

  const currentDay = useMemo(() => {
    // If currentDay prop is provided, use it (for backwards compatibility)
    if (currentDayProp !== undefined) return currentDayProp
    // Otherwise calculate from startDateISO
    if (!startDateISO) return undefined
    return calculateCurrentDay(startDateISO)
  }, [currentDayProp, startDateISO])

  const examDateFormatted = useMemo(() => {
    if (!examDateISO) return undefined
    return formatExamDate(examDateISO)
  }, [examDateISO])

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
          {examDateFormatted && (
            <div className="text-sm text-slate-300 mb-3">{examDateFormatted}</div>
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
