'use client'

import { useState, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  Calendar as CalendarIcon
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'

interface CalendarTask {
  id: string
  text: string
  date: Date
  startTime?: string
  endTime?: string
  category?: string
  done: boolean
}

interface CalendarProps {
  tasks?: CalendarTask[]
  onAddTask?: (task: Omit<CalendarTask, 'id' | 'done'>) => void
  onToggleTask?: (taskId: string) => void
  onDeleteTask?: (taskId: string) => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const CATEGORIES = [
  { value: 'study', label: 'Study' },
  { value: 'clinical', label: 'Clinical' },
  { value: 'personal', label: 'Personal' },
  { value: 'uworld', label: 'UWorld' },
  { value: 'anki', label: 'Anki' },
]

const CATEGORY_COLORS: Record<string, string> = {
  study: 'bg-blue-500',
  clinical: 'bg-green-500',
  personal: 'bg-purple-500',
  uworld: 'bg-orange-500',
  anki: 'bg-pink-500',
}

export function Calendar({ tasks = [], onAddTask, onToggleTask, onDeleteTask }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    text: '',
    startTime: '09:00',
    endTime: '10:00',
    category: 'study',
  })

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get the day of week the month starts on (0 = Sunday)
  const startDay = monthStart.getDay()

  // Create padding for days before the month starts
  const paddingDays = Array(startDay).fill(null)

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
    setIsModalOpen(true)
  }

  const handleAddTask = () => {
    if (!selectedDate || !newTask.text.trim()) return

    onAddTask?.({
      text: newTask.text,
      date: selectedDate,
      startTime: newTask.startTime,
      endTime: newTask.endTime,
      category: newTask.category,
    })

    setNewTask({
      text: '',
      startTime: '09:00',
      endTime: '10:00',
      category: 'study',
    })
  }

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => isSameDay(new Date(task.date), day))
  }

  const selectedDayTasks = selectedDate ? getTasksForDay(selectedDate) : []

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <CalendarIcon size={20} className="text-blue-400" />
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="text-xs"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousMonth}
          >
            <ChevronLeft size={18} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="text-center text-xs font-medium text-slate-400 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Padding days */}
        {paddingDays.map((_, index) => (
          <div key={`pad-${index}`} className="aspect-square" />
        ))}

        {/* Month days */}
        {monthDays.map(day => {
          const dayTasks = getTasksForDay(day)
          const hasTasksToday = dayTasks.length > 0
          const isCurrentDay = isToday(day)

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={cn(
                'aspect-square rounded-lg flex flex-col items-center justify-center relative transition-colors',
                'hover:bg-slate-700/50',
                isCurrentDay && 'bg-blue-500/20 border border-blue-500/50',
                !isCurrentDay && 'border border-transparent'
              )}
            >
              <span
                className={cn(
                  'text-sm',
                  isCurrentDay ? 'text-blue-400 font-semibold' : 'text-slate-300'
                )}
              >
                {format(day, 'd')}
              </span>
              {hasTasksToday && (
                <div className="flex gap-0.5 mt-1">
                  {dayTasks.slice(0, 3).map((task, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        CATEGORY_COLORS[task.category || 'study'] || 'bg-blue-500'
                      )}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[8px] text-slate-400">+{dayTasks.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Day Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a day'}
      >
        <div className="space-y-4">
          {/* Add new task form */}
          <div className="p-4 bg-slate-900/50 rounded-lg space-y-3">
            <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Plus size={16} />
              Add Task
            </h4>
            <Input
              placeholder="What do you need to do?"
              value={newTask.text}
              onChange={(e) => setNewTask({ ...newTask, text: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Start Time</label>
                <Input
                  type="time"
                  value={newTask.startTime}
                  onChange={(e) => setNewTask({ ...newTask, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">End Time</label>
                <Input
                  type="time"
                  value={newTask.endTime}
                  onChange={(e) => setNewTask({ ...newTask, endTime: e.target.value })}
                />
              </div>
            </div>
            <Select
              value={newTask.category}
              onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
              options={CATEGORIES}
            />
            <Button
              onClick={handleAddTask}
              disabled={!newTask.text.trim()}
              className="w-full"
            >
              Add Task
            </Button>
          </div>

          {/* Tasks for selected day */}
          {selectedDayTasks.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">
                Tasks ({selectedDayTasks.length})
              </h4>
              {selectedDayTasks.map(task => (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg bg-slate-900/50',
                    task.done && 'opacity-50'
                  )}
                >
                  <button
                    onClick={() => onToggleTask?.(task.id)}
                    className={cn(
                      'w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center',
                      task.done
                        ? 'bg-green-500 border-green-500'
                        : 'border-slate-600 hover:border-slate-500'
                    )}
                  >
                    {task.done && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm text-slate-200',
                      task.done && 'line-through'
                    )}>
                      {task.text}
                    </p>
                    {(task.startTime || task.endTime) && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <Clock size={12} />
                        {task.startTime}{task.endTime && ` - ${task.endTime}`}
                      </p>
                    )}
                  </div>
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      CATEGORY_COLORS[task.category || 'study'] || 'bg-blue-500'
                    )}
                  />
                  <button
                    onClick={() => onDeleteTask?.(task.id)}
                    className="text-slate-400 hover:text-red-400 flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">
              No tasks scheduled for this day
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
