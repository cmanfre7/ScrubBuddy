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
import { Plus, ArrowLeft, BookOpen, TrendingUp, Calendar, Clock, Trash2, Pencil, Settings, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
// ImportModal removed - paste text moved to LogSessionModal within each subject
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
// Removed date-fns format to avoid timezone issues - using custom local formatters instead

// Helper function to get local date parts from an ISO date string
// This prevents dates from shifting when displayed across timezones
const getLocalDateParts = (dateString: string) => {
  const date = new Date(dateString)
  return {
    year: date.getFullYear(),
    month: date.getMonth(), // 0-indexed
    day: date.getDate(),
    hours: date.getHours(),
    minutes: date.getMinutes(),
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Format a date string to "MMM d" using LOCAL timezone
const formatDateMMM_d = (dateString: string) => {
  const { month, day } = getLocalDateParts(dateString)
  return `${MONTHS[month]} ${day}`
}

// Format a date string to "h:mm a" using LOCAL timezone
const formatTime = (dateString: string) => {
  const { hours, minutes } = getLocalDateParts(dateString)
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`
}

// Get a date key (YYYY-MM-DD) using LOCAL timezone for grouping
const getLocalDateKey = (dateString: string) => {
  const { year, month, day } = getLocalDateParts(dateString)
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Format a YYYY-MM-DD date key string to "MMM d" (no timezone conversion needed)
const formatDateKeyToDisplay = (dateKey: string) => {
  // dateKey is "YYYY-MM-DD", parse directly without Date object to avoid UTC issues
  const [year, monthStr, dayStr] = dateKey.split('-')
  const monthIndex = parseInt(monthStr, 10) - 1
  const day = parseInt(dayStr, 10)
  return `${MONTHS[monthIndex]} ${day}`
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

const SHELF_COLORS: Record<ShelfSubject, { bg: string; text: string; border: string; bar: string }> = {
  'Emergency Medicine': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', bar: 'bg-red-500' },
  'Family Medicine': { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', bar: 'bg-green-500' },
  'Internal Medicine': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', bar: 'bg-orange-500' },
  'OBGYN': { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30', bar: 'bg-pink-500' },
  'Pediatrics': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', bar: 'bg-cyan-500' },
  'Psychiatry': { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30', bar: 'bg-indigo-500' },
  'Surgery': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', bar: 'bg-yellow-500' },
}

export default function UWorldPage() {
  const queryClient = useQueryClient()
  const [selectedSubject, setSelectedSubject] = useState<ShelfSubject | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<UWorldLog | null>(null)
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)
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

  // Fetch weak areas data
  const { data: weakAreasData } = useQuery({
    queryKey: ['uworld-weak-areas'],
    queryFn: async () => {
      const res = await fetch('/api/uworld/weak-areas')
      return res.json()
    },
  })

  // Fetch session details when expanded
  const { data: sessionDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['uworld-session', expandedSessionId],
    queryFn: async () => {
      if (!expandedSessionId) return null
      const res = await fetch(`/api/uworld/${expandedSessionId}?includeQuestions=true`)
      return res.json()
    },
    enabled: !!expandedSessionId,
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
        date: formatDateKeyToDisplay(dateKey),
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
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">UWorld Tracker</h1>
          <p className="text-sm md:text-base text-slate-400 mt-1">Select a shelf subject to view your progress</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
                  'p-4 md:p-6 rounded-xl border-2 transition-all duration-200 text-left',
                  'active:scale-[0.98] md:hover:scale-[1.02] md:hover:shadow-lg',
                  colors.bg,
                  colors.border,
                  'md:hover:border-opacity-60'
                )}
              >
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h3 className={cn('text-lg md:text-xl font-bold', colors.text)}>{subject}</h3>
                  <BookOpen className={cn('w-5 h-5 md:w-6 md:h-6', colors.text)} />
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
                      className={cn('h-full rounded-full transition-all', colors.bar)}
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

      </div>
    )
  }

  // Subject detail view with chart
  const colors = SHELF_COLORS[selectedSubject]

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={() => setSelectedSubject(null)}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className={cn('text-xl md:text-2xl font-bold', colors.text)}>{selectedSubject}</h1>
            <p className="text-sm md:text-base text-slate-400 mt-0.5 md:mt-1 truncate">
              {subjectStats?.totalQuestions} questions across {subjectStats?.sessions} sessions
            </p>
          </div>
        </div>
        {/* Action buttons - horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setSettingsValue(getQuestionTotal(selectedSubject).toString())
              setIsSettingsOpen(true)
            }}
          >
            <Settings size={16} className="mr-1.5" />
            <span className="whitespace-nowrap">Set Total</span>
          </Button>
          {subjectLogs.length > 0 && (
            <Button variant="secondary" size="sm" className="shrink-0" onClick={() => setIsConfirmClearOpen(true)}>
              <Trash2 size={16} className="mr-1.5" />
              <span className="whitespace-nowrap">Clear</span>
            </Button>
          )}
          <Button size="sm" className="shrink-0" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} className="mr-1.5" />
            <span className="whitespace-nowrap">Log Session</span>
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      {(() => {
        const totalAvailable = getQuestionTotal(selectedSubject)
        const progressPercent = Math.min(100, Math.round(((subjectStats?.totalQuestions || 0) / totalAvailable) * 100))
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className={cn(colors.bg, colors.border, 'border')}>
              <CardContent className="p-3 md:pt-6 md:p-4 text-center">
                <p className={cn('text-2xl md:text-4xl font-bold', colors.text)}>{subjectStats?.percentage}%</p>
                <p className="text-slate-400 text-xs md:text-sm mt-1">Overall Score</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 md:pt-6 md:p-4 text-center">
                <p className="text-2xl md:text-4xl font-bold text-slate-100">{subjectStats?.totalCorrect}</p>
                <p className="text-slate-400 text-xs md:text-sm mt-1">Correct</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 md:pt-6 md:p-4 text-center">
                <p className="text-2xl md:text-4xl font-bold text-slate-100">{subjectStats?.totalQuestions}</p>
                <p className="text-slate-400 text-xs md:text-sm mt-1">Questions Done</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 md:pt-6 md:p-4 text-center">
                <p className="text-2xl md:text-4xl font-bold text-slate-100">{progressPercent}%</p>
                <p className="text-slate-400 text-xs md:text-sm mt-1">of {totalAvailable} QBank</p>
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
            <div className="space-y-2 md:space-y-3">
              {subjectLogs
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((log) => {
                  const percentage = calculatePercentage(log.questionsCorrect, log.questionsTotal)
                  const isExpanded = expandedSessionId === log.id
                  return (
                    <div key={log.id} className="rounded-lg overflow-hidden">
                      <div
                        onClick={() => setExpandedSessionId(isExpanded ? null : log.id)}
                        className="flex items-center justify-between p-3 md:p-4 bg-slate-800/30 hover:bg-slate-800/50 active:bg-slate-800/60 transition-colors cursor-pointer group min-h-[60px]"
                      >
                        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                          <div className="text-center min-w-[50px] md:min-w-[60px]">
                            <p className="text-sm md:text-lg font-bold text-slate-100">
                              {formatDateMMM_d(log.date)}
                            </p>
                            <p className="text-[10px] md:text-xs text-slate-500">
                              {formatTime(log.date)}
                            </p>
                          </div>
                          <div className="h-8 md:h-10 w-px bg-slate-700 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                              <span className="text-sm md:text-base font-medium text-slate-200">
                                {log.questionsCorrect}/{log.questionsTotal}
                              </span>
                              <span
                                className="px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-medium rounded-full"
                                style={{
                                  backgroundColor: getScoreBgColor(percentage),
                                  color: getScoreColor(percentage),
                                  border: `1px solid ${getScoreColor(percentage)}40`,
                                }}
                              >
                                {percentage}%
                              </span>
                              {log.mode && <Badge variant="default" className="text-[10px] md:text-xs">{log.mode}</Badge>}
                            </div>
                            {log.blockName && (
                              <p className="text-xs md:text-sm text-slate-400 mt-0.5 md:mt-1 truncate">{log.blockName}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-2">
                          <div
                            className="text-lg md:text-2xl font-bold"
                            style={{ color: getScoreColor(percentage) }}
                          >
                            {percentage}%
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingSession(log); }}
                            className="p-2 text-slate-500 hover:text-slate-300 transition-colors hidden md:block"
                          >
                            <Pencil size={16} />
                          </button>
                          {isExpanded ? (
                            <ChevronUp size={18} className="text-slate-400" />
                          ) : (
                            <ChevronDown size={18} className="text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded session details */}
                      {isExpanded && (
                        <div className="bg-slate-900/50 border-t border-slate-700/50 p-4">
                          {isLoadingDetails ? (
                            <p className="text-slate-400 text-sm text-center py-4">Loading question breakdown...</p>
                          ) : sessionDetails?.breakdown ? (
                            <div className="space-y-4">
                              {/* Subject breakdown */}
                              {sessionDetails.breakdown.bySubject?.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">By Subject</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {sessionDetails.breakdown.bySubject.map((item: { name: string; total: number; correct: number; incorrect: number; percentage: number }) => (
                                      <div key={item.name} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                                        <span className="text-sm text-slate-300 truncate flex-1">{item.name}</span>
                                        <div className="flex items-center gap-2 ml-2">
                                          <span className="text-xs text-red-400">{item.incorrect}x</span>
                                          <span className="text-xs text-slate-500">/</span>
                                          <span className="text-xs text-slate-400">{item.total}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* System breakdown */}
                              {sessionDetails.breakdown.bySystem?.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">By System</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {sessionDetails.breakdown.bySystem.map((item: { name: string; total: number; correct: number; incorrect: number; percentage: number }) => (
                                      <div key={item.name} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                                        <span className="text-sm text-slate-300 truncate flex-1">{item.name}</span>
                                        <div className="flex items-center gap-2 ml-2">
                                          <span className="text-xs text-red-400">{item.incorrect}x</span>
                                          <span className="text-xs text-slate-500">/</span>
                                          <span className="text-xs text-slate-400">{item.total}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Category breakdown */}
                              {sessionDetails.breakdown.byCategory?.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">By Category</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {sessionDetails.breakdown.byCategory.slice(0, 6).map((item: { name: string; total: number; correct: number; incorrect: number; percentage: number }) => (
                                      <div key={item.name} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                                        <span className="text-sm text-slate-300 truncate flex-1">{item.name}</span>
                                        <div className="flex items-center gap-2 ml-2">
                                          <span className="text-xs text-red-400">{item.incorrect}x</span>
                                          <span className="text-xs text-slate-500">/</span>
                                          <span className="text-xs text-slate-400">{item.total}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Topic breakdown */}
                              {sessionDetails.breakdown.byTopic?.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">By Topic</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {sessionDetails.breakdown.byTopic.slice(0, 8).map((item: { name: string; total: number; correct: number; incorrect: number; percentage: number }) => (
                                      <div key={item.name} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                                        <span className="text-sm text-slate-300 truncate flex-1">{item.name}</span>
                                        <div className="flex items-center gap-2 ml-2">
                                          <span className="text-xs text-red-400">{item.incorrect}x</span>
                                          <span className="text-xs text-slate-500">/</span>
                                          <span className="text-xs text-slate-400">{item.total}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Questions list summary */}
                              {sessionDetails.questions?.length > 0 && (
                                <div className="pt-2 border-t border-slate-700/50">
                                  <p className="text-xs text-slate-500">
                                    {sessionDetails.questions.length} questions imported
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-slate-400 text-sm">No detailed question data available</p>
                              <p className="text-slate-500 text-xs mt-1">Import questions via Paste Text to see breakdowns</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weak Areas for this Subject */}
      {(() => {
        // Filter weak areas to only show those matching the selected subject
        const subjectWeakAreas = weakAreasData?.weakAreas?.filter(
          (area: { topic: string; count: number; system: string | null; subject: string | null; avgPercentOthers: number }) =>
            area.subject === selectedSubject
        ) || []

        if (subjectWeakAreas.length === 0) return null

        return (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Weak Areas in {selectedSubject}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subjectWeakAreas.slice(0, 8).map((area: { topic: string; count: number; system: string | null; subject: string | null; avgPercentOthers: number }, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/30"
                  >
                    <div className="flex-1">
                      <p className="text-slate-200 font-medium">{area.topic}</p>
                      {area.system && (
                        <span className="text-xs text-slate-500">{area.system}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-red-400 font-bold">{area.count}x</p>
                        <p className="text-xs text-slate-500">missed</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400">{area.avgPercentOthers}%</p>
                        <p className="text-xs text-slate-500">others correct</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })()}

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
