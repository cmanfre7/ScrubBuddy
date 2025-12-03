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
  ChevronDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle
} from 'lucide-react'

interface Goal {
  id: string
  text: string
  done: boolean
  category: string
  priority: number
  recurring: string | null
  dueDate?: string | null
}

interface GoalsWidgetProps {
  initialGoals: Goal[]
}

const CATEGORIES = [
  { value: 'UWorld', label: 'UWorld', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'Clinical', label: 'Clinical', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'Study', label: 'Study', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'Assignment', label: 'Assignment', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'Personal', label: 'Personal', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
]

// Helper to get deadline badge info
const getDeadlineBadge = (dueDate: string | null | undefined, selectedDate: string): { text: string; urgent: boolean; overdue: boolean } | null => {
  if (!dueDate) return null

  const dueDateObj = new Date(dueDate)
  dueDateObj.setHours(0, 0, 0, 0)

  const selectedDateObj = new Date(selectedDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Calculate days from selected date to due date
  const diffTime = dueDateObj.getTime() - selectedDateObj.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  // Only show deadline badge if the task is due on a different day than selected
  if (diffDays === 0) return null

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays)
    return {
      text: absDays === 1 ? '1 day overdue' : `${absDays} days overdue`,
      urgent: true,
      overdue: true
    }
  }

  if (diffDays === 1) {
    return { text: 'Due tomorrow', urgent: true, overdue: false }
  }

  if (diffDays <= 3) {
    return { text: `Due in ${diffDays} days`, urgent: true, overdue: false }
  }

  if (diffDays <= 7) {
    return { text: `Due in ${diffDays} days`, urgent: false, overdue: false }
  }

  return null // Don't show badge for tasks due more than a week out
}

const RECURRENCE_OPTIONS = [
  { value: null, label: 'One-time', icon: Calendar },
  { value: 'daily', label: 'Every day', icon: Repeat },
  { value: 'weekdays', label: 'Weekdays', icon: Repeat },
]

// Helper to get date string in YYYY-MM-DD format
const getDateString = (date: Date) => {
  return date.toISOString().split('T')[0]
}

// Helper to format date for display
const formatDateLabel = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (dateStr === getDateString(today)) return 'Today'
  if (dateStr === getDateString(tomorrow)) return 'Tomorrow'

  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// Format date for header display
const formatHeaderDate = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (dateStr === getDateString(today)) return "Today's Tasks"
  if (dateStr === getDateString(yesterday)) return "Yesterday's Tasks"
  if (dateStr === getDateString(tomorrow)) return "Tomorrow's Tasks"

  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function GoalsWidget({ initialGoals }: GoalsWidgetProps) {
  const [selectedDate, setSelectedDate] = useState<string>(getDateString(new Date()))
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newGoalText, setNewGoalText] = useState('')
  const [newGoalCategory, setNewGoalCategory] = useState('Study')
  const [newGoalRecurring, setNewGoalRecurring] = useState<string | null>(null)
  const [newGoalDueDate, setNewGoalDueDate] = useState<string>(getDateString(new Date()))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const isToday = selectedDate === getDateString(new Date())

  // Navigation functions
  const goToPreviousDay = () => {
    const current = new Date(selectedDate + 'T00:00:00')
    current.setDate(current.getDate() - 1)
    setSelectedDate(getDateString(current))
  }

  const goToNextDay = () => {
    const current = new Date(selectedDate + 'T00:00:00')
    current.setDate(current.getDate() + 1)
    setSelectedDate(getDateString(current))
  }

  // Fetch goals when date changes
  useEffect(() => {
    const fetchGoalsForDate = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/tasks?date=${selectedDate}`)
        if (res.ok) {
          const data = await res.json()
          setGoals(data.tasks || [])
        }
      } catch (error) {
        console.error('Failed to fetch goals:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchGoalsForDate()
  }, [selectedDate])

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
      // Pass date for recurring tasks so completion is tracked per-day
      const payload: { done: boolean; date?: string } = { done: newDoneState }
      if (goal.recurring) {
        payload.date = selectedDate
      }

      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    // Use selectedDate for the new goal's due date
    const goalDueDate = newGoalDueDate
    const newGoal: Goal = {
      id: tempId,
      text: newGoalText.trim(),
      done: false,
      category: newGoalCategory,
      priority: goals.length + 1,
      recurring: newGoalRecurring,
      dueDate: goalDueDate,
    }

    // Add to visible list if it matches the selected date
    if (goalDueDate === selectedDate) {
      setGoals(prev => [newGoal, ...prev])
    }
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
          dueDate: goalDueDate,
        }),
      })
      const data = await res.json()
      // Replace temp ID with real ID (if it was added to the list)
      if (goalDueDate === selectedDate) {
        setGoals(prev => prev.map(g =>
          g.id === tempId ? { ...g, id: data.task.id } : g
        ))
      }
    } catch {
      // Remove on error (if it was added to the list)
      if (goalDueDate === selectedDate) {
        setGoals(prev => prev.filter(g => g.id !== tempId))
      }
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
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousDay}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide min-w-[120px] text-center">
            {formatHeaderDate(selectedDate)}
          </span>
          <button
            onClick={goToNextDay}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <span className="text-xs text-slate-400">
          {isLoading ? '...' : `${completedCount}/${goals.length} complete`}
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

                  {/* Deadline Badge - only for non-recurring tasks */}
                  {!goal.recurring && (() => {
                    const badge = getDeadlineBadge(goal.dueDate, selectedDate)
                    if (!badge) return null
                    return (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 flex-shrink-0 ${
                        badge.overdue
                          ? 'bg-red-500/30 text-red-300'
                          : badge.urgent
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'bg-slate-600/30 text-slate-400'
                      }`}>
                        {badge.overdue ? <AlertCircle size={10} /> : <Clock size={10} />}
                        {badge.text}
                      </span>
                    )
                  })()}

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

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8 text-slate-500 text-sm">
            Loading goals...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && goals.length === 0 && !isAdding && (
          <div className="text-center py-8 text-slate-500 text-sm">
            {isToday ? 'No tasks yet. Add one below!' : 'No tasks for this day.'}
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

                {/* Date Picker */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowDatePicker(!showDatePicker)
                      setShowRecurrencePicker(false)
                    }}
                    className="text-[10px] px-2 py-1 rounded border border-slate-600 text-slate-400 flex items-center gap-1 hover:border-slate-500"
                  >
                    <CalendarDays size={10} />
                    {formatDateLabel(newGoalDueDate)}
                    <ChevronDown size={10} />
                  </button>
                  {showDatePicker && (
                    <div className="absolute bottom-full left-0 mb-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 min-w-[140px]">
                      {/* Quick date options */}
                      {(() => {
                        const today = new Date()
                        const tomorrow = new Date(today)
                        tomorrow.setDate(tomorrow.getDate() + 1)
                        const dayAfter = new Date(today)
                        dayAfter.setDate(dayAfter.getDate() + 2)
                        const nextWeek = new Date(today)
                        nextWeek.setDate(nextWeek.getDate() + 7)

                        return [
                          { date: today, label: 'Today' },
                          { date: tomorrow, label: 'Tomorrow' },
                          { date: dayAfter, label: dayAfter.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) },
                          { date: nextWeek, label: 'Next week' },
                        ].map(({ date, label }) => (
                          <button
                            key={label}
                            onClick={() => {
                              setNewGoalDueDate(getDateString(date))
                              setShowDatePicker(false)
                            }}
                            className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-700 flex items-center gap-2 ${
                              getDateString(date) === newGoalDueDate ? 'text-blue-400 bg-blue-500/10' : 'text-slate-300'
                            }`}
                          >
                            <CalendarDays size={12} />
                            {label}
                          </button>
                        ))
                      })()}
                      {/* Custom date input */}
                      <div className="border-t border-slate-700 mt-1 pt-1 px-2 pb-1">
                        <input
                          type="date"
                          value={newGoalDueDate}
                          onChange={(e) => {
                            setNewGoalDueDate(e.target.value)
                            setShowDatePicker(false)
                          }}
                          min={getDateString(new Date())}
                          className="w-full px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Recurrence Picker */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowRecurrencePicker(!showRecurrencePicker)
                      setShowDatePicker(false)
                    }}
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
                        One-time
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
                    setShowDatePicker(false)
                    setNewGoalDueDate(selectedDate)
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
              onClick={() => {
                setNewGoalDueDate(selectedDate)
                setIsAdding(true)
              }}
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium w-full"
            >
              <Plus size={16} />
              Add task
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
