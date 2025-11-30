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
    <div
      className="backdrop-blur-sm rounded-xl p-6 transition-all"
      style={{
        backgroundColor: '#111827',
        border: '1px solid #1e293b'
      }}
    >
      <div className="mb-5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Study Streak</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔥</span>
          <span className="text-5xl font-bold text-amber-400">{currentStreak}</span>
        </div>
        <span className="text-sm text-slate-400">day streak!</span>
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
