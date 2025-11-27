'use client'

import { useState } from 'react'
import { cn, formatDate } from '@/lib/utils'
import { FileText, Lightbulb, BookOpen, Pill, Plus } from 'lucide-react'
import { PatientsTab } from '@/components/clinical-notes/PatientsTab'
import { PearlsTab } from '@/components/clinical-notes/PearlsTab'
import { ReferenceTab } from '@/components/clinical-notes/ReferenceTab'
import { PharmTab } from '@/components/clinical-notes/PharmTab'
import { QuickCapture } from '@/components/clinical-notes/QuickCapture'

interface Rotation {
  id: string
  name: string
  startDate: string
  endDate: string
  shelfDate: string | null
  isCurrent: boolean
}

interface RotationWorkspaceProps {
  rotation: Rotation
}

const tabs = [
  { id: 'patients', name: 'Patients', icon: FileText },
  { id: 'pearls', name: 'Pearls', icon: Lightbulb },
  { id: 'reference', name: 'Reference', icon: BookOpen },
  { id: 'pharm', name: 'Pharm', icon: Pill },
]

export function RotationWorkspace({ rotation }: RotationWorkspaceProps) {
  const [activeTab, setActiveTab] = useState('patients')
  const [showQuickCapture, setShowQuickCapture] = useState(false)

  const weekNumber = getWeekNumber(rotation.startDate, rotation.endDate)
  const totalWeeks = getTotalWeeks(rotation.startDate, rotation.endDate)

  return (
    <>
      <div className="space-y-6">
        {/* Rotation Header */}
        <div className="bg-gradient-to-r from-slate-800/50 to-slate-800/30 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-3xl">{getRotationEmoji(rotation.name)}</div>
                <h2 className="text-2xl font-bold text-slate-100">{rotation.name}</h2>
              </div>
              {rotation.isCurrent && weekNumber && totalWeeks && (
                <p className="text-slate-400">
                  Week {weekNumber} of {totalWeeks} • Ends {formatDate(new Date(rotation.endDate))}
                </p>
              )}
            </div>
            {rotation.shelfDate && (
              <div className="text-right">
                <p className="text-sm text-slate-500">Shelf Exam</p>
                <p className="text-lg font-semibold text-slate-200">
                  {formatDate(new Date(rotation.shelfDate))}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200',
                activeTab === tab.id
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              )}
            >
              <tab.icon size={18} />
              <span className="font-medium">{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === 'patients' && <PatientsTab rotationId={rotation.id} />}
          {activeTab === 'pearls' && <PearlsTab rotationId={rotation.id} />}
          {activeTab === 'reference' && <ReferenceTab rotationId={rotation.id} />}
          {activeTab === 'pharm' && <PharmTab rotationId={rotation.id} />}
        </div>
      </div>

      {/* Floating Quick Capture Button */}
      <button
        onClick={() => setShowQuickCapture(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-110 transition-all duration-200 flex items-center justify-center group z-50"
        title="Quick Capture"
      >
        <Plus className="text-white" size={24} />
        <span className="absolute right-16 whitespace-nowrap bg-slate-900 text-slate-100 px-3 py-1.5 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Quick Pearl
        </span>
      </button>

      {/* Quick Capture Modal */}
      {showQuickCapture && (
        <QuickCapture
          rotationId={rotation.id}
          rotationName={rotation.name}
          onClose={() => setShowQuickCapture(false)}
        />
      )}
    </>
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
