'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Upload, ClipboardPaste } from 'lucide-react'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'pdf' | 'paste'>('paste')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Manual entry state
  const [totalCorrect, setTotalCorrect] = useState('')
  const [totalIncorrect, setTotalIncorrect] = useState('')
  const [notes, setNotes] = useState('')

  // PDF upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

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
      if (notes) formData.append('notes', notes)

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
          testName: testName.trim(),
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
        `Successfully imported ${stats.questionsSaved} incorrect questions from "${stats.testName}"! ` +
        (stats.totalQuestions > 0
          ? `Test score: ${stats.totalCorrect}/${stats.totalQuestions} (${stats.percentCorrect}%)`
          : `Subjects: ${stats.subjects.slice(0, 3).join(', ')}${stats.subjects.length > 3 ? '...' : ''}`)
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

  // Count lines in pasted text (excluding empty and header lines)
  const pasteLineCount = pasteText.trim()
    .split('\n')
    .filter(line => {
      const trimmed = line.trim()
      if (!trimmed) return false
      if (trimmed.includes('SUBJECTS') || trimmed.includes('SYSTEMS')) return false
      return /\d+\s*[-–]\s*\d{5,}/.test(trimmed) // Has question ID pattern
    }).length

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
          onClick={() => setActiveTab('pdf')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'pdf'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Upload PDF
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
              placeholder="e.g., Surgery Test 1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Paste Table Data
            </label>
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste the copied table rows here...&#10;&#10;Example:&#10;1 - 118154&#9;OBGYN&#9;Pregnancy&#9;Normal&#9;Topic Name&#9;52%&#9;45 sec"
              rows={6}
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
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#111827', border: '1px solid #1e293b' }}
            >
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

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !testName.trim() || !pasteText.trim()}>
              {isLoading ? 'Importing...' : 'Import Questions'}
            </Button>
          </div>
        </form>
      )}

      {/* Manual Entry Tab */}
      {activeTab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-4">

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
      )}

      {/* PDF Upload Tab */}
      {activeTab === 'pdf' && (
        <form onSubmit={handlePdfUpload} className="space-y-4">
          <div
            className="bg-blue-900/20 border border-blue-700/30 p-3 rounded-lg text-xs text-blue-300"
          >
            <p className="font-medium mb-1">Upload your UWorld Performance PDF:</p>
            <p className="text-blue-400">
              Export your performance page from UWorld as a PDF and upload it here to automatically extract your progress.
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
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
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
            <Button type="submit" disabled={isLoading || !selectedFile}>
              {isLoading ? 'Uploading...' : 'Upload PDF'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
