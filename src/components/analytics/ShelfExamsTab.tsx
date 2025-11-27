'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatDate, cn } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Plus, TrendingUp, Award, Calendar } from 'lucide-react'

interface ShelfScore {
  id: string
  rotationName: string
  score: number
  percentile: number | null
  date: string
}

interface PracticeExam {
  id: string
  examType: string
  examName: string
  score: number
  percentCorrect: number | null
  date: string
  notes: string | null
}

// National percentile benchmarks (2024-2025 data)
const SHELF_BENCHMARKS: Record<string, { avg: number, honors: number }> = {
  'Internal Medicine': { avg: 70, honors: 84 },
  'Surgery': { avg: 70, honors: 85 },
  'Pediatrics': { avg: 70, honors: 83 },
  'Psychiatry': { avg: 70, honors: 92 },
  'OB/GYN': { avg: 70, honors: 82 },
  'Family Medicine': { avg: 70, honors: 84 },
  'Neurology': { avg: 70, honors: 83 },
  'Emergency Medicine': { avg: 70, honors: 85 },
}

const ROTATION_OPTIONS = Object.keys(SHELF_BENCHMARKS)

// NBME exam options for each rotation subject
const NBME_EXAM_OPTIONS: Record<string, string[]> = {
  'Internal Medicine': ['NBME Medicine Form 1', 'NBME Medicine Form 2', 'NBME Medicine Form 3', 'NBME Medicine Form 4'],
  'Surgery': ['NBME Surgery Form 1', 'NBME Surgery Form 2', 'NBME Surgery Form 3'],
  'Pediatrics': ['NBME Pediatrics Form 1', 'NBME Pediatrics Form 2', 'NBME Pediatrics Form 3'],
  'Psychiatry': ['NBME Psychiatry Form 1', 'NBME Psychiatry Form 2', 'NBME Psychiatry Form 3'],
  'OB/GYN': ['NBME OB/GYN Form 1', 'NBME OB/GYN Form 2', 'NBME OB/GYN Form 3'],
  'Family Medicine': ['NBME Family Medicine Form 1', 'NBME Family Medicine Form 2', 'NBME Family Medicine Form 3'],
  'Neurology': ['NBME Neurology Form 1', 'NBME Neurology Form 2', 'NBME Neurology Form 3'],
  'Emergency Medicine': ['NBME Emergency Medicine Form 1', 'NBME Emergency Medicine Form 2'],
}

export function ShelfExamsTab() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddPracticeModal, setShowAddPracticeModal] = useState(false)
  const queryClient = useQueryClient()

  // Fetch shelf scores
  const { data: shelfScores = [], isLoading } = useQuery<ShelfScore[]>({
    queryKey: ['shelf-scores'],
    queryFn: async () => {
      const res = await fetch('/api/shelf-scores')
      if (!res.ok) throw new Error('Failed to fetch shelf scores')
      return res.json()
    },
  })

  // Fetch NBME practice exams
  const { data: practiceExams = [], isLoading: isLoadingPractice } = useQuery<PracticeExam[]>({
    queryKey: ['practice-exams', 'NBME'],
    queryFn: async () => {
      const res = await fetch('/api/practice-exams?examType=NBME')
      if (!res.ok) throw new Error('Failed to fetch practice exams')
      return res.json()
    },
  })

  // Map practice exams to rotations based on exam name
  const practiceExamsByRotation = practiceExams.reduce((acc, exam) => {
    let rotationName = ''
    const examNameLower = exam.examName.toLowerCase()

    if (examNameLower.includes('medicine') && !examNameLower.includes('family') && !examNameLower.includes('emergency')) {
      rotationName = 'Internal Medicine'
    } else if (examNameLower.includes('surgery')) {
      rotationName = 'Surgery'
    } else if (examNameLower.includes('pediatric') || examNameLower.includes('peds')) {
      rotationName = 'Pediatrics'
    } else if (examNameLower.includes('psychiatry') || examNameLower.includes('psych')) {
      rotationName = 'Psychiatry'
    } else if (examNameLower.includes('ob') || examNameLower.includes('gyn')) {
      rotationName = 'OB/GYN'
    } else if (examNameLower.includes('family')) {
      rotationName = 'Family Medicine'
    } else if (examNameLower.includes('neuro')) {
      rotationName = 'Neurology'
    } else if (examNameLower.includes('emergency')) {
      rotationName = 'Emergency Medicine'
    }

    if (rotationName) {
      if (!acc[rotationName]) acc[rotationName] = []
      acc[rotationName].push(exam)
    }
    return acc
  }, {} as Record<string, PracticeExam[]>)

  // Calculate stats
  const avgScore = shelfScores.length > 0
    ? Math.round(shelfScores.reduce((sum, s) => sum + s.score, 0) / shelfScores.length)
    : 0

  const avgPercentile = shelfScores.length > 0
    ? Math.round(shelfScores.reduce((sum, s) => sum + (s.percentile || 0), 0) / shelfScores.length)
    : 0

  const honorsCount = shelfScores.filter(s => {
    const benchmark = SHELF_BENCHMARKS[s.rotationName]
    return benchmark && s.score >= benchmark.honors
  }).length

  // Prepare chart data
  const chartData = [...shelfScores]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(score => ({
      name: score.rotationName.substring(0, 10),
      score: score.score,
      date: formatDate(new Date(score.date)),
    }))

  if (isLoading || isLoadingPractice) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Loading shelf scores...</p>
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
                <p className="text-sm text-slate-400 mb-1">Completed</p>
                <p className="text-2xl font-bold text-slate-100">{shelfScores.length}/8</p>
              </div>
              <Calendar className="text-slate-600" size={32} />
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
                <p className="text-sm text-slate-400 mb-1">Avg Percentile</p>
                <p className="text-2xl font-bold text-purple-400">{avgPercentile}th</p>
              </div>
              <TrendingUp className="text-purple-600" size={32} />
            </div>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Honors</p>
                <p className="text-2xl font-bold text-yellow-400">{honorsCount}</p>
              </div>
              <Award className="text-yellow-600" size={32} />
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
                    domain={[50, 100]}
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
                  <ReferenceLine y={70} stroke="#64748b" strokeDasharray="3 3" label={{ value: 'Avg', fill: '#64748b', fontSize: 10 }} />
                  <ReferenceLine y={85} stroke="#eab308" strokeDasharray="3 3" label={{ value: 'Honors', fill: '#eab308', fontSize: 10 }} />
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

        {/* Detailed Scores Table */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              All Shelf Exams
            </h2>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddPracticeModal(true)} className="bg-purple-600 hover:bg-purple-700">
                <Plus size={16} />
                Add NBME
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus size={16} />
                Add Shelf Score
              </Button>
            </div>
          </div>

          {shelfScores.length > 0 || practiceExams.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Rotation
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Shelf Score
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Percentile
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      NBME Practice
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      vs. Honors
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROTATION_OPTIONS.map((rotationName) => {
                    const shelf = shelfScores.find(s => s.rotationName === rotationName)
                    const practices = practiceExamsByRotation[rotationName] || []
                    const benchmark = SHELF_BENCHMARKS[rotationName]

                    // Only show row if there's either a shelf score or practice exams
                    if (!shelf && practices.length === 0) return null

                    const honorsGap = shelf && benchmark ? shelf.score - benchmark.honors : 0

                    return (
                      <tr key={rotationName} className="border-b border-slate-700/50 last:border-0">
                        <td className="py-3.5 px-4 text-sm font-medium text-slate-200">
                          {rotationName}
                        </td>
                        <td className="py-3.5 px-4">
                          {shelf ? (
                            <span
                              className={cn(
                                'inline-block px-2.5 py-1 rounded text-xs font-semibold',
                                benchmark && shelf.score >= benchmark.honors
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : shelf.score >= 70
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-slate-700/50 text-slate-400'
                              )}
                            >
                              {shelf.score}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">--</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-sm text-slate-400">
                          {shelf?.percentile ? `${shelf.percentile}th` : '--'}
                        </td>
                        <td className="py-3.5 px-4">
                          {practices.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {practices.slice(0, 2).map((practice) => (
                                <div key={practice.id} className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400">{practice.examName}:</span>
                                  <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/20 text-purple-400">
                                    {practice.score}
                                  </span>
                                  {practice.percentCorrect && (
                                    <span className="text-xs text-slate-500">({practice.percentCorrect}%)</span>
                                  )}
                                </div>
                              ))}
                              {practices.length > 2 && (
                                <span className="text-xs text-slate-500">+{practices.length - 2} more</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">--</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {shelf ? (
                            <span
                              className={cn(
                                'text-xs font-medium',
                                honorsGap >= 0 ? 'text-yellow-400' : 'text-slate-500'
                              )}
                            >
                              {honorsGap >= 0 ? '✓ Honors' : `${honorsGap}`}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">--</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-sm text-slate-400">
                          {shelf ? formatDate(new Date(shelf.date)) : '--'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Award className="mx-auto text-slate-600 mb-3" size={40} />
              <p className="text-slate-400 mb-2">No shelf scores or practice exams yet</p>
              <p className="text-sm text-slate-500 mb-4">
                Add your shelf exam scores and NBME practice exams as you complete rotations
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setShowAddPracticeModal(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus size={16} />
                  Add NBME
                </Button>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus size={16} />
                  Add Shelf Score
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Add Shelf Score Modal */}
      {showAddModal && (
        <AddShelfScoreModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            queryClient.invalidateQueries({ queryKey: ['shelf-scores'] })
          }}
        />
      )}

      {/* Add NBME Practice Exam Modal */}
      {showAddPracticeModal && (
        <AddNBMEModal
          onClose={() => setShowAddPracticeModal(false)}
          onSuccess={() => {
            setShowAddPracticeModal(false)
            queryClient.invalidateQueries({ queryKey: ['practice-exams', 'NBME'] })
          }}
        />
      )}
    </>
  )
}

function AddShelfScoreModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    rotationName: '',
    score: '',
    percentile: '',
    date: new Date().toISOString().split('T')[0],
  })

  const addScoreMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/shelf-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to add shelf score')
      return res.json()
    },
    onSuccess,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addScoreMutation.mutate({
      rotationName: formData.rotationName,
      score: parseInt(formData.score),
      percentile: formData.percentile ? parseInt(formData.percentile) : null,
      date: new Date(formData.date).toISOString(),
    })
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Add Shelf Score">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Rotation
          </label>
          <Select
            options={[
              { value: '', label: 'Select rotation...' },
              ...ROTATION_OPTIONS.map(rotation => ({ value: rotation, label: rotation }))
            ]}
            value={formData.rotationName}
            onChange={(e) => setFormData({ ...formData, rotationName: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Score
          </label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.score}
            onChange={(e) => setFormData({ ...formData, score: e.target.value })}
            placeholder="85"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Percentile (optional)
          </label>
          <Input
            type="number"
            min="1"
            max="99"
            value={formData.percentile}
            onChange={(e) => setFormData({ ...formData, percentile: e.target.value })}
            placeholder="75"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Date
          </label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
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
            disabled={addScoreMutation.isPending}
          >
            {addScoreMutation.isPending ? 'Adding...' : 'Add Score'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function AddNBMEModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    subject: '',
    examName: '',
    score: '',
    percentCorrect: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const [availableExams, setAvailableExams] = useState<string[]>([])

  const addPracticeMutation = useMutation({
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

  const handleSubjectChange = (subject: string) => {
    setFormData({ ...formData, subject, examName: '' })
    setAvailableExams(NBME_EXAM_OPTIONS[subject] || [])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addPracticeMutation.mutate({
      examType: 'NBME',
      examName: formData.examName,
      score: parseInt(formData.score),
      percentCorrect: formData.percentCorrect ? parseFloat(formData.percentCorrect) : null,
      date: new Date(formData.date).toISOString(),
      notes: formData.notes || null,
    })
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Add NBME Practice Exam">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Subject
          </label>
          <Select
            options={[
              { value: '', label: 'Select subject...' },
              ...ROTATION_OPTIONS.map(rotation => ({ value: rotation, label: rotation }))
            ]}
            value={formData.subject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            required
          />
        </div>

        {formData.subject && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Exam
            </label>
            <Select
              options={[
                { value: '', label: 'Select exam...' },
                ...availableExams.map(exam => ({ value: exam, label: exam }))
              ]}
              value={formData.examName}
              onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Score
          </label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.score}
            onChange={(e) => setFormData({ ...formData, score: e.target.value })}
            placeholder="85"
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
            step="0.1"
            value={formData.percentCorrect}
            onChange={(e) => setFormData({ ...formData, percentCorrect: e.target.value })}
            placeholder="85.5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Date
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
          <Input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Weak areas, topics to review..."
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
            disabled={addPracticeMutation.isPending}
          >
            {addPracticeMutation.isPending ? 'Adding...' : 'Add Exam'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
