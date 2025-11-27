import Link from 'next/link'

interface WeakArea {
  name: string
  percentage: number
}

interface WeakAreasWidgetProps {
  weakAreas: WeakArea[]
}

export function WeakAreasWidget({ weakAreas }: WeakAreasWidgetProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 transition-all hover:border-slate-600/50">
      <div className="mb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Weak Areas to Review</span>
      </div>

      <div className="space-y-3">
        {weakAreas.length > 0 ? (
          weakAreas.map((area, index) => (
            <div key={index} className="flex items-center gap-3 py-2 border-b border-slate-700/50 last:border-b-0">
              <span className="flex-1 text-sm text-slate-300">{area.name}</span>
              <div className="w-24 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-400 rounded-full"
                  style={{ width: `${area.percentage}%` }}
                />
              </div>
              <span className="w-12 text-right text-sm font-semibold text-red-400">
                {area.percentage}%
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">
            No weak areas identified yet. Keep logging UWorld questions!
          </p>
        )}
      </div>

      <Link
        href="/dashboard/uworld?tab=incorrects"
        className="block w-full mt-4 py-2.5 bg-slate-700/30 border border-slate-600/30 rounded-lg text-center text-sm font-medium text-blue-400 hover:bg-blue-900/10 hover:border-blue-500/50 transition-all"
      >
        Review These Topics →
      </Link>
    </div>
  )
}
