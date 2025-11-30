'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react'
import { MonthView } from '@/components/calendar/MonthView'
import { WeekView } from '@/components/calendar/WeekView'
import { DayView } from '@/components/calendar/DayView'
import { EventModal } from '@/components/calendar/EventModal'

type ViewMode = 'month' | 'week' | 'day'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  isAllDay: boolean
  eventType: string
  category?: string
  color?: string
  isRecurring: boolean
  recurrenceRule?: string
  reminderMins: number[]
}

export default function CalendarPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Calculate date range for fetching events
  const getDateRange = () => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    if (viewMode === 'month') {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1)
      end.setDate(0)
      end.setHours(23, 59, 59, 999)
    } else if (viewMode === 'week') {
      const day = start.getDay()
      start.setDate(start.getDate() - day)
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
    } else {
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
    }

    return { start, end }
  }

  const { start, end } = getDateRange()

  // Fetch events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar-events', start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const res = await fetch(
        `/api/calendar?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      )
      if (!res.ok) throw new Error('Failed to fetch events')
      return res.json()
    },
    enabled: !!session,
  })

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: Partial<CalendarEvent>) => {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create event')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      setIsEventModalOpen(false)
      setSelectedEvent(null)
      setSelectedDate(null)
    },
  })

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CalendarEvent> & { id: string }) => {
      const res = await fetch(`/api/calendar/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update event')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      setIsEventModalOpen(false)
      setSelectedEvent(null)
    },
  })

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/calendar/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete event')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      setIsEventModalOpen(false)
      setSelectedEvent(null)
    },
  })

  const handlePrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() - 1)
    }
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    setCurrentDate(newDate)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setIsEventModalOpen(true)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsEventModalOpen(true)
  }

  const handleSaveEvent = (data: Partial<CalendarEvent>) => {
    if (selectedEvent) {
      updateEventMutation.mutate({ ...data, id: selectedEvent.id })
    } else {
      createEventMutation.mutate(data)
    }
  }

  const handleDeleteEvent = () => {
    if (selectedEvent) {
      deleteEventMutation.mutate(selectedEvent.id)
    }
  }

  const getDateLabel = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } else if (viewMode === 'week') {
      const weekStart = new Date(currentDate)
      const day = weekStart.getDay()
      weekStart.setDate(weekStart.getDate() - day)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Calendar</h1>
          <p className="text-slate-400 mt-1">Manage your schedule and events</p>
        </div>
        <Button onClick={() => setIsEventModalOpen(true)}>
          <Plus size={16} className="mr-2" />
          New Event
        </Button>
      </div>

      {/* Calendar Controls */}
      <div className="flex items-center justify-between bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePrevious}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="secondary" size="sm" onClick={handleNext}>
            <ChevronRight size={16} />
          </Button>
          <span className="ml-4 text-lg font-semibold text-slate-100">{getDateLabel()}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'month' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('month')}
          >
            Month
          </Button>
          <Button
            variant={viewMode === 'week' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('week')}
          >
            Week
          </Button>
          <Button
            variant={viewMode === 'day' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('day')}
          >
            Day
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-slate-400">Loading calendar...</div>
          </div>
        ) : (
          <>
            {viewMode === 'month' && (
              <MonthView
                currentDate={currentDate}
                events={events}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
              />
            )}
            {viewMode === 'week' && (
              <WeekView
                currentDate={currentDate}
                events={events}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
              />
            )}
            {viewMode === 'day' && (
              <DayView
                currentDate={currentDate}
                events={events}
                onEventClick={handleEventClick}
              />
            )}
          </>
        )}
      </div>

      {/* Event Modal */}
      {isEventModalOpen && (
        <EventModal
          event={selectedEvent}
          initialDate={selectedDate}
          onClose={() => {
            setIsEventModalOpen(false)
            setSelectedEvent(null)
            setSelectedDate(null)
          }}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          isSaving={createEventMutation.isPending || updateEventMutation.isPending}
          isDeleting={deleteEventMutation.isPending}
        />
      )}
    </div>
  )
}
