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

// EPC (score) to Percentile conversion tables from NBME (2025-2026 data, averaged across quarters)
const EPC_TO_PERCENTILE: Record<string, Record<number, number>> = {
  'Family Medicine': { 100: 100, 99: 100, 98: 100, 97: 100, 96: 100, 95: 100, 94: 100, 93: 100, 92: 100, 91: 100, 90: 99, 89: 98, 88: 98, 87: 96, 86: 95, 85: 93, 84: 89, 83: 85, 82: 82, 81: 77, 80: 72, 79: 67, 78: 62, 77: 57, 76: 51, 75: 46, 74: 40, 73: 34, 72: 29, 71: 25, 70: 22, 69: 18, 68: 15, 67: 12, 66: 10, 65: 8, 64: 7, 63: 5, 62: 4, 61: 3, 60: 2, 59: 2, 58: 1, 57: 1, 56: 0, 55: 0 },
  'Internal Medicine': { 100: 100, 99: 100, 98: 100, 97: 100, 96: 100, 95: 100, 94: 100, 93: 100, 92: 100, 91: 99, 90: 99, 89: 98, 88: 97, 87: 96, 86: 94, 85: 92, 84: 89, 83: 86, 82: 83, 81: 80, 80: 76, 79: 72, 78: 67, 77: 63, 76: 59, 75: 54, 74: 50, 73: 45, 72: 41, 71: 37, 70: 32, 69: 29, 68: 26, 67: 22, 66: 19, 65: 16, 64: 14, 63: 12, 62: 10, 61: 8, 60: 7, 59: 6, 58: 5, 57: 4, 56: 3, 55: 2 },
  'OB/GYN': { 100: 100, 99: 100, 98: 100, 97: 100, 96: 100, 95: 100, 94: 99, 93: 99, 92: 98, 91: 97, 90: 95, 89: 94, 88: 90, 87: 86, 86: 83, 85: 78, 84: 74, 83: 67, 82: 62, 81: 56, 80: 51, 79: 46, 78: 41, 77: 36, 76: 32, 75: 27, 74: 23, 73: 20, 72: 16, 71: 13, 70: 11, 69: 10, 68: 8, 67: 6, 66: 5, 65: 4, 64: 3, 63: 2, 62: 2, 61: 2, 60: 1, 59: 1, 58: 1, 57: 0, 56: 0, 55: 0 },
  'Pediatrics': { 100: 100, 99: 100, 98: 100, 97: 100, 96: 100, 95: 100, 94: 100, 93: 99, 92: 98, 91: 98, 90: 96, 89: 94, 88: 92, 87: 90, 86: 86, 85: 82, 84: 78, 83: 74, 82: 69, 81: 64, 80: 60, 79: 55, 78: 50, 77: 44, 76: 39, 75: 34, 74: 30, 73: 26, 72: 23, 71: 20, 70: 17, 69: 14, 68: 12, 67: 10, 66: 8, 65: 6, 64: 6, 63: 4, 62: 3, 61: 3, 60: 2, 59: 2, 58: 2, 57: 2, 56: 1, 55: 0 },
  'Psychiatry': { 100: 100, 99: 100, 98: 100, 97: 100, 96: 100, 95: 98, 94: 97, 93: 95, 92: 91, 91: 86, 90: 80, 89: 74, 88: 68, 87: 61, 86: 54, 85: 47, 84: 41, 83: 35, 82: 29, 81: 23, 80: 19, 79: 16, 78: 12, 77: 10, 76: 8, 75: 6, 74: 5, 73: 4, 72: 2, 71: 2, 70: 2, 69: 1, 68: 1, 67: 1, 66: 0, 65: 0, 64: 0, 63: 0, 62: 0, 61: 0, 60: 0, 59: 0, 58: 0, 57: 0, 56: 0, 55: 0 },
  'Surgery': { 100: 100, 99: 100, 98: 100, 97: 100, 96: 100, 95: 100, 94: 100, 93: 100, 92: 100, 91: 100, 90: 99, 89: 98, 88: 98, 87: 96, 86: 95, 85: 94, 84: 91, 83: 88, 82: 86, 81: 83, 80: 79, 79: 75, 78: 70, 77: 66, 76: 61, 75: 56, 74: 51, 73: 46, 72: 41, 71: 36, 70: 32, 69: 28, 68: 24, 67: 20, 66: 18, 65: 15, 64: 12, 63: 11, 62: 9, 61: 7, 60: 6, 59: 5, 58: 4, 57: 3, 56: 2, 55: 2 },
  'Neurology': { 100: 100, 99: 100, 98: 100, 97: 100, 96: 100, 95: 100, 94: 100, 93: 100, 92: 100, 91: 100, 90: 99, 89: 98, 88: 98, 87: 96, 86: 95, 85: 94, 84: 91, 83: 88, 82: 86, 81: 83, 80: 79, 79: 75, 78: 70, 77: 66, 76: 61, 75: 56, 74: 51, 73: 46, 72: 41, 71: 36, 70: 32, 69: 28, 68: 24, 67: 20, 66: 18, 65: 15, 64: 12, 63: 11, 62: 9, 61: 7, 60: 6, 59: 5, 58: 4, 57: 3, 56: 2, 55: 2 },
  'Emergency Medicine': { 100: 100, 99: 100, 98: 100, 97: 100, 96: 100, 95: 100, 94: 100, 93: 100, 92: 100, 91: 100, 90: 99, 89: 98, 88: 98, 87: 96, 86: 95, 85: 94, 84: 91, 83: 88, 82: 86, 81: 83, 80: 79, 79: 75, 78: 70, 77: 66, 76: 61, 75: 56, 74: 51, 73: 46, 72: 41, 71: 36, 70: 32, 69: 28, 68: 24, 67: 20, 66: 18, 65: 15, 64: 12, 63: 11, 62: 9, 61: 7, 60: 6, 59: 5, 58: 4, 57: 3, 56: 2, 55: 2 },
}

// Get percentile from score using NBME conversion tables
function getPercentileFromScore(rotationName: string, score: number): number | null {
  const conversions = EPC_TO_PERCENTILE[rotationName]
  if (!conversions) return null
  return conversions[score] ?? null
}

const ROTATION_OPTIONS = Object.keys(EPC_TO_PERCENTILE)

// NBME exam options for each rotation subject
const NBME_EXAM_OPTIONS: Record<string, string[]> = {
  'Internal Medicine': ['NBME Medicine Form 5', 'NBME Medicine Form 6', 'NBME Medicine Form 7', 'NBME Medicine Form 8'],
  'Surgery': ['NBME Surgery Form 5', 'NBME Surgery Form 6', 'NBME Surgery Form 7', 'NBME Surgery Form 8'],
  'Pediatrics': ['NBME Pediatrics Form 5', 'NBME Pediatrics Form 6', 'NBME Pediatrics Form 7', 'NBME Pediatrics Form 8'],
  'Psychiatry': ['NBME Psychiatry Form 5', 'NBME Psychiatry Form 6', 'NBME Psychiatry Form 7', 'NBME Psychiatry Form 8'],
  'OB/GYN': ['NBME OB/GYN Form 5', 'NBME OB/GYN Form 6', 'NBME OB/GYN Form 7', 'NBME OB/GYN Form 8'],
  'Family Medicine': ['NBME Family Medicine Form 5', 'NBME Family Medicine Form 6', 'NBME Family Medicine Form 7', 'NBME Family Medicine Form 8'],
  'Neurology': ['NBME Neurology Form 5', 'NBME Neurology Form 6', 'NBME Neurology Form 7', 'NBME Neurology Form 8'],
  'Emergency Medicine': ['NBME Emergency Medicine Form 5', 'NBME Emergency Medicine Form 6', 'NBME Emergency Medicine Form 7', 'NBME Emergency Medicine Form 8'],
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

  // Calculate stats with actual percentiles
  const avgScore = shelfScores.length > 0
    ? Math.round(shelfScores.reduce((sum, s) => sum + s.score, 0) / shelfScores.length)
    : 0

  const avgPercentile = shelfScores.length > 0
    ? Math.round(shelfScores.reduce((sum, s) => {
        const percentile = s.percentile ?? getPercentileFromScore(s.rotationName, s.score) ?? 0
        return sum + percentile
      }, 0) / shelfScores.length)
    : 0

  // Honors is typically 70th percentile or higher
  const honorsCount = shelfScores.filter(s => {
    const percentile = s.percentile ?? getPercentileFromScore(s.rotationName, s.score)
    return percentile !== null && percentile >= 70
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
                <p className="text-sm text-slate-400 mb-1">Honors (≥70th)</p>
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
                NBME SA Score
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
                      vs. National Avg
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

                    // Only show row if there's either a shelf score or practice exams
                    if (!shelf && practices.length === 0) return null

                    // Get actual percentile (from DB or calculated)
                    const percentile = shelf
                      ? (shelf.percentile ?? getPercentileFromScore(shelf.rotationName, shelf.score))
                      : null

                    // Calculate difference from 50th percentile (national average)
                    const vsNationalAvg = percentile !== null ? percentile - 50 : null

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
                                percentile !== null && percentile >= 70
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : percentile !== null && percentile >= 50
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
                          {percentile !== null ? `${percentile}th` : '--'}
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
                          {vsNationalAvg !== null ? (
                            <span
                              className={cn(
                                'text-xs font-medium',
                                vsNationalAvg >= 0 ? 'text-green-400' : 'text-red-400'
                              )}
                            >
                              {vsNationalAvg > 0 ? '+' : ''}{vsNationalAvg}
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
                  NBME SA Score
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

  // Auto-calculate percentile when score or rotation changes
  const calculatedPercentile = formData.rotationName && formData.score
    ? getPercentileFromScore(formData.rotationName, parseInt(formData.score))
    : null

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

    // Use calculated percentile if user didn't provide one
    const finalPercentile = formData.percentile
      ? parseInt(formData.percentile)
      : calculatedPercentile

    addScoreMutation.mutate({
      rotationName: formData.rotationName,
      score: parseInt(formData.score),
      percentile: finalPercentile,
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
          {calculatedPercentile !== null && (
            <p className="text-xs text-slate-400 mt-1">
              This score corresponds to the {calculatedPercentile}th percentile
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Percentile (optional - auto-calculated from score)
          </label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.percentile}
            onChange={(e) => setFormData({ ...formData, percentile: e.target.value })}
            placeholder={calculatedPercentile !== null ? calculatedPercentile.toString() : ''}
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
