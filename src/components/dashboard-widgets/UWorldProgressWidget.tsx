'use client'

import { useMemo } from 'react'
import Link from 'next/link'

interface LogData {
  date: string // ISO date string
  questionsTotal: number
  questionsCorrect: number
  systems: string[]
}

interface UWorldProgressWidgetProps {
  percentage: number
  questionsDone: number
  totalQuestions: number
  overallCorrect: number
  // Pass raw log data so we can calculate today/week using LOCAL timezone
  recentLogs: LogData[]
}

export function UWorldProgressWidget({
  percentage,
  questionsDone,
  totalQuestions,
  overallCorrect,
  recentLogs,
}: UWorldProgressWidgetProps) {
  // Calculate today and this week stats using LOCAL timezone
  const { todayQuestions, todayCorrect, weekQuestions, weekCorrect } = useMemo(() => {
    const now = new Date()

    // Get today's date at midnight LOCAL time
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Get 7 days ago at midnight LOCAL time
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)

    let todayQ = 0
    let todayC = 0
    let weekQ = 0
    let weekC = 0

    for (const log of recentLogs) {
      // Only count logs with systems assigned
      if (!log.systems || log.systems.length === 0) continue

      // Parse the log date and get it in LOCAL time
      const logDate = new Date(log.date)
      const logLocalDate = new Date(
        logDate.getFullYear(),
        logDate.getMonth(),
        logDate.getDate()
      )

      // Check if this log is from today (local time)
      if (logLocalDate.getTime() >= todayStart.getTime()) {
        todayQ += log.questionsTotal
        todayC += log.questionsCorrect
      }

      // Check if this log is from this week (local time)
      if (logLocalDate.getTime() >= weekStart.getTime()) {
        weekQ += log.questionsTotal
        weekC += log.questionsCorrect
      }
    }

    return {
      todayQuestions: todayQ,
      todayCorrect: todayC,
      weekQuestions: weekQ,
      weekCorrect: weekC,
    }
  }, [recentLogs])

  // SVG circle calculation
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (circumference * percentage) / 100

  const todayPercentage = todayQuestions > 0 ? Math.round((todayCorrect / todayQuestions) * 100) : 0
  const weekPercentage = weekQuestions > 0 ? Math.round((weekCorrect / weekQuestions) * 100) : 0

  // Get color class based on percentage (red < 50, yellow 50-69, green >= 70)
  const getScoreColor = (pct: number) => {
    if (pct >= 70) return 'text-green-400'
    if (pct >= 50) return 'text-yellow-400'
    return 'text-red-400'
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
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">UWorld Progress</span>
        <Link href="/dashboard/uworld" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
          View Details →
        </Link>
      </div>

      <div className="flex gap-6 items-center">
        {/* Circular Progress */}
        <div className="relative w-30 h-30 flex-shrink-0">
          <svg className="transform -rotate-90" width="120" height="120">
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#1e293b"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold text-blue-400">{percentage}%</div>
            <div className="text-xs text-slate-500">Complete</div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-2">
          <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid #1e293b' }}>
            <span className="text-sm text-slate-400">Questions Done</span>
            <span className="text-sm font-semibold text-blue-400">
              {questionsDone.toLocaleString()} / {totalQuestions.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid #1e293b' }}>
            <span className="text-sm text-slate-400">Overall Correct</span>
            <span className="text-sm font-semibold text-green-400">{overallCorrect}%</span>
          </div>
          <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid #1e293b' }}>
            <span className="text-sm text-slate-400">Today</span>
            <span className="text-sm font-semibold text-slate-200">
              {todayQuestions} Qs · <span className={getScoreColor(todayPercentage)}>{todayPercentage}%</span>
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-slate-400">This Week</span>
            <span className="text-sm font-semibold text-slate-200">
              {weekQuestions} Qs · <span className={getScoreColor(weekPercentage)}>{weekPercentage}% avg</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
