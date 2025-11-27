interface StreakWidgetProps {
  currentStreak: number
  last28Days: number[] // Array of study intensities (0-4) for the last 28 days
}

export function StreakWidget({ currentStreak, last28Days }: StreakWidgetProps) {
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const getLevelClass = (level: number) => {
    switch (level) {
      case 0:
        return 'bg-slate-700/50'
      case 1:
        return 'bg-blue-900/40'
      case 2:
        return 'bg-blue-700/60'
      case 3:
        return 'bg-blue-500/80'
      case 4:
        return 'bg-blue-400'
      default:
        return 'bg-slate-700/50'
    }
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 transition-all hover:border-slate-600/50">
      <div className="mb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Study Streak</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <span className="text-4xl font-bold text-amber-400">{currentStreak}</span>
        </div>
        <span className="text-xs text-slate-500">day streak!</span>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {last28Days.map((level, index) => (
          <div
            key={index}
            className={`aspect-square rounded ${getLevelClass(level)}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dayLabels.map((label, index) => (
          <div key={index} className="text-center text-[10px] text-slate-600">
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
