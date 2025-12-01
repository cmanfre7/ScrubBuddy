'use client'

import { useQuery } from '@tanstack/react-query'
import { Layers, Clock, TrendingUp, Zap } from 'lucide-react'
import Link from 'next/link'

interface AnkiStats {
  newDue: number
  reviewDue: number
  learningDue: number
  totalDue: number
  newStudied: number
  reviewsStudied: number
  timeStudiedSecs: number
  totalCards: number
  matureCards: number
}

export function AnkiWidget() {
  const { data: syncStats, isLoading } = useQuery<AnkiStats>({
    queryKey: ['anki-sync-stats'],
    queryFn: async () => {
      const res = await fetch('/api/anking/stats')
      if (!res.ok) return null
      const data = await res.json()
      return data.stats
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 60000,
  })

  const { data: tokenData } = useQuery({
    queryKey: ['anki-token'],
    queryFn: async () => {
      const res = await fetch('/api/anking/token')
      if (!res.ok) return null
      return res.json()
    },
  })

  const hasSync = tokenData?.hasToken

  if (!hasSync) {
    return (
      <Link href="/dashboard/anking">
        <div
          className="backdrop-blur-sm rounded-xl p-6 transition-all hover:border-blue-500/50 cursor-pointer h-full"
          style={{
            backgroundColor: '#111827',
            border: '1px solid #1e293b'
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-purple-900/40">
              <Layers size={16} className="text-purple-400" />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Anki</span>
          </div>
          <p className="text-slate-400 text-sm">Set up Anki sync to see your stats here</p>
          <p className="text-blue-400 text-xs mt-2">Click to configure</p>
        </div>
      </Link>
    )
  }

  if (isLoading) {
    return (
      <div
        className="backdrop-blur-sm rounded-xl p-6 transition-all h-full"
        style={{
          backgroundColor: '#111827',
          border: '1px solid #1e293b'
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-purple-900/40">
            <Layers size={16} className="text-purple-400" />
          </div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Anki</span>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-slate-700/50 rounded w-1/2" />
          <div className="h-4 bg-slate-700/50 rounded w-3/4" />
        </div>
      </div>
    )
  }

  const totalDue = syncStats?.totalDue ?? 0
  const newDue = syncStats?.newDue ?? 0
  const reviewDue = syncStats?.reviewDue ?? 0
  const learningDue = syncStats?.learningDue ?? 0
  const newStudied = syncStats?.newStudied ?? 0
  const reviewsStudied = syncStats?.reviewsStudied ?? 0
  const timeMinutes = Math.round((syncStats?.timeStudiedSecs ?? 0) / 60)

  return (
    <Link href="/dashboard/anking">
      <div
        className="backdrop-blur-sm rounded-xl p-6 transition-all hover:border-purple-500/50 cursor-pointer h-full"
        style={{
          backgroundColor: '#111827',
          border: '1px solid #1e293b'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-900/40">
              <Layers size={16} className="text-purple-400" />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Anki</span>
          </div>
          {totalDue > 0 && (
            <span className="text-xs text-amber-400 font-medium">{totalDue} due</span>
          )}
        </div>

        {/* Due Cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-blue-500/10">
            <div className="text-lg font-bold text-blue-400">{newDue}</div>
            <div className="text-[10px] text-slate-500">New</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-green-500/10">
            <div className="text-lg font-bold text-green-400">{reviewDue}</div>
            <div className="text-[10px] text-slate-500">Review</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-orange-500/10">
            <div className="text-lg font-bold text-orange-400">{learningDue}</div>
            <div className="text-[10px] text-slate-500">Learning</div>
          </div>
        </div>

        {/* Today's Progress */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1">
            <Zap size={12} className="text-yellow-400" />
            <span>{newStudied + reviewsStudied} done today</span>
          </div>
          {timeMinutes > 0 && (
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{timeMinutes}m</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
