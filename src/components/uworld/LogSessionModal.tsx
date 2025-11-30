'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Upload } from 'lucide-react'
import { ShelfSubject } from '@/types'

interface LogSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  subject: ShelfSubject
}

export function LogSessionModal({ isOpen, onClose, onSuccess, subject }: LogSessionModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'paste' | 'pdf'>('manual')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Manual entry state
  const [manualData, setManualData] = useState({
    questionsTotal: '',
    questionsCorrect: '',
    timeSpentMins: '',
    mode: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  // PDF upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [pdfNotes, setPdfNotes] = useState('')

  // Paste text state
  const [testName, setTestName] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [pasteTotalQuestions, setPasteTotalQuestions] = useState('')
  const [isIncorrectOnly, setIsIncorrectOnly] = useState(true)

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      // Add noon time to prevent timezone rollover issues
      // manualData.date is "YYYY-MM-DD", we add T12:00:00 to make it noon local time
      const dateWithNoon = new Date(`${manualData.date}T12:00:00`)

      const res = await fetch('/api/uworld', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionsTotal: parseInt(manualData.questionsTotal),
          questionsCorrect: parseInt(manualData.questionsCorrect),
          timeSpentMins: manualData.timeSpentMins ? parseInt(manualData.timeSpentMins) : null,
          mode: manualData.mode || null,
          date: dateWithNoon.toISOString(),
          systems: [subject],
          notes: manualData.notes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to log session')
      }

      setSuccess(`Successfully logged ${subject} session!`)
      setTimeout(() => {
        onSuccess()
        onClose()
        // Reset form
        setManualData({
          questionsTotal: '',
          questionsCorrect: '',
          timeSpentMins: '',
          mode: '',
          date: new Date().toISOString().split('T')[0],
          notes: '',
        })
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setError('Please select a PDF file')
      return
    }

    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      if (pdfNotes) formData.append('notes', pdfNotes)

      const res = await fetch('/api/uworld/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to import PDF')
      }

      // Different success messages based on import type
      if (data.type === 'test') {
        setSuccess(
          `Successfully imported test "${data.stats.testName}" - ${data.stats.totalQuestions} questions (${data.stats.percentCorrect}% correct) with ${data.stats.subjectsCount} subject breakdown!`
        )
      } else {
        setSuccess(
          `Successfully imported ${data.stats.totalQuestions} questions (${data.stats.percentage}% correct)!`
        )
      }
      setTimeout(() => {
        onSuccess()
        onClose()
        // Reset form
        setSelectedFile(null)
        setPdfNotes('')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
      setError(null)
    } else {
      setError('Please select a valid PDF file')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
      setError(null)
    } else {
      setError('Please select a valid PDF file')
    }
  }

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testName.trim() || !pasteText.trim()) {
      setError('Please enter a test name and paste the table data')
      return
    }

    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const res = await fetch('/api/uworld/import-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testName: `${subject} - ${testName.trim()}`,
          text: pasteText.trim(),
          totalQuestions: pasteTotalQuestions ? parseInt(pasteTotalQuestions) : undefined,
          isIncorrectOnly,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to import data')
      }

      const stats = data.stats
      setSuccess(
        `Successfully imported ${stats.questionsSaved} incorrect questions! ` +
        (stats.totalQuestions > 0
          ? `Test score: ${stats.totalCorrect}/${stats.totalQuestions} (${stats.percentCorrect}%)`
          : `Topics: ${stats.topics.slice(0, 3).join(', ')}${stats.topics.length > 3 ? '...' : ''}`)
      )
      setTimeout(() => {
        onSuccess()
        onClose()
        // Reset form
        setTestName('')
        setPasteText('')
        setPasteTotalQuestions('')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Count lines in pasted text (excluding empty and header lines)
  const pasteLineCount = pasteText.trim()
    .split('\n')
    .filter(line => {
      const trimmed = line.trim()
      if (!trimmed) return false
      if (trimmed.includes('SUBJECTS') || trimmed.includes('SYSTEMS')) return false
      return /\d+\s*[-–]\s*\d{5,}/.test(trimmed)
    }).length

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Log ${subject} Session`}>
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'manual'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Manual Entry
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('paste')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'paste'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Paste Text
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pdf')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'pdf'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Upload PDF
        </button>
      </div>

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

      {/* Manual Entry Tab */}
      {activeTab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Questions Completed *"
              type="number"
              placeholder="40"
              value={manualData.questionsTotal}
              onChange={(e) => setManualData({ ...manualData, questionsTotal: e.target.value })}
              required
              min="0"
            />
            <Input
              label="Questions Correct *"
              type="number"
              placeholder="32"
              value={manualData.questionsCorrect}
              onChange={(e) => setManualData({ ...manualData, questionsCorrect: e.target.value })}
              required
              min="0"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Time Spent (minutes)"
              type="number"
              placeholder="60"
              value={manualData.timeSpentMins}
              onChange={(e) => setManualData({ ...manualData, timeSpentMins: e.target.value })}
              min="0"
            />
            <Select
              label="Mode"
              value={manualData.mode}
              onChange={(e) => setManualData({ ...manualData, mode: e.target.value })}
              options={[
                { value: '', label: 'Select mode...' },
                { value: 'timed', label: 'Timed' },
                { value: 'tutor', label: 'Tutor' },
                { value: 'review', label: 'Review' },
              ]}
            />
          </div>
          <Input
            label="Date *"
            type="date"
            value={manualData.date}
            onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Notes (Optional)
            </label>
            <Textarea
              value={manualData.notes}
              onChange={(e) => setManualData({ ...manualData, notes: e.target.value })}
              placeholder="Any notes about this session..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={onClose} disabled={isLoading} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Saving...' : 'Save Session'}
            </Button>
          </div>
        </form>
      )}

      {/* Paste Text Tab */}
      {activeTab === 'paste' && (
        <form onSubmit={handlePasteSubmit} className="space-y-4">
          <div className="bg-blue-900/20 border border-blue-700/30 p-3 rounded-lg text-xs text-blue-300">
            <p className="font-medium mb-1">Copy table data from UWorld:</p>
            <p className="text-blue-400">
              1. Filter your test results by Incorrect questions<br />
              2. Select all rows in the table and copy (Cmd+C)<br />
              3. Paste the data below
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Test Name
            </label>
            <Input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g., Week 1 Test"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Will be saved as "{subject} - [your test name]"
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Paste Table Data
            </label>
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste the copied table rows here..."
              rows={5}
              className="font-mono text-xs"
              required
            />
            {pasteLineCount > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                Detected {pasteLineCount} question{pasteLineCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isIncorrectOnly}
                onChange={(e) => setIsIncorrectOnly(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
              />
              Only pasting incorrect questions
            </label>
          </div>

          {isIncorrectOnly && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Total Questions on Test (optional)
              </label>
              <Input
                type="number"
                value={pasteTotalQuestions}
                onChange={(e) => setPasteTotalQuestions(e.target.value)}
                placeholder="e.g., 40"
                min="1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Enter total test size to calculate your score
              </p>
            </div>
          )}

          {isIncorrectOnly && pasteTotalQuestions && pasteLineCount > 0 && (
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Questions Correct:</span>
                <span className="font-semibold text-green-400">
                  {parseInt(pasteTotalQuestions) - pasteLineCount} / {pasteTotalQuestions}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-400">Estimated Score:</span>
                <span className="font-semibold text-blue-400">
                  {Math.round(((parseInt(pasteTotalQuestions) - pasteLineCount) / parseInt(pasteTotalQuestions)) * 100)}%
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={onClose} disabled={isLoading} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !testName.trim() || !pasteText.trim()} className="flex-1">
              {isLoading ? 'Importing...' : 'Import Questions'}
            </Button>
          </div>
        </form>
      )}

      {/* PDF Upload Tab */}
      {activeTab === 'pdf' && (
        <form onSubmit={handlePdfUpload} className="space-y-4">
          <div
            className="bg-blue-900/20 border border-blue-700/30 p-3 rounded-lg text-xs text-blue-300"
          >
            <p className="font-medium mb-1">Upload your UWorld Test Performance PDF:</p>
            <p className="text-blue-400">
              Upload a test performance PDF from UWorld (e.g., "16 - Week 1 - OBGYN") to automatically extract your results and subject breakdown.
            </p>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-400 bg-blue-400/10'
                : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            <Upload className="mx-auto mb-4 text-slate-400" size={48} />
            {selectedFile ? (
              <div>
                <p className="text-green-400 font-medium mb-2">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedFile(null)}
                  className="mt-3"
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-slate-300 mb-2">
                  Drag and drop your PDF here, or click to browse
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload-session"
                />
                <label
                  htmlFor="pdf-upload-session"
                  className="inline-block px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg cursor-pointer transition-colors"
                >
                  Choose File
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Notes (Optional)
            </label>
            <Textarea
              value={pdfNotes}
              onChange={(e) => setPdfNotes(e.target.value)}
              placeholder="Any notes about this test..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={onClose} disabled={isLoading} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !selectedFile} className="flex-1">
              {isLoading ? 'Uploading...' : 'Upload PDF'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
