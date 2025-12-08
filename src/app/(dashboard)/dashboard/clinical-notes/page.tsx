'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { cn, formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  Plus,
  FileText,
  Lightbulb,
  BookOpen,
  Pill,
  Calendar,
  Users,
  Sparkles
} from 'lucide-react'
import { RotationWorkspace } from '@/components/clinical-notes/RotationWorkspace'

interface Rotation {
  id: string
  name: string
  startDate: string
  endDate: string
  shelfDate: string | null
  isCurrent: boolean
  _count?: {
    patients: number
    clinicalPearls: number
  }
}

export default function ClinicalNotesPage() {
  const { data: session } = useSession()
  const [selectedRotationId, setSelectedRotationId] = useState<string | null>(null)

  // Fetch rotations with stats
  const { data: rotations = [], isLoading } = useQuery<Rotation[]>({
    queryKey: ['rotations'],
    queryFn: async () => {
      const res = await fetch('/api/rotations?includeCounts=true')
      if (!res.ok) throw new Error('Failed to fetch rotations')
      return res.json()
    },
    enabled: !!session,
  })

  // Auto-select current rotation if exists
  useEffect(() => {
    if (rotations.length > 0 && !selectedRotationId) {
      const current = rotations.find((r) => r.isCurrent)
      if (current) {
        setSelectedRotationId(current.id)
      }
    }
  }, [rotations, selectedRotationId])

  // If a rotation is selected, show the workspace
  if (selectedRotationId) {
    const rotation = rotations.find((r) => r.id === selectedRotationId)
    return (
      <div className="space-y-4 md:space-y-6">
        {/* Back button - 44px touch target on mobile */}
        <button
          onClick={() => setSelectedRotationId(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors min-h-[44px] -ml-2 pl-2"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back to Rotations</span>
        </button>

        {rotation && <RotationWorkspace rotation={rotation} />}
      </div>
    )
  }

  // Show rotation selector landing page
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-100">Clinical Notes</h1>
        <p className="text-sm md:text-base text-slate-400 mt-1">
          Select a rotation to view your notes, pearls, and resources
        </p>
      </div>

      {/* Rotation Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading rotations...</div>
      ) : rotations.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400 mb-4">No rotations found</p>
          <p className="text-sm text-slate-500">
            Add rotations in Settings to start tracking your clinical notes
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {rotations.map((rotation) => {
            const isActive = rotation.isCurrent
            const weekNumber = getWeekNumber(rotation.startDate, rotation.endDate)
            const totalWeeks = getTotalWeeks(rotation.startDate, rotation.endDate)

            return (
              <button
                key={rotation.id}
                onClick={() => setSelectedRotationId(rotation.id)}
                className={cn(
                  'group relative overflow-hidden rounded-xl border p-4 md:p-6 text-left transition-all duration-200',
                  'active:scale-[0.98] md:hover:scale-[1.02] md:hover:shadow-xl',
                  isActive
                    ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-800/50 border-slate-700/50 md:hover:border-slate-600'
                )}
              >
                {/* Rotation Icon/Emoji */}
                <div className="mb-3 md:mb-4">
                  <div
                    className={cn(
                      'w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center text-xl md:text-2xl',
                      isActive
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : 'bg-slate-700/50'
                    )}
                  >
                    {getRotationEmoji(rotation.name)}
                  </div>
                </div>

                {/* Rotation Name */}
                <h3 className="text-base md:text-lg font-bold text-slate-100 mb-1">
                  {rotation.name}
                </h3>

                {/* Current Badge */}
                {isActive && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 mb-3">
                    <Sparkles size={12} className="text-green-400" />
                    <span className="text-xs font-medium text-green-400">CURRENT</span>
                  </div>
                )}

                {/* Progress */}
                {isActive && weekNumber && totalWeeks && (
                  <p className="text-sm text-slate-400 mb-3">
                    Week {weekNumber} of {totalWeeks} • Ends {formatDate(new Date(rotation.endDate))}
                  </p>
                )}

                {/* Stats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <FileText size={14} />
                      Patients
                    </span>
                    <span className="font-medium text-slate-200">
                      {rotation._count?.patients || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Lightbulb size={14} />
                      Pearls
                    </span>
                    <span className="font-medium text-slate-200">
                      {rotation._count?.clinicalPearls || 0}
                    </span>
                  </div>
                </div>

                {/* Arrow indicator on hover */}
                <div className="absolute top-6 right-6 text-slate-600 group-hover:text-slate-400 transition-colors">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="transform group-hover:translate-x-1 transition-transform"
                  >
                    <path
                      d="M7 4l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </button>
            )
          })}

          {/* Add Rotation Card */}
          <a
            href="/dashboard/settings"
            className="group relative overflow-hidden rounded-xl border border-dashed border-slate-700/50 p-6 text-left transition-all duration-200 hover:border-slate-600 hover:bg-slate-800/30 flex flex-col items-center justify-center min-h-[200px]"
          >
            <Plus className="text-slate-600 group-hover:text-slate-400 mb-3" size={32} />
            <p className="text-sm font-medium text-slate-400 group-hover:text-slate-300">
              Add Rotation
            </p>
          </a>
        </div>
      )}
    </div>
  )
}

// Helper functions
function getRotationEmoji(rotationName: string): string {
  const name = rotationName.toLowerCase()
  if (name.includes('psych')) return '🧠'
  if (name.includes('pedi')) return '👶'
  if (name.includes('ob') || name.includes('gyn')) return '🤰'
  if (name.includes('surg')) return '🔪'
  if (name.includes('ortho')) return '🦴'
  if (name.includes('medicine') || name.includes('internal')) return '🏥'
  if (name.includes('neuro')) return '🧬'
  if (name.includes('cardio')) return '❤️'
  if (name.includes('emer')) return '🚨'
  if (name.includes('family')) return '👨‍👩‍👧‍👦'
  return '📋'
}

function getWeekNumber(startDate: string, endDate: string): number | null {
  const start = new Date(startDate)
  const now = new Date()
  const diffTime = now.getTime() - start.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const weekNumber = Math.ceil(diffDays / 7)
  return weekNumber > 0 ? weekNumber : null
}

function getTotalWeeks(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.ceil(diffDays / 7)
}
