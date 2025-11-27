import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  icon?: ReactNode
  className?: string
}

export function StatCard({
  label,
  value,
  trend,
  trendValue,
  icon,
  className,
}: StatCardProps) {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    stable: 'text-slate-400',
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <div
      className={cn(
        'bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{value}</p>
          {trend && (
            <div className={cn('flex items-center gap-1 mt-2', trendColors[trend])}>
              <TrendIcon size={14} />
              {trendValue && <span className="text-sm">{trendValue}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className="p-2 bg-slate-700/50 rounded-lg text-blue-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
