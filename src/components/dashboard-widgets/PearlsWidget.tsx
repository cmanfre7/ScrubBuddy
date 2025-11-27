import Link from 'next/link'

interface Pearl {
  id: string
  content: string
  rotationName: string | null
  createdAt: Date
}

interface PearlsWidgetProps {
  pearls: Pearl[]
}

export function PearlsWidget({ pearls }: PearlsWidgetProps) {
  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    if (diffInHours < 48) return 'Yesterday'
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 transition-all hover:border-slate-600/50">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recent Pearls</span>
        <Link href="/dashboard/clinical-notes?tab=pearls" className="text-xs text-blue-400 hover:text-blue-300">
          View All →
        </Link>
      </div>

      <div className="space-y-3">
        {pearls.length > 0 ? (
          pearls.map((pearl) => (
            <div key={pearl.id} className="py-3 border-b border-slate-700/50 last:border-b-0">
              <div className="text-sm text-slate-200 leading-relaxed mb-2">
                &ldquo;{pearl.content}&rdquo;
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{getTimeAgo(pearl.createdAt)}</span>
                {pearl.rotationName && (
                  <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded border border-blue-700/30">
                    {pearl.rotationName}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">
            No pearls saved yet. Start capturing clinical insights!
          </p>
        )}
      </div>
    </div>
  )
}
