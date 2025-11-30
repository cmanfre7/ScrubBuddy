'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatDate, calculatePercentage, cn } from '@/lib/utils'
import { Plus, ArrowLeft, BookOpen, TrendingUp, Calendar, Clock, Trash2, Upload, Pencil, Settings } from 'lucide-react'
import { ImportModal } from '@/components/uworld/ImportModal'
import { LogSessionModal } from '@/components/uworld/LogSessionModal'
import { EditSessionModal } from '@/components/uworld/EditSessionModal'

// Get gradient color based on score (red -> yellow -> green)
const getScoreColor = (score: number) => {
  // Clamp score between 0 and 100
  const s = Math.max(0, Math.min(100, score))

  // Create a gradient: 0% = red, 50% = yellow, 100% = green
  // Using HSL: red=0, yellow=60, green=120
  const hue = (s / 100) * 120
  return `hsl(${hue}, 70%, 45%)`
}

const getScoreBgColor = (score: number) => {
  const s = Math.max(0, Math.min(100, score))
  const hue = (s / 100) * 120
  return `hsla(${hue}, 70%, 45%, 0.2)`
}
import { SHELF_SUBJECTS, ShelfSubject, UWORLD_QUESTION_TOTALS } from '@/types'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format } from 'date-fns'

// Helper function to get local date string without timezone conversion
// This prevents dates from shifting when displayed across timezones
const getLocalDateKey = (dateString: string) => {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatLocalDate = (dateString: string, formatStr: string) => {
  const date = new Date(dateString)
  // For "MMM d" format, we use local date parts
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  if (formatStr === 'MMM d') {
    return `${months[date.getMonth()]} ${date.getDate()}`
  }
  if (formatStr === 'h:mm a') {
    const hours = date.getHours()
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes} ${ampm}`
  }
  return format(date, formatStr)
}

interface UWorldLog {
  id: string
  date: string
  questionsTotal: number
  questionsCorrect: number
  timeSpentMins: number | null
  mode: string | null
  blockName: string | null
  systems: string[]
  notes: string | null
}

const SHELF_COLORS: Record<ShelfSubject, { bg: string; text: string; border: string }> = {
  'Emergency Medicine': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  'Family Medicine': { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  'Internal Medicine': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  'OBGYN': { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
  'Pediatrics': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  'Psychiatry': { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  'Surgery': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
}

export default function UWorldPage() {
  const queryClient = useQueryClient()
  const [selectedSubject, setSelectedSubject] = useState<ShelfSubject | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<UWorldLog | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsValue, setSettingsValue] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['uworld'],
    queryFn: async () => {
      const res = await fetch('/api/uworld')
      return res.json()
    },
  })

  // Fetch user's custom question totals
  const { data: settingsData } = useQuery({
    queryKey: ['uworld-settings'],
    queryFn: async () => {
      const res = await fetch('/api/uworld/settings')
      return res.json()
    },
  })

  // Get question total for a subject (user custom or default)
  const getQuestionTotal = (subject: ShelfSubject) => {
    if (settingsData?.settings?.[subject]) {
      return settingsData.settings[subject]
    }
    return UWORLD_QUESTION_TOTALS[subject]
  }

  const updateSettingsMutation = useMutation({
    mutationFn: async ({ subject, totalQuestions }: { subject: string; totalQuestions: number }) => {
      const res = await fetch('/api/uworld/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, totalQuestions }),
      })
      if (!res.ok) throw new Error('Failed to update settings')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uworld-settings'] })
      setIsSettingsOpen(false)
    },
  })

  const clearDataMutation = useMutation({
    mutationFn: async (subject: string) => {
      const res = await fetch('/api/uworld/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject }),
      })
      if (!res.ok) throw new Error('Failed to clear data')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uworld'] })
      setIsConfirmClearOpen(false)
      setSelectedSubject(null)
    },
  })

  const logs: UWorldLog[] = data?.logs || []

  // Get stats for each subject
  const getSubjectStats = (subject: ShelfSubject) => {
    const subjectLogs = logs.filter(log => log.systems.includes(subject))
    const totalQuestions = subjectLogs.reduce((sum, log) => sum + log.questionsTotal, 0)
    const totalCorrect = subjectLogs.reduce((sum, log) => sum + log.questionsCorrect, 0)
    const percentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
    return { sessions: subjectLogs.length, totalQuestions, totalCorrect, percentage }
  }

  // Get logs for selected subject
  const subjectLogs = selectedSubject
    ? logs.filter(log => log.systems.includes(selectedSubject))
    : []

  // Prepare chart data for selected subject
  const getChartData = () => {
    if (!selectedSubject || subjectLogs.length === 0) return []

    // Group logs by date (using local date to avoid timezone issues)
    const logsByDate: Record<string, { total: number; correct: number }> = {}
    subjectLogs.forEach(log => {
      const dateKey = getLocalDateKey(log.date)
      if (!logsByDate[dateKey]) {
        logsByDate[dateKey] = { total: 0, correct: 0 }
      }
      logsByDate[dateKey].total += log.questionsTotal
      logsByDate[dateKey].correct += log.questionsCorrect
    })

    // Sort by date and calculate scores
    const sortedDates = Object.keys(logsByDate).sort()
    const chartData: { date: string; score: number; average: number }[] = []

    sortedDates.forEach((dateKey, index) => {
      const { total, correct } = logsByDate[dateKey]
      const score = Math.round((correct / total) * 100)

      // Calculate 7-day rolling average
      const last7Days = sortedDates.slice(Math.max(0, index - 6), index + 1)
      const avgTotal = last7Days.reduce((sum, d) => sum + logsByDate[d].total, 0)
      const avgCorrect = last7Days.reduce((sum, d) => sum + logsByDate[d].correct, 0)
      const average = Math.round((avgCorrect / avgTotal) * 100)

      chartData.push({
        date: formatLocalDate(dateKey, 'MMM d'),
        score,
        average,
      })
    })

    return chartData
  }

  const chartData = getChartData()
  const subjectStats = selectedSubject ? getSubjectStats(selectedSubject) : null

  // Main shelf subject grid view
  if (!selectedSubject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">UWorld Tracker</h1>
            <p className="text-slate-400 mt-1">Select a shelf subject to view your progress</p>
          </div>
          <Button onClick={() => setIsImportModalOpen(true)} variant="secondary">
            <Upload size={18} className="mr-2" />
            Import Progress
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SHELF_SUBJECTS.map((subject) => {
            const stats = getSubjectStats(subject)
            const colors = SHELF_COLORS[subject]
            const totalAvailable = getQuestionTotal(subject)
            const progressPercent = Math.min(100, Math.round((stats.totalQuestions / totalAvailable) * 100))

            return (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={cn(
                  'p-6 rounded-xl border-2 transition-all duration-200 text-left',
                  'hover:scale-[1.02] hover:shadow-lg',
                  colors.bg,
                  colors.border,
                  'hover:border-opacity-60'
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={cn('text-xl font-bold', colors.text)}>{subject}</h3>
                  <BookOpen className={cn('w-6 h-6', colors.text)} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Score</span>
                    <span className={cn('text-2xl font-bold', colors.text)}>
                      {stats.percentage}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Progress</span>
                    <span className="text-slate-300">{stats.totalQuestions} / {totalAvailable}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', colors.bg.replace('/20', ''))}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">{progressPercent}% complete</span>
                    <span className="text-slate-500">{stats.sessions} sessions</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Import Modal */}
        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['uworld'] })}
        />
      </div>
    )
  }

  // Subject detail view with chart
  const colors = SHELF_COLORS[selectedSubject]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedSubject(null)}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h1 className={cn('text-2xl font-bold', colors.text)}>{selectedSubject}</h1>
            <p className="text-slate-400 mt-1">
              {subjectStats?.totalQuestions} questions across {subjectStats?.sessions} sessions
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setSettingsValue(getQuestionTotal(selectedSubject).toString())
              setIsSettingsOpen(true)
            }}
          >
            <Settings size={18} className="mr-2" />
            Set Total
          </Button>
          {subjectLogs.length > 0 && (
            <Button variant="secondary" onClick={() => setIsConfirmClearOpen(true)}>
              <Trash2 size={18} className="mr-2" />
              Clear Data
            </Button>
          )}
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={18} className="mr-2" />
            Log Session
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      {(() => {
        const totalAvailable = getQuestionTotal(selectedSubject)
        const progressPercent = Math.min(100, Math.round(((subjectStats?.totalQuestions || 0) / totalAvailable) * 100))
        return (
          <div className="grid grid-cols-4 gap-4">
            <Card className={cn(colors.bg, colors.border, 'border')}>
              <CardContent className="pt-6 text-center">
                <p className={cn('text-4xl font-bold', colors.text)}>{subjectStats?.percentage}%</p>
                <p className="text-slate-400 text-sm mt-1">Overall Score</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-4xl font-bold text-slate-100">{subjectStats?.totalCorrect}</p>
                <p className="text-slate-400 text-sm mt-1">Correct</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-4xl font-bold text-slate-100">{subjectStats?.totalQuestions}</p>
                <p className="text-slate-400 text-sm mt-1">Questions Done</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-4xl font-bold text-slate-100">{progressPercent}%</p>
                <p className="text-slate-400 text-sm mt-1">of {totalAvailable} QBank</p>
              </CardContent>
            </Card>
          </div>
        )
      })()}

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={18} className={colors.text} />
            Performance Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500">
              No data yet. Log your first session!
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#64748b"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: number) => [`${value}%`]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Block Score"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="average"
                    name="7-Day Average"
                    stroke="#22c55e"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {subjectLogs.length === 0 ? (
            <p className="text-slate-500">No sessions logged for {selectedSubject} yet.</p>
          ) : (
            <div className="space-y-3">
              {subjectLogs
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((log) => {
                  const percentage = calculatePercentage(log.questionsCorrect, log.questionsTotal)
                  return (
                    <div
                      key={log.id}
                      onClick={() => setEditingSession(log)}
                      className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[60px]">
                          <p className="text-lg font-bold text-slate-100">
                            {formatLocalDate(log.date, 'MMM d')}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatLocalDate(log.date, 'h:mm a')}
                          </p>
                        </div>
                        <div className="h-10 w-px bg-slate-700" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-200">
                              {log.questionsCorrect}/{log.questionsTotal} correct
                            </span>
                            <span
                              className="px-2 py-0.5 text-xs font-medium rounded-full"
                              style={{
                                backgroundColor: getScoreBgColor(percentage),
                                color: getScoreColor(percentage),
                                border: `1px solid ${getScoreColor(percentage)}40`,
                              }}
                            >
                              {percentage}%
                            </span>
                            {log.mode && <Badge variant="default">{log.mode}</Badge>}
                          </div>
                          {log.blockName && (
                            <p className="text-sm text-slate-400 mt-1">{log.blockName}</p>
                          )}
                          {log.timeSpentMins && (
                            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                              <Clock size={12} />
                              {log.timeSpentMins} minutes
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div
                          className="text-2xl font-bold"
                          style={{ color: getScoreColor(percentage) }}
                        >
                          {percentage}%
                        </div>
                        <Pencil size={16} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Session Modal */}
      {selectedSubject && (
        <LogSessionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['uworld'] })}
          subject={selectedSubject}
        />
      )}

      {/* Confirm Clear Data Modal */}
      <Modal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        title="Clear All Data?"
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            Are you sure you want to delete all {selectedSubject} data? This will remove:
          </p>
          <ul className="list-disc list-inside text-slate-400 space-y-1">
            <li>{subjectStats?.sessions} sessions</li>
            <li>{subjectStats?.totalQuestions} questions</li>
            <li>All performance history</li>
          </ul>
          <p className="text-red-400 font-medium">This action cannot be undone.</p>
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsConfirmClearOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => selectedSubject && clearDataMutation.mutate(selectedSubject)}
              isLoading={clearDataMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Delete All Data
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Session Modal */}
      <EditSessionModal
        isOpen={!!editingSession}
        onClose={() => setEditingSession(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['uworld'] })
          setEditingSession(null)
        }}
        session={editingSession}
      />

      {/* Settings Modal - Edit Total Questions */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title={`Set Total Questions for ${selectedSubject}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const total = parseInt(settingsValue)
            if (!isNaN(total) && total > 0 && selectedSubject) {
              updateSettingsMutation.mutate({ subject: selectedSubject, totalQuestions: total })
            }
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="totalQuestions" className="block text-sm font-medium text-slate-300 mb-2">
              Total Questions in QBank
            </label>
            <Input
              id="totalQuestions"
              type="number"
              value={settingsValue}
              onChange={(e) => setSettingsValue(e.target.value)}
              placeholder="e.g., 535"
              min={1}
            />
            <p className="text-slate-500 text-xs mt-2">
              Default: {selectedSubject ? UWORLD_QUESTION_TOTALS[selectedSubject] : 0} questions
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsSettingsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={updateSettingsMutation.isPending}
              className="flex-1"
            >
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
