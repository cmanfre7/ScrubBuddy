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
  const [activeTab, setActiveTab] = useState<'manual' | 'paste' | 'pdf'>('paste')
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
    time: new Date().toTimeString().slice(0, 5), // HH:MM format
    notes: '',
  })

  // PDF upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [pdfNotes, setPdfNotes] = useState('')

  // Paste text state - separate boxes for correct and incorrect
  const [testName, setTestName] = useState('')
  const [correctText, setCorrectText] = useState('')
  const [incorrectText, setIncorrectText] = useState('')
  const [pasteDate, setPasteDate] = useState(new Date().toISOString().split('T')[0])
  const [pasteTime, setPasteTime] = useState(new Date().toTimeString().slice(0, 5))

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      // Use the selected time instead of hardcoded noon
      const dateWithTime = new Date(`${manualData.date}T${manualData.time}:00`)

      const res = await fetch('/api/uworld', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionsTotal: parseInt(manualData.questionsTotal),
          questionsCorrect: parseInt(manualData.questionsCorrect),
          timeSpentMins: manualData.timeSpentMins ? parseInt(manualData.timeSpentMins) : null,
          mode: manualData.mode || null,
          date: dateWithTime.toISOString(),
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
          time: new Date().toTimeString().slice(0, 5),
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
    if (!testName.trim()) {
      setError('Please enter a test name')
      return
    }
    if (!correctText.trim() && !incorrectText.trim()) {
      setError('Please paste at least some questions (correct or incorrect)')
      return
    }

    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      // Use the selected time instead of hardcoded noon
      const dateWithTime = new Date(`${pasteDate}T${pasteTime}:00`)

      const res = await fetch('/api/uworld/import-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testName: `${subject} - ${testName.trim()}`,
          correctText: correctText.trim(),
          incorrectText: incorrectText.trim(),
          shelfSubject: subject, // Pass the shelf subject to tag the log correctly
          date: dateWithTime.toISOString(), // Custom date and time for the session
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to import data')
      }

      const stats = data.stats
      setSuccess(
        `Successfully imported ${stats.questionsSaved} questions! ` +
        `Score: ${stats.totalCorrect}/${stats.totalQuestions} (${stats.percentCorrect}%)`
      )
      setTimeout(() => {
        onSuccess()
        onClose()
        // Reset form
        setTestName('')
        setCorrectText('')
        setIncorrectText('')
        setPasteDate(new Date().toISOString().split('T')[0])
        setPasteTime(new Date().toTimeString().slice(0, 5))
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Count lines in pasted text (excluding empty and header lines)
  const countLines = (text: string) => text.trim()
    .split('\n')
    .filter(line => {
      const trimmed = line.trim()
      if (!trimmed) return false
      if (trimmed.includes('SUBJECTS') || trimmed.includes('SYSTEMS')) return false
      return /\d+\s*[-–]\s*\d{5,}/.test(trimmed)
    }).length

  const correctCount = countLines(correctText)
  const incorrectCount = countLines(incorrectText)
  const totalCount = correctCount + incorrectCount

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Log ${subject} Session`}>
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-slate-700">
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date *"
              type="date"
              value={manualData.date}
              onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
              required
            />
            <Input
              label="Time *"
              type="time"
              value={manualData.time}
              onChange={(e) => setManualData({ ...manualData, time: e.target.value })}
              required
            />
          </div>
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
            <p className="font-medium mb-1">Copy test results from UWorld:</p>
            <p className="text-blue-400">
              1. Open your test in UWorld &gt; Review Test<br />
              2. Filter to "Correct" questions, select all rows, copy<br />
              3. Paste in the green box below<br />
              4. Filter to "Incorrect" questions, select all rows, copy<br />
              5. Paste in the red box below
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
              placeholder="e.g., Week 3 Test"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Will be saved as "{subject} - [your test name]"
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Date Completed
              </label>
              <Input
                type="date"
                value={pasteDate}
                onChange={(e) => setPasteDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Time Completed
              </label>
              <Input
                type="time"
                value={pasteTime}
                onChange={(e) => setPasteTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Correct Questions Paste Box */}
          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">
              Correct Questions
            </label>
            <Textarea
              value={correctText}
              onChange={(e) => setCorrectText(e.target.value)}
              placeholder="Paste CORRECT questions here..."
              rows={4}
              className="font-mono text-xs border-green-700/50 focus:border-green-500"
            />
            {correctCount > 0 && (
              <p className="text-xs text-green-400 mt-1">
                {correctCount} correct question{correctCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Incorrect Questions Paste Box */}
          <div>
            <label className="block text-sm font-medium text-red-400 mb-2">
              Incorrect Questions
            </label>
            <Textarea
              value={incorrectText}
              onChange={(e) => setIncorrectText(e.target.value)}
              placeholder="Paste INCORRECT questions here..."
              rows={4}
              className="font-mono text-xs border-red-700/50 focus:border-red-500"
            />
            {incorrectCount > 0 && (
              <p className="text-xs text-red-400 mt-1">
                {incorrectCount} incorrect question{incorrectCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Score Preview */}
          {totalCount > 0 && (
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Total Questions:</span>
                <span className="font-semibold text-slate-200">{totalCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-400">Score:</span>
                <span className="font-semibold text-blue-400">
                  {correctCount}/{totalCount} ({Math.round((correctCount / totalCount) * 100)}%)
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={onClose} disabled={isLoading} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !testName.trim() || totalCount === 0} className="flex-1">
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
