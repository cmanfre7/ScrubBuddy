'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, BookOpen, Target, Sparkles } from 'lucide-react'
import { OverviewTab } from '@/components/analytics/OverviewTab'
import { ShelfExamsTab } from '@/components/analytics/ShelfExamsTab'
import { PracticeExamsTab } from '@/components/analytics/PracticeExamsTab'
import { PredictTab } from '@/components/analytics/PredictTab'

const tabs = [
  { id: 'overview', name: 'Overview', icon: TrendingUp },
  { id: 'shelf-exams', name: 'Shelf Exams', icon: BookOpen },
  { id: 'practice-exams', name: 'Practice Exams', icon: Target },
  { id: 'predict', name: 'Predict', icon: Sparkles },
]

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Board/Shelf Analytics</h1>
        <p className="text-slate-400 mt-1">
          Track your progress toward boards and shelf exams
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium',
              activeTab === tab.id
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            )}
          >
            <tab.icon size={16} />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'shelf-exams' && <ShelfExamsTab />}
        {activeTab === 'practice-exams' && <PracticeExamsTab />}
        {activeTab === 'predict' && <PredictTab />}
      </div>
    </div>
  )
}
