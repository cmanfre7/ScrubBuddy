'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle } from 'lucide-react'

interface UWorldLog {
  id: string
  date: string
  questionsTotal: number
  questionsCorrect: number
  timeSpentMins: number | null
  mode: string | null
  blockName: string | null
  notes: string | null
}

interface EditSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  session: UWorldLog | null
}

export function EditSessionModal({ isOpen, onClose, onSuccess, session }: EditSessionModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    date: '',
    questionsTotal: '',
    questionsCorrect: '',
    timeSpentMins: '',
    mode: '',
    blockName: '',
    notes: '',
  })

  // Populate form when session changes
  useEffect(() => {
    if (session) {
      setFormData({
        date: new Date(session.date).toISOString().split('T')[0],
        questionsTotal: session.questionsTotal.toString(),
        questionsCorrect: session.questionsCorrect.toString(),
        timeSpentMins: session.timeSpentMins?.toString() || '',
        mode: session.mode || '',
        blockName: session.blockName || '',
        notes: session.notes || '',
      })
    }
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return

    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const res = await fetch(`/api/uworld/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(formData.date).toISOString(),
          questionsTotal: parseInt(formData.questionsTotal),
          questionsCorrect: parseInt(formData.questionsCorrect),
          timeSpentMins: formData.timeSpentMins ? parseInt(formData.timeSpentMins) : null,
          mode: formData.mode || null,
          blockName: formData.blockName || null,
          notes: formData.notes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update session')
      }

      setSuccess('Session updated successfully!')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!session) return
    if (!confirm('Are you sure you want to delete this session?')) return

    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch(`/api/uworld/${session.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete session')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) return null

  const percentage = formData.questionsTotal && formData.questionsCorrect
    ? Math.round((parseInt(formData.questionsCorrect) / parseInt(formData.questionsTotal)) * 100)
    : 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Session">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2 mb-4">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-900/30 border border-green-700/50 text-green-400 p-3 rounded-lg text-sm mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Date *"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Total Questions *"
            type="number"
            placeholder="40"
            value={formData.questionsTotal}
            onChange={(e) => setFormData({ ...formData, questionsTotal: e.target.value })}
            required
            min="1"
          />
          <Input
            label="Questions Correct *"
            type="number"
            placeholder="32"
            value={formData.questionsCorrect}
            onChange={(e) => setFormData({ ...formData, questionsCorrect: e.target.value })}
            required
            min="0"
          />
        </div>

        {formData.questionsTotal && formData.questionsCorrect && (
          <div className="text-center py-2 bg-slate-800/50 rounded-lg">
            <span className="text-slate-400">Score: </span>
            <span className={`font-bold ${percentage >= 70 ? 'text-green-400' : percentage >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {percentage}%
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Time Spent (minutes)"
            type="number"
            placeholder="60"
            value={formData.timeSpentMins}
            onChange={(e) => setFormData({ ...formData, timeSpentMins: e.target.value })}
            min="0"
          />
          <Select
            label="Mode"
            value={formData.mode}
            onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
            options={[
              { value: '', label: 'Select mode...' },
              { value: 'Timed', label: 'Timed' },
              { value: 'Tutor', label: 'Tutor' },
              { value: 'Test', label: 'Test' },
              { value: 'Review', label: 'Review' },
            ]}
          />
        </div>

        <Input
          label="Block/Test Name"
          type="text"
          placeholder="e.g., Week 1 - OBGYN"
          value={formData.blockName}
          onChange={(e) => setFormData({ ...formData, blockName: e.target.value })}
        />

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Notes
          </label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any notes about this session..."
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleDelete}
            disabled={isLoading}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            Delete
          </Button>
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
