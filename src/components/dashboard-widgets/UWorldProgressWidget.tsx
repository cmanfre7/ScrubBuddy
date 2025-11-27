import Link from 'next/link'

interface UWorldProgressWidgetProps {
  percentage: number
  questionsDone: number
  totalQuestions: number
  overallCorrect: number
  todayQuestions: number
  todayCorrect: number
  weekQuestions: number
  weekCorrect: number
}

export function UWorldProgressWidget({
  percentage,
  questionsDone,
  totalQuestions,
  overallCorrect,
  todayQuestions,
  todayCorrect,
  weekQuestions,
  weekCorrect,
}: UWorldProgressWidgetProps) {
  // SVG circle calculation
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (circumference * percentage) / 100

  const todayPercentage = todayQuestions > 0 ? Math.round((todayCorrect / todayQuestions) * 100) : 0
  const weekPercentage = weekQuestions > 0 ? Math.round((weekCorrect / weekQuestions) * 100) : 0

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 transition-all hover:border-slate-600/50">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">UWorld Progress</span>
        <Link href="/dashboard/uworld" className="text-xs text-blue-400 hover:text-blue-300">
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
          <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
            <span className="text-sm text-slate-500">Questions Done</span>
            <span className="text-sm font-semibold text-blue-400">
              {questionsDone.toLocaleString()} / {totalQuestions.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
            <span className="text-sm text-slate-500">Overall Correct</span>
            <span className="text-sm font-semibold text-green-400">{overallCorrect}%</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
            <span className="text-sm text-slate-500">Today</span>
            <span className="text-sm font-semibold">
              {todayQuestions} Qs · <span className="text-green-400">{todayPercentage}%</span>
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-slate-500">This Week</span>
            <span className="text-sm font-semibold">
              {weekQuestions} Qs · {weekPercentage}% avg
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
