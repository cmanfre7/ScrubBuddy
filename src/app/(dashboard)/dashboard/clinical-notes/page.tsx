'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FileText, BookOpen, GitBranch, Lightbulb } from 'lucide-react'
import { PatientLog } from '@/components/clinical-notes/PatientLog'
import { StudyNotes } from '@/components/clinical-notes/StudyNotes'
import { ClinicalGuidelines } from '@/components/clinical-notes/ClinicalGuidelines'

const tabs = [
  { id: 'patients', name: 'Patient Log', icon: FileText, description: 'Track clinical encounters' },
  { id: 'study-notes', name: 'Study Notes', icon: BookOpen, description: 'High yield topics & learnings' },
  { id: 'guidelines', name: 'Clinical Guidelines', icon: GitBranch, description: 'Decision trees & algorithms' },
]

export default function ClinicalNotesPage() {
  const [activeTab, setActiveTab] = useState('patients')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Clinical Notes</h1>
        <p className="text-slate-400 mt-1">
          Your comprehensive clinical learning repository
        </p>
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
        {activeTab === 'patients' && <PatientLog />}
        {activeTab === 'study-notes' && <StudyNotes />}
        {activeTab === 'guidelines' && <ClinicalGuidelines />}
      </div>
    </div>
  )
}
