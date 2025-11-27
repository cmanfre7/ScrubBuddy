'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatDate, calculatePercentage } from '@/lib/utils'
import { Plus, Target, TrendingUp, BookOpen, Clock } from 'lucide-react'
import { SHELF_SUBJECTS } from '@/types'

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

export default function UWorldPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newLog, setNewLog] = useState({
    questionsTotal: '',
    questionsCorrect: '',
    timeSpentMins: '',
    mode: '',
    systems: [] as string[],
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
    mutationFn: async (data: typeof newLog) => {
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
        systems: [],
        notes: '',
      })
    },
  })

  const logs: UWorldLog[] = data?.logs || []
  const stats = data?.stats || { totalQuestions: 0, totalCorrect: 0, percentage: 0 }

  const toggleSystem = (system: string) => {
    setNewLog({
      ...newLog,
      systems: newLog.systems.includes(system)
        ? newLog.systems.filter((s) => s !== system)
        : [...newLog.systems, system],
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">UWorld Tracker</h1>
          <p className="text-slate-400 mt-1">Track your question bank progress</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} className="mr-2" />
          Log Session
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Target className="text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{stats.percentage}%</p>
                <p className="text-sm text-slate-400">Overall Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="text-green-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{stats.totalCorrect}</p>
                <p className="text-sm text-slate-400">Correct</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <BookOpen className="text-purple-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{stats.totalQuestions}</p>
                <p className="text-sm text-slate-400">Total Questions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Clock className="text-yellow-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{logs.length}</p>
                <p className="text-sm text-slate-400">Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-slate-500">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-slate-500">No sessions logged yet. Start tracking your UWorld progress!</p>
          ) : (
            <div className="space-y-3">
              {logs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-slate-200">
                        {log.questionsCorrect}/{log.questionsTotal} correct
                      </p>
                      <Badge
                        variant={
                          calculatePercentage(log.questionsCorrect, log.questionsTotal) >= 70
                            ? 'success'
                            : calculatePercentage(log.questionsCorrect, log.questionsTotal) >= 60
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {calculatePercentage(log.questionsCorrect, log.questionsTotal)}%
                      </Badge>
                      {log.mode && (
                        <Badge variant="default">{log.mode}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-slate-500">{formatDate(log.date)}</span>
                      {log.timeSpentMins && (
                        <span className="text-sm text-slate-500">{log.timeSpentMins} min</span>
                      )}
                    </div>
                    {log.systems.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {log.systems.map((system) => (
                          <span
                            key={system}
                            className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded"
                          >
                            {system}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Session Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log UWorld Session">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate(newLog)
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
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Shelf Subject
            </label>
            <div className="flex flex-wrap gap-2">
              {SHELF_SUBJECTS.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => toggleSystem(subject)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    newLog.systems.includes(subject)
                      ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                      : 'bg-slate-700/50 text-slate-400 border border-slate-600 hover:border-slate-500'
                  }`}
                >
                  {subject}
                </button>
              ))}
            </div>
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
