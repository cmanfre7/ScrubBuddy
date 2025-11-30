import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { X, Trash2, Clock, MapPin, Tag, Bell } from 'lucide-react'

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
  reminderMins: number[]
}

interface EventModalProps {
  event: CalendarEvent | null
  initialDate: Date | null
  onClose: () => void
  onSave: (data: Partial<CalendarEvent>) => void
  onDelete?: () => void
  isSaving?: boolean
  isDeleting?: boolean
}

const EVENT_TYPES = [
  { value: 'clinical', label: 'Clinical' },
  { value: 'exam', label: 'Exam' },
  { value: 'study', label: 'Study Session' },
  { value: 'lecture', label: 'Lecture' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'personal', label: 'Personal' },
]

const REMINDER_OPTIONS = [
  { value: '0', label: 'At time of event' },
  { value: '5', label: '5 minutes before' },
  { value: '15', label: '15 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '1440', label: '1 day before' },
]

export function EventModal({
  event,
  initialDate,
  onClose,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: EventModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    isAllDay: false,
    eventType: 'personal',
    category: '',
    color: '',
    reminderMins: [] as number[],
  })

  useEffect(() => {
    if (event) {
      const start = new Date(event.startTime)
      const end = new Date(event.endTime)

      setFormData({
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        startTime: start.toISOString().slice(0, 16),
        endTime: end.toISOString().slice(0, 16),
        isAllDay: event.isAllDay,
        eventType: event.eventType,
        category: event.category || '',
        color: event.color || '',
        reminderMins: event.reminderMins || [],
      })
    } else if (initialDate) {
      const start = new Date(initialDate)
      const end = new Date(initialDate)
      end.setHours(end.getHours() + 1)

      setFormData({
        ...formData,
        startTime: start.toISOString().slice(0, 16),
        endTime: end.toISOString().slice(0, 16),
      })
    }
  }, [event, initialDate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const data: Partial<CalendarEvent> = {
      title: formData.title,
      description: formData.description || undefined,
      location: formData.location || undefined,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString(),
      isAllDay: formData.isAllDay,
      eventType: formData.eventType,
      category: formData.category || undefined,
      color: formData.color || undefined,
      reminderMins: formData.reminderMins,
    }

    onSave(data)
  }

  const toggleReminder = (minutes: number) => {
    setFormData({
      ...formData,
      reminderMins: formData.reminderMins.includes(minutes)
        ? formData.reminderMins.filter((m) => m !== minutes)
        : [...formData.reminderMins, minutes].sort((a, b) => a - b),
    })
  }

  return (
    <Modal isOpen onClose={onClose} title={event ? 'Edit Event' : 'New Event'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <Input
            label="Event Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Morning Rounds, Study Session"
            required
          />
        </div>

        {/* Event Type */}
        <div>
          <Select
            label="Event Type"
            value={formData.eventType}
            onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
            options={EVENT_TYPES}
            required
          />
        </div>

        {/* All Day Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isAllDay"
            checked={formData.isAllDay}
            onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
          />
          <label htmlFor="isAllDay" className="text-sm text-slate-300">
            All day event
          </label>
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Clock size={14} className="inline mr-2" />
            Start {formData.isAllDay ? 'Date' : 'Time'}
          </label>
          <input
            type={formData.isAllDay ? 'date' : 'datetime-local'}
            value={formData.isAllDay ? formData.startTime.split('T')[0] : formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* End Time */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Clock size={14} className="inline mr-2" />
            End {formData.isAllDay ? 'Date' : 'Time'}
          </label>
          <input
            type={formData.isAllDay ? 'date' : 'datetime-local'}
            value={formData.isAllDay ? formData.endTime.split('T')[0] : formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <MapPin size={14} className="inline mr-2" />
            Location (optional)
          </label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Hospital, Zoom, Library"
          />
        </div>

        {/* Description */}
        <div>
          <Textarea
            label="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add notes, agenda, or details..."
            rows={3}
          />
        </div>

        {/* Reminders */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Bell size={14} className="inline mr-2" />
            Reminders
          </label>
          <div className="space-y-2">
            {REMINDER_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.reminderMins.includes(parseInt(option.value))}
                  onChange={() => toggleReminder(parseInt(option.value))}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-300">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700">
          {event && onDelete ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onDelete}
              disabled={isDeleting}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 size={16} className="mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : event ? 'Save Changes' : 'Create Event'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
