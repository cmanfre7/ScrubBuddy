'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Settings2, RefreshCw, Copy, Check, Cloud, Apple } from 'lucide-react'
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
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [feedUrlCopied, setFeedUrlCopied] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

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

  // Fetch Google Calendar status
  const { data: googleCalendarStatus, refetch: refetchGoogleStatus } = useQuery({
    queryKey: ['google-calendar-status'],
    queryFn: async () => {
      const res = await fetch('/api/google-calendar/status')
      if (!res.ok) return { connected: false }
      return res.json()
    },
  })

  // Fetch ICS feed info
  const { data: feedData, refetch: refetchFeed } = useQuery({
    queryKey: ['calendar-feed'],
    queryFn: async () => {
      const res = await fetch('/api/calendar-feed')
      if (!res.ok) return { exists: false }
      return res.json()
    },
  })

  // Generate ICS feed URL
  const feedUrl = feedData?.token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/feed/${feedData.token}`
    : null

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

  const handleShowMoreClick = (date: Date) => {
    setCurrentDate(date)
    setViewMode('day')
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

  // Calendar sync handlers
  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/google-calendar/connect')
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        alert(data.error)
      }
    } catch (error) {
      console.error('Failed to connect Google Calendar:', error)
    }
  }

  const handleDisconnectGoogle = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) return
    try {
      await fetch('/api/google-calendar/disconnect', { method: 'POST' })
      refetchGoogleStatus()
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    } catch (error) {
      console.error('Failed to disconnect Google Calendar:', error)
    }
  }

  const handleSyncGoogle = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/google-calendar/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        alert(`Sync complete! Pulled: ${data.pulled}, Pushed: ${data.pushed}`)
        refetchGoogleStatus()
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      } else {
        alert(data.error || 'Sync failed')
      }
    } catch (error) {
      console.error('Failed to sync:', error)
      alert('Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleGenerateFeed = async () => {
    try {
      await fetch('/api/calendar-feed', { method: 'POST' })
      refetchFeed()
    } catch (error) {
      console.error('Failed to generate feed:', error)
    }
  }

  const handleCopyFeedUrl = () => {
    if (feedUrl) {
      navigator.clipboard.writeText(feedUrl)
      setFeedUrlCopied(true)
      setTimeout(() => setFeedUrlCopied(false), 2000)
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
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setIsSyncModalOpen(true)}>
            <Settings2 size={16} className="mr-2" />
            Sync
            {googleCalendarStatus?.connected && (
              <span className="ml-2 w-2 h-2 bg-green-400 rounded-full" />
            )}
          </Button>
          <Button onClick={() => setIsEventModalOpen(true)}>
            <Plus size={16} className="mr-2" />
            New Event
          </Button>
        </div>
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
                onShowMoreClick={handleShowMoreClick}
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

      {/* Sync Modal */}
      <Modal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} title="Calendar Sync">
        <div className="space-y-6">
          {/* Google Calendar Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Cloud size={18} className="text-blue-400" />
              <span className="font-medium text-slate-200">Google Calendar</span>
              {googleCalendarStatus?.connected && (
                <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">Connected</span>
              )}
            </div>

            {googleCalendarStatus?.connected ? (
              <div className="space-y-3 pl-7">
                <p className="text-sm text-slate-400">
                  Connected as {googleCalendarStatus.googleEmail}
                </p>
                {googleCalendarStatus.lastSyncAt && (
                  <p className="text-xs text-slate-500">
                    Last synced: {new Date(googleCalendarStatus.lastSyncAt).toLocaleString()}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSyncGoogle} disabled={isSyncing}>
                    <RefreshCw size={14} className={`mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={handleDisconnectGoogle}>
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pl-7">
                <p className="text-sm text-slate-500 mb-3">
                  Two-way sync between ScrubBuddy and Google Calendar
                </p>
                <Button size="sm" onClick={handleConnectGoogle}>
                  <Cloud size={14} className="mr-1" />
                  Connect Google Calendar
                </Button>
              </div>
            )}
          </div>

          <hr className="border-slate-700" />

          {/* Apple Calendar / ICS Feed Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Apple size={18} className="text-slate-300" />
              <span className="font-medium text-slate-200">Apple Calendar / Other Apps</span>
            </div>

            <div className="pl-7 space-y-3">
              <p className="text-sm text-slate-500">
                Subscribe to see ScrubBuddy events in Apple Calendar, Outlook, or any calendar app.
                <br />
                <span className="text-slate-600">(One-way: ScrubBuddy → Calendar app)</span>
              </p>

              {feedUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-slate-800 px-2 py-1.5 rounded text-slate-300 truncate">
                      {feedUrl}
                    </code>
                    <Button size="sm" variant="secondary" onClick={handleCopyFeedUrl}>
                      {feedUrlCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-600">
                    Apple Calendar: File → New Calendar Subscription → paste URL
                  </p>
                  <Button size="sm" variant="secondary" onClick={handleGenerateFeed}>
                    <RefreshCw size={14} className="mr-1" />
                    Regenerate URL
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={handleGenerateFeed}>
                  Generate Feed URL
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
