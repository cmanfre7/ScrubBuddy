'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  Check,
  Plus,
  GripVertical,
  Repeat,
  Calendar,
  Trash2,
  ChevronDown
} from 'lucide-react'

interface Goal {
  id: string
  text: string
  done: boolean
  category: string
  priority: number
  recurring: string | null
}

interface GoalsWidgetProps {
  initialGoals: Goal[]
}

const CATEGORIES = [
  { value: 'UWorld', label: 'UWorld', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'Clinical', label: 'Clinical', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'Study', label: 'Study', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'Personal', label: 'Personal', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
]

const RECURRENCE_OPTIONS = [
  { value: null, label: 'Today only', icon: Calendar },
  { value: 'daily', label: 'Every day', icon: Repeat },
  { value: 'weekdays', label: 'Weekdays', icon: Repeat },
]

export function GoalsWidget({ initialGoals }: GoalsWidgetProps) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [isAdding, setIsAdding] = useState(false)
  const [newGoalText, setNewGoalText] = useState('')
  const [newGoalCategory, setNewGoalCategory] = useState('Study')
  const [newGoalRecurring, setNewGoalRecurring] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const completedCount = goals.filter(g => g.done).length
  const activeGoals = goals.filter(g => !g.done)
  const completedGoals = goals.filter(g => g.done)

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const toggleGoal = async (id: string) => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return

    const newDoneState = !goal.done

    // Optimistic update
    setGoals(prev => prev.map(g =>
      g.id === id ? { ...g, done: newDoneState } : g
    ))

    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: newDoneState }),
      })
    } catch {
      // Revert on error
      setGoals(prev => prev.map(g =>
        g.id === id ? { ...g, done: !newDoneState } : g
      ))
    }
  }

  const addGoal = async () => {
    if (!newGoalText.trim()) return

    const tempId = `temp-${Date.now()}`
    const newGoal: Goal = {
      id: tempId,
      text: newGoalText.trim(),
      done: false,
      category: newGoalCategory,
      priority: goals.length + 1,
      recurring: newGoalRecurring,
    }

    // Optimistic add
    setGoals(prev => [newGoal, ...prev])
    setNewGoalText('')
    setIsAdding(false)

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newGoal.text,
          category: newGoal.category,
          priority: newGoal.priority,
          recurring: newGoal.recurring,
        }),
      })
      const data = await res.json()
      // Replace temp ID with real ID
      setGoals(prev => prev.map(g =>
        g.id === tempId ? { ...g, id: data.task.id } : g
      ))
    } catch {
      // Remove on error
      setGoals(prev => prev.filter(g => g.id !== tempId))
    }
  }

  const updateGoalText = async (id: string) => {
    if (!editText.trim()) {
      setEditingId(null)
      return
    }

    const originalGoal = goals.find(g => g.id === id)
    if (!originalGoal || originalGoal.text === editText.trim()) {
      setEditingId(null)
      return
    }

    // Optimistic update
    setGoals(prev => prev.map(g =>
      g.id === id ? { ...g, text: editText.trim() } : g
    ))
    setEditingId(null)

    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText.trim() }),
      })
    } catch {
      // Revert on error
      setGoals(prev => prev.map(g =>
        g.id === id ? { ...g, text: originalGoal.text } : g
      ))
    }
  }

  const deleteGoal = async (id: string) => {
    const goalToDelete = goals.find(g => g.id === id)
    if (!goalToDelete) return

    // Optimistic delete
    setGoals(prev => prev.filter(g => g.id !== id))

    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    } catch {
      // Restore on error
      setGoals(prev => [...prev, goalToDelete])
    }
  }

  const handleReorder = async (newOrder: Goal[]) => {
    setGoals([...newOrder, ...completedGoals])

    // Update priorities based on new order
    const updates = newOrder.map((goal, index) => ({
      id: goal.id,
      priority: newOrder.length - index,
    }))

    // Batch update priorities
    try {
      await Promise.all(
        updates.map(({ id, priority }) =>
          fetch(`/api/tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority }),
          })
        )
      )
    } catch (error) {
      console.error('Failed to update priorities:', error)
    }
  }

  const getCategoryColor = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.color || 'bg-slate-700/50 text-slate-400 border-slate-600'
  }

  const startEditing = (goal: Goal) => {
    setEditingId(goal.id)
    setEditText(goal.text)
  }

  return (
    <div
      className="backdrop-blur-sm rounded-xl p-6 transition-all h-full flex flex-col"
      style={{
        backgroundColor: '#111827',
        border: '1px solid #1e293b'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Today&apos;s Goals
        </span>
        <span className="text-xs text-slate-400">
          {completedCount}/{goals.length} complete
        </span>
      </div>

      {/* Goals List */}
      <div className="flex-1 overflow-y-auto -mx-6 px-6">
        <Reorder.Group
          axis="y"
          values={activeGoals}
          onReorder={handleReorder}
          className="space-y-0"
        >
          <AnimatePresence mode="popLayout">
            {activeGoals.map((goal) => (
              <Reorder.Item
                key={goal.id}
                value={goal}
                className="group"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className="flex items-center gap-2 py-2.5 cursor-default hover:bg-slate-700/20 -mx-6 px-6 transition-colors border-b border-slate-800/50"
                >
                  {/* Drag Handle */}
                  <div className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical size={14} className="text-slate-600" />
                  </div>

                  {/* Checkbox */}
                  <button
                    onClick={() => toggleGoal(goal.id)}
                    className="flex-shrink-0 focus:outline-none"
                  >
                    <motion.div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        goal.done
                          ? 'bg-green-500 border-green-500'
                          : 'border-slate-500 hover:border-green-400'
                      }`}
                      whileTap={{ scale: 0.9 }}
                    >
                      <AnimatePresence>
                        {goal.done && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <Check size={12} className="text-white" strokeWidth={3} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </button>

                  {/* Text */}
                  {editingId === goal.id ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => updateGoalText(goal.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') updateGoalText(goal.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none border-b border-blue-500"
                    />
                  ) : (
                    <span
                      onClick={() => startEditing(goal)}
                      className={`flex-1 text-sm cursor-text ${
                        goal.done ? 'text-slate-500 line-through' : 'text-slate-200'
                      }`}
                    >
                      {goal.text}
                    </span>
                  )}

                  {/* Recurring indicator */}
                  {goal.recurring && (
                    <Repeat size={12} className="text-slate-500 flex-shrink-0" />
                  )}

                  {/* Category Badge */}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getCategoryColor(goal.category)} flex-shrink-0`}>
                    {goal.category}
                  </span>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {/* Completed Goals (not draggable) */}
        <AnimatePresence>
          {completedGoals.map((goal) => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0, x: -100 }}
              className="flex items-center gap-2 py-2.5 -mx-6 px-6 group"
            >
              <div className="w-[14px]" /> {/* Spacer for alignment */}

              <button
                onClick={() => toggleGoal(goal.id)}
                className="flex-shrink-0 focus:outline-none"
              >
                <motion.div
                  className="w-5 h-5 rounded-full bg-green-500 border-2 border-green-500 flex items-center justify-center"
                  whileTap={{ scale: 0.9 }}
                >
                  <Check size={12} className="text-white" strokeWidth={3} />
                </motion.div>
              </button>

              <span className="flex-1 text-sm text-slate-500 line-through">
                {goal.text}
              </span>

              <button
                onClick={() => deleteGoal(goal.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {goals.length === 0 && !isAdding && (
          <div className="text-center py-8 text-slate-500 text-sm">
            No goals yet. Add one below!
          </div>
        )}
      </div>

      {/* Add Goal Section */}
      <div className="pt-4 border-t border-slate-800/50 mt-auto">
        <AnimatePresence mode="wait">
          {isAdding ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              {/* Goal Input */}
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-slate-600 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={newGoalText}
                  onChange={(e) => setNewGoalText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newGoalText.trim()) addGoal()
                    if (e.key === 'Escape') {
                      setIsAdding(false)
                      setNewGoalText('')
                    }
                  }}
                  placeholder="What do you want to accomplish?"
                  className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Options Row */}
              <div className="flex items-center gap-2 pl-7">
                {/* Category Picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                    className={`text-[10px] px-2 py-1 rounded border flex items-center gap-1 ${getCategoryColor(newGoalCategory)}`}
                  >
                    {newGoalCategory}
                    <ChevronDown size={10} />
                  </button>
                  {showCategoryPicker && (
                    <div className="absolute bottom-full left-0 mb-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 min-w-[100px]">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.value}
                          onClick={() => {
                            setNewGoalCategory(cat.value)
                            setShowCategoryPicker(false)
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-700"
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recurrence Picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowRecurrencePicker(!showRecurrencePicker)}
                    className="text-[10px] px-2 py-1 rounded border border-slate-600 text-slate-400 flex items-center gap-1 hover:border-slate-500"
                  >
                    {newGoalRecurring ? (
                      <>
                        <Repeat size={10} />
                        {RECURRENCE_OPTIONS.find(o => o.value === newGoalRecurring)?.label}
                      </>
                    ) : (
                      <>
                        <Calendar size={10} />
                        Today only
                      </>
                    )}
                    <ChevronDown size={10} />
                  </button>
                  {showRecurrencePicker && (
                    <div className="absolute bottom-full left-0 mb-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 min-w-[120px]">
                      {RECURRENCE_OPTIONS.map(opt => (
                        <button
                          key={opt.value || 'null'}
                          onClick={() => {
                            setNewGoalRecurring(opt.value)
                            setShowRecurrencePicker(false)
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                        >
                          <opt.icon size={12} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1" />

                {/* Action Buttons */}
                <button
                  onClick={() => {
                    setIsAdding(false)
                    setNewGoalText('')
                    setShowCategoryPicker(false)
                    setShowRecurrencePicker(false)
                  }}
                  className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={addGoal}
                  disabled={!newGoalText.trim()}
                  className="text-xs bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-3 py-1 rounded transition-colors"
                >
                  Add
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium w-full"
            >
              <Plus size={16} />
              Add goal
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
