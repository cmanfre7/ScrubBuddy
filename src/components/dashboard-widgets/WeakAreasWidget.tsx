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
    <div
      className="backdrop-blur-sm rounded-xl p-6 transition-all"
      style={{
        backgroundColor: '#111827',
        border: '1px solid #1e293b'
      }}
    >
      <div className="mb-5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Weak Areas to Review</span>
      </div>

      <div className="space-y-3">
        {weakAreas.length > 0 ? (
          weakAreas.map((area, index) => (
            <div
              key={index}
              className="flex items-center gap-3 py-2"
              style={index !== weakAreas.length - 1 ? { borderBottom: '1px solid #1e293b' } : {}}
            >
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
        className="block w-full mt-4 py-2.5 rounded-lg text-center text-sm font-medium text-blue-400 hover:bg-blue-900/10 transition-all"
        style={{
          backgroundColor: '#1a2332',
          border: '1px solid #1e293b'
        }}
      >
        Review These Topics →
      </Link>
    </div>
  )
}
