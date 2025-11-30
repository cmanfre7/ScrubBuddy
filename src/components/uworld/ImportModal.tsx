'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle } from 'lucide-react'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Manual entry state
  const [totalCorrect, setTotalCorrect] = useState('')
  const [totalIncorrect, setTotalIncorrect] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const res = await fetch('/api/uworld/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalCorrect: parseInt(totalCorrect),
          totalIncorrect: parseInt(totalIncorrect),
          notes,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to import data')
      }

      setSuccess(
        `Successfully imported ${data.stats.totalQuestions} questions (${data.stats.percentage}% correct)!`
      )
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const totalQuestions =
    totalCorrect && totalIncorrect
      ? parseInt(totalCorrect) + parseInt(totalIncorrect)
      : 0
  const percentage =
    totalQuestions > 0
      ? Math.round((parseInt(totalCorrect || '0') / totalQuestions) * 100)
      : 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import UWorld Progress">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-green-900/30 border border-green-700/50 text-green-400 p-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        <div
          className="bg-blue-900/20 border border-blue-700/30 p-3 rounded-lg text-xs text-blue-300"
        >
          <p className="font-medium mb-1">From your UWorld Performance PDF:</p>
          <p className="text-blue-400">
            Enter the Total Correct and Total Incorrect numbers from your UWorld performance page
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Total Correct
          </label>
          <Input
            type="number"
            value={totalCorrect}
            onChange={(e) => setTotalCorrect(e.target.value)}
            placeholder="e.g., 295"
            required
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Total Incorrect
          </label>
          <Input
            type="number"
            value={totalIncorrect}
            onChange={(e) => setTotalIncorrect(e.target.value)}
            placeholder="e.g., 147"
            required
            min="0"
          />
        </div>

        {totalQuestions > 0 && (
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: '#111827', border: '1px solid #1e293b' }}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total Questions:</span>
              <span className="font-semibold text-blue-400">{totalQuestions}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-slate-400">Percentage:</span>
              <span className="font-semibold text-green-400">{percentage}%</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Notes (Optional)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this import..."
            rows={3}
          />
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Importing...' : 'Import Progress'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
