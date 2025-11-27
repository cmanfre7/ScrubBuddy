'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'

interface Goal {
  id: string
  text: string
  done: boolean
  category: string
}

interface GoalsWidgetProps {
  initialGoals: Goal[]
}

export function GoalsWidget({ initialGoals }: GoalsWidgetProps) {
  const [goals, setGoals] = useState(initialGoals)
  const completedCount = goals.filter(g => g.done).length

  const toggleGoal = async (id: string) => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return

    // Optimistic update
    setGoals(goals.map(g =>
      g.id === id ? { ...g, done: !g.done } : g
    ))

    // Update in database
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !goal.done }),
      })
    } catch (error) {
      // Revert on error
      setGoals(goals)
    }
  }

  const categoryColors: Record<string, string> = {
    UWorld: 'bg-purple-500/20 text-purple-400',
    Clinical: 'bg-blue-500/20 text-blue-400',
    Audio: 'bg-green-500/20 text-green-400',
    Study: 'bg-amber-500/20 text-amber-400',
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 transition-all hover:border-slate-600/50">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Today&apos;s Goals</span>
        <span className="text-xs text-slate-500">
          {completedCount}/{goals.length} complete
        </span>
      </div>

      <ul className="space-y-0">
        {goals.map((goal) => (
          <li
            key={goal.id}
            onClick={() => toggleGoal(goal.id)}
            className="flex items-center gap-3 py-2.5 border-b border-slate-700/50 last:border-b-0 cursor-pointer hover:bg-slate-700/20 -mx-5 px-5 transition-colors"
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                goal.done
                  ? 'bg-green-400 border-green-400'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              {goal.done && <Check size={14} className="text-slate-900" />}
            </div>
            <span
              className={`flex-1 text-sm ${
                goal.done ? 'text-slate-500 line-through' : 'text-slate-200'
              }`}
            >
              {goal.text}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${categoryColors[goal.category] || 'bg-slate-700/50 text-slate-400'}`}>
              {goal.category}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href="/dashboard/tasks"
        className="flex items-center gap-2 mt-3 pt-3 text-sm text-blue-400 hover:text-blue-300"
      >
        + Add goal
      </Link>
    </div>
  )
}
