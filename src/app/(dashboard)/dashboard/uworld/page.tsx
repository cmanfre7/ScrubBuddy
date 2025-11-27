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
import { Plus, ArrowLeft, BookOpen, TrendingUp, Calendar, Clock } from 'lucide-react'
import { SHELF_SUBJECTS, ShelfSubject } from '@/types'
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
import { format, subDays, parseISO } from 'date-fns'

interface UWorldLog {
  id: string
  date: string
  questionsTotal: number
  questionsCorrect: number
  timeSpentMins: number | null
  mode: string | null
  systems: string[]
  notes: string | null
}

const SHELF_COLORS: Record<ShelfSubject, { bg: string; text: string; border: string }> = {
  'Ambulatory Medicine': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  'Clinical Neurology': { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  'Emergency Medicine': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  'Family Medicine': { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  'Medicine': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  'OBGYN': { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
  'Pediatrics': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  'Psychiatry': { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  'Surgery': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
}

export default function UWorldPage() {
  const queryClient = useQueryClient()
  const [selectedSubject, setSelectedSubject] = useState<ShelfSubject | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newLog, setNewLog] = useState({
    questionsTotal: '',
    questionsCorrect: '',
    timeSpentMins: '',
    mode: '',
    notes: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['uworld'],
    queryFn: async () => {
      const res = await fetch('/api/uworld')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof newLog & { systems: string[] }) => {
      const res = await fetch('/api/uworld', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          questionsTotal: parseInt(data.questionsTotal),
          questionsCorrect: parseInt(data.questionsCorrect),
          timeSpentMins: data.timeSpentMins ? parseInt(data.timeSpentMins) : null,
        }),
      })
      if (!res.ok) throw new Error('Failed to create log')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uworld'] })
      setIsModalOpen(false)
      setNewLog({
        questionsTotal: '',
        questionsCorrect: '',
        timeSpentMins: '',
        mode: '',
        notes: '',
      })
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

    // Group logs by date
    const logsByDate: Record<string, { total: number; correct: number }> = {}
    subjectLogs.forEach(log => {
      const dateKey = format(new Date(log.date), 'yyyy-MM-dd')
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
        date: format(new Date(dateKey), 'MMM d'),
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
        <div>
          <h1 className="text-2xl font-bold text-slate-100">UWorld Tracker</h1>
          <p className="text-slate-400 mt-1">Select a shelf subject to view your progress</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SHELF_SUBJECTS.map((subject) => {
            const stats = getSubjectStats(subject)
            const colors = SHELF_COLORS[subject]

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
                    <span className="text-slate-500">Questions</span>
                    <span className="text-slate-300">{stats.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Sessions</span>
                    <span className="text-slate-300">{stats.sessions}</span>
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
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} className="mr-2" />
          Log Session
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
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
            <p className="text-slate-400 text-sm mt-1">Total Questions</p>
          </CardContent>
        </Card>
      </div>

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
                      className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[60px]">
                          <p className="text-lg font-bold text-slate-100">
                            {format(new Date(log.date), 'MMM d')}
                          </p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(log.date), 'h:mm a')}
                          </p>
                        </div>
                        <div className="h-10 w-px bg-slate-700" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-200">
                              {log.questionsCorrect}/{log.questionsTotal} correct
                            </span>
                            <Badge
                              variant={
                                percentage >= 70 ? 'success' : percentage >= 60 ? 'warning' : 'danger'
                              }
                            >
                              {percentage}%
                            </Badge>
                            {log.mode && <Badge variant="default">{log.mode}</Badge>}
                          </div>
                          {log.timeSpentMins && (
                            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                              <Clock size={12} />
                              {log.timeSpentMins} minutes
                            </p>
                          )}
                        </div>
                      </div>
                      <div className={cn('text-2xl font-bold', colors.text)}>{percentage}%</div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Session Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Log ${selectedSubject} Session`}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate({
              ...newLog,
              systems: [selectedSubject],
            })
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Questions Completed *"
              type="number"
              placeholder="40"
              value={newLog.questionsTotal}
              onChange={(e) => setNewLog({ ...newLog, questionsTotal: e.target.value })}
              required
            />
            <Input
              label="Questions Correct *"
              type="number"
              placeholder="32"
              value={newLog.questionsCorrect}
              onChange={(e) => setNewLog({ ...newLog, questionsCorrect: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Time Spent (minutes)"
              type="number"
              placeholder="60"
              value={newLog.timeSpentMins}
              onChange={(e) => setNewLog({ ...newLog, timeSpentMins: e.target.value })}
            />
            <Select
              label="Mode"
              value={newLog.mode}
              onChange={(e) => setNewLog({ ...newLog, mode: e.target.value })}
              options={[
                { value: '', label: 'Select mode...' },
                { value: 'timed', label: 'Timed' },
                { value: 'tutor', label: 'Tutor' },
                { value: 'review', label: 'Review' },
              ]}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending} className="flex-1">
              Save Session
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
