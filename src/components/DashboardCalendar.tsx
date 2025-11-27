'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar } from './Calendar'

interface Task {
  id: string
  text: string
  date: Date
  startTime?: string
  endTime?: string
  category?: string
  done: boolean
  dueDate?: Date
}

export function DashboardCalendar() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      if (res.ok) {
        const data = await res.json()
        // Transform tasks to include date from dueDate
        const transformedTasks = data.tasks.map((task: Task) => ({
          ...task,
          date: task.dueDate || new Date(),
        }))
        setTasks(transformedTasks)
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleAddTask = async (task: { text: string; date: Date; startTime?: string; endTime?: string; category?: string }) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: task.text,
          dueDate: task.date.toISOString(),
          category: task.category,
          // Store time info in the text or a notes field for now
          // We could extend the Task model later to have startTime/endTime
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setTasks(prev => [...prev, {
          ...data.task,
          date: new Date(data.task.dueDate),
          startTime: task.startTime,
          endTime: task.endTime,
        }])
      }
    } catch (error) {
      console.error('Failed to add task:', error)
    }
  }

  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !task.done }),
      })

      if (res.ok) {
        setTasks(prev =>
          prev.map(t => (t.id === taskId ? { ...t, done: !t.done } : t))
        )
      }
    } catch (error) {
      console.error('Failed to toggle task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId))
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-7 gap-1">
          {Array(35).fill(0).map((_, i) => (
            <div key={i} className="aspect-square bg-slate-700/50 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Calendar
      tasks={tasks}
      onAddTask={handleAddTask}
      onToggleTask={handleToggleTask}
      onDeleteTask={handleDeleteTask}
    />
  )
}
