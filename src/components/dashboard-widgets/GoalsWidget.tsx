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
    <div
      className="backdrop-blur-sm rounded-xl p-6 transition-all"
      style={{
        backgroundColor: '#111827',
        border: '1px solid #1e293b'
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Today&apos;s Goals</span>
        <span className="text-xs text-slate-400">
          {completedCount}/{goals.length} complete
        </span>
      </div>

      <ul className="space-y-0">
        {goals.map((goal, index) => (
          <li
            key={goal.id}
            onClick={() => toggleGoal(goal.id)}
            className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-slate-700/20 -mx-6 px-6 transition-colors"
            style={index !== goals.length - 1 ? { borderBottom: '1px solid #1e293b' } : {}}
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
        className="flex items-center gap-2 mt-4 pt-4 text-sm text-blue-400 hover:text-blue-300 font-medium"
        style={{ borderTop: '1px solid #1e293b' }}
      >
        + Add goal
      </Link>
    </div>
  )
}
