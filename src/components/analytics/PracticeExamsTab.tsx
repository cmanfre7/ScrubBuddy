'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatDate, cn } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, TrendingUp, Target, Calendar, Trash2 } from 'lucide-react'

interface PracticeExam {
  id: string
  examType: string
  examName: string
  score: number
  percentCorrect: number | null
  date: string
  notes: string | null
}

const EXAM_TYPES = [
  { value: 'NBME', label: 'NBME' },
  { value: 'UWSA', label: 'UWSA' },
  { value: 'COMSAE', label: 'COMSAE' },
  { value: 'FREE120', label: 'Free 120' },
]

const NBME_FORMS = ['NBME 9', 'NBME 10', 'NBME 11', 'NBME 12', 'NBME 13']
const UWSA_FORMS = ['UWSA1', 'UWSA2']
const COMSAE_FORMS = ['COMSAE 105', 'COMSAE 106', 'COMSAE 107', 'COMSAE 108']

export function PracticeExamsTab() {
  const [showAddModal, setShowAddModal] = useState(false)
  const queryClient = useQueryClient()

  // Fetch practice exams
  const { data: practiceExams = [], isLoading } = useQuery<PracticeExam[]>({
    queryKey: ['practice-exams'],
    queryFn: async () => {
      const res = await fetch('/api/practice-exams')
      if (!res.ok) throw new Error('Failed to fetch practice exams')
      return res.json()
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/practice-exams/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete practice exam')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-exams'] })
    },
  })

  // Calculate stats
  const avgScore = practiceExams.length > 0
    ? Math.round(practiceExams.reduce((sum, e) => sum + e.score, 0) / practiceExams.length)
    : 0

  const latestScore = practiceExams.length > 0
    ? [...practiceExams].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].score
    : 0

  const trend = practiceExams.length >= 2
    ? latestScore - avgScore
    : 0

  // Prepare chart data
  const chartData = [...practiceExams]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(exam => ({
      name: exam.examName,
      score: exam.score,
      date: formatDate(new Date(exam.date)),
    }))

  // Group by exam type
  const nbmeExams = practiceExams.filter(e => e.examType === 'NBME')
  const uwsaExams = practiceExams.filter(e => e.examType === 'UWSA')
  const comsaeExams = practiceExams.filter(e => e.examType === 'COMSAE')

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Loading practice exams...</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/30 border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Exams</p>
                <p className="text-2xl font-bold text-slate-100">{practiceExams.length}</p>
              </div>
              <Target className="text-slate-600" size={32} />
            </div>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Avg Score</p>
                <p className="text-2xl font-bold text-blue-400">{avgScore}</p>
              </div>
              <TrendingUp className="text-blue-600" size={32} />
            </div>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Latest Score</p>
                <p className="text-2xl font-bold text-purple-400">{latestScore}</p>
              </div>
              <Calendar className="text-purple-600" size={32} />
            </div>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Trend</p>
                <p className={cn(
                  'text-2xl font-bold',
                  trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-slate-400'
                )}>
                  {trend > 0 ? '+' : ''}{trend}
                </p>
              </div>
              <TrendingUp className={cn(
                trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-slate-600'
              )} size={32} />
            </div>
          </Card>
        </div>

        {/* Score Trend Chart */}
        {chartData.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                Score Progression
              </h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis
                    domain={[180, 280]}
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#cbd5e1' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Exams by Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* NBME */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
              NBME Forms
            </h3>
            {nbmeExams.length > 0 ? (
              <ul className="space-y-2">
                {nbmeExams.map(exam => (
                  <li key={exam.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                    <div>
                      <span className="text-sm font-medium text-slate-200">{exam.examName}</span>
                      <p className="text-xs text-slate-500">{formatDate(new Date(exam.date))}</p>
                    </div>
                    <span className="text-lg font-bold text-blue-400">{exam.score}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">No NBME exams yet</p>
            )}
          </Card>

          {/* UWSA */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
              UWSA
            </h3>
            {uwsaExams.length > 0 ? (
              <ul className="space-y-2">
                {uwsaExams.map(exam => (
                  <li key={exam.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                    <div>
                      <span className="text-sm font-medium text-slate-200">{exam.examName}</span>
                      <p className="text-xs text-slate-500">{formatDate(new Date(exam.date))}</p>
                    </div>
                    <span className="text-lg font-bold text-purple-400">{exam.score}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">No UWSA exams yet</p>
            )}
          </Card>

          {/* COMSAE */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
              COMSAE
            </h3>
            {comsaeExams.length > 0 ? (
              <ul className="space-y-2">
                {comsaeExams.map(exam => (
                  <li key={exam.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                    <div>
                      <span className="text-sm font-medium text-slate-200">{exam.examName}</span>
                      <p className="text-xs text-slate-500">{formatDate(new Date(exam.date))}</p>
                    </div>
                    <span className="text-lg font-bold text-yellow-400">{exam.score}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">No COMSAE exams yet</p>
            )}
          </Card>
        </div>

        {/* All Exams Table */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              All Practice Exams
            </h2>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus size={16} />
              Add Exam
            </Button>
          </div>

          {practiceExams.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Exam
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Score
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      % Correct
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {practiceExams.map((exam) => (
                    <tr key={exam.id} className="border-b border-slate-700/50 last:border-0">
                      <td className="py-3.5 px-4 text-sm font-medium text-slate-200">
                        {exam.examName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-1 bg-slate-700/50 text-slate-300 text-xs font-medium rounded">
                          {exam.examType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-lg font-bold text-blue-400">{exam.score}</span>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-slate-400">
                        {exam.percentCorrect ? `${exam.percentCorrect}%` : '--'}
                      </td>
                      <td className="py-3.5 px-4 text-sm text-slate-400">
                        {formatDate(new Date(exam.date))}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => deleteMutation.mutate(exam.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="mx-auto text-slate-600 mb-3" size={40} />
              <p className="text-slate-400 mb-2">No practice exams yet</p>
              <p className="text-sm text-slate-500 mb-4">
                Log your NBME, UWSA, and COMSAE scores to track progress
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus size={16} />
                Add First Exam
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Add Exam Modal */}
      {showAddModal && (
        <AddPracticeExamModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            queryClient.invalidateQueries({ queryKey: ['practice-exams'] })
          }}
        />
      )}
    </>
  )
}

function AddPracticeExamModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    examType: '',
    examName: '',
    score: '',
    percentCorrect: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const addExamMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/practice-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to add practice exam')
      return res.json()
    },
    onSuccess,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addExamMutation.mutate({
      examType: formData.examType,
      examName: formData.examName,
      score: parseInt(formData.score),
      percentCorrect: formData.percentCorrect ? parseInt(formData.percentCorrect) : null,
      date: new Date(formData.date).toISOString(),
      notes: formData.notes || null,
    })
  }

  // Get form options based on exam type
  const getExamOptions = () => {
    switch (formData.examType) {
      case 'NBME':
        return NBME_FORMS
      case 'UWSA':
        return UWSA_FORMS
      case 'COMSAE':
        return COMSAE_FORMS
      default:
        return []
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Add Practice Exam">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Exam Type
          </label>
          <Select
            options={[
              { value: '', label: 'Select type...' },
              ...EXAM_TYPES
            ]}
            value={formData.examType}
            onChange={(e) => setFormData({ ...formData, examType: e.target.value, examName: '' })}
            required
          />
        </div>

        {formData.examType && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Exam Name
            </label>
            <Select
              options={[
                { value: '', label: 'Select exam...' },
                ...getExamOptions().map(exam => ({ value: exam, label: exam }))
              ]}
              value={formData.examName}
              onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            3-Digit Score
          </label>
          <Input
            type="number"
            min="180"
            max="300"
            value={formData.score}
            onChange={(e) => setFormData({ ...formData, score: e.target.value })}
            placeholder="245"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Percent Correct (optional)
          </label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.percentCorrect}
            onChange={(e) => setFormData({ ...formData, percentCorrect: e.target.value })}
            placeholder="75"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Date Taken
          </label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Notes (optional)
          </label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any notes about this exam..."
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={addExamMutation.isPending}
          >
            {addExamMutation.isPending ? 'Adding...' : 'Add Exam'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
