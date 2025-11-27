'use client'

import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { formatDate, cn } from '@/lib/utils'
import { Calendar, Clock, TrendingUp, TrendingDown, Target, BookOpen } from 'lucide-react'

interface BoardExam {
  id: string
  examType: string
  targetScore: number
  predictedScore: number | null
  examDate: string | null
  readinessPercent: number | null
}

interface ShelfScore {
  id: string
  rotationName: string
  score: number
  percentile: number | null
  date: string
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

export function OverviewTab() {
  // Fetch board exams
  const { data: boardExams = [] } = useQuery<BoardExam[]>({
    queryKey: ['board-exams'],
    queryFn: async () => {
      const res = await fetch('/api/board-exams')
      if (!res.ok) return []
      return res.json()
    },
  })

  // Fetch shelf scores
  const { data: shelfScores = [] } = useQuery<ShelfScore[]>({
    queryKey: ['shelf-scores'],
    queryFn: async () => {
      const res = await fetch('/api/shelf-scores')
      if (!res.ok) return []
      return res.json()
    },
  })

  // Calculate stats with actual percentiles
  const completedShelves = shelfScores.length
  const avgPercentile = shelfScores.length > 0
    ? Math.round(
        shelfScores.reduce((sum, s) => {
          const percentile = s.percentile ?? getPercentileFromScore(s.rotationName, s.score) ?? 0
          return sum + percentile
        }, 0) / shelfScores.length
      )
    : 0

  // Mock weak/strong areas for now
  const weakAreas = [
    { name: 'Biostatistics', percent: 54 },
    { name: 'Renal Physiology', percent: 58 },
    { name: 'OB Emergencies', percent: 61 },
    { name: 'Pediatric Milestones', percent: 63 },
  ]

  const strongAreas = [
    { name: 'Cardiology', percent: 81 },
    { name: 'Psychiatry', percent: 79 },
    { name: 'Infectious Disease', percent: 77 },
    { name: 'Pulmonology', percent: 76 },
  ]

  return (
    <div className="space-y-6">
      {/* Board Targets */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
            Your Board Targets
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {boardExams.map((exam) => {
            const examName = exam.examType === 'USMLE_STEP_2_CK' ? 'USMLE Step 2 CK' : 'COMLEX Level 2-CE'
            const badge = exam.examType === 'USMLE_STEP_2_CK' ? 'ALLOPATHIC' : 'OSTEOPATHIC'
            const daysUntil = exam.examDate
              ? Math.ceil((new Date(exam.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null

            return (
              <div
                key={exam.id}
                className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <h3 className="text-lg font-semibold text-slate-100">{examName}</h3>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded">
                    {badge}
                  </span>
                </div>

                {/* Scores */}
                <div className="flex items-baseline justify-center gap-4 mb-5">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-slate-400">{exam.targetScore}</div>
                    <div className="text-xs text-slate-500 mt-1">Target</div>
                  </div>
                  <div className="text-slate-600 text-sm">→</div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">
                      {exam.predictedScore || '--'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Predicted</div>
                  </div>
                </div>

                {/* Readiness */}
                {exam.readinessPercent !== null && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-slate-400">Readiness</span>
                      <span className="text-blue-400 font-semibold">{exam.readinessPercent}%</span>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                        style={{ width: `${exam.readinessPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {exam.examDate && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        Exam: {formatDate(new Date(exam.examDate))}
                      </div>
                      {daysUntil !== null && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} />
                          {daysUntil} days away
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {/* Empty state */}
          {boardExams.length === 0 && (
            <div className="col-span-2 text-center py-12">
              <Target className="mx-auto text-slate-600 mb-3" size={40} />
              <p className="text-slate-400 mb-2">No board targets set</p>
              <p className="text-sm text-slate-500">
                Add your Step 2 CK or COMLEX Level 2 targets in Settings
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Shelf Exam Summary */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
            Shelf Exam Summary
          </h2>
          <span className="text-sm text-slate-500">
            Completed: {completedShelves}/8 · Avg Percentile: {avgPercentile}th
          </span>
        </div>

        {shelfScores.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Rotation
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Score
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Percentile
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    vs. National Avg
                  </th>
                </tr>
              </thead>
              <tbody>
                {shelfScores.map((shelf) => {
                  // Get actual percentile (from DB or calculated using NBME data)
                  const percentile = shelf.percentile ?? getPercentileFromScore(shelf.rotationName, shelf.score)
                  // Compare to 50th percentile (national average)
                  const delta = percentile !== null ? percentile - 50 : null

                  return (
                    <tr key={shelf.id} className="border-b border-slate-700/50 last:border-0">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="text-sm font-medium text-slate-200">
                            {shelf.rotationName}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
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
                      </td>
                      <td className="py-3.5 px-4 text-sm text-slate-400">
                        {percentile !== null ? `${percentile}th` : '--'}
                      </td>
                      <td className="py-3.5 px-4">
                        {delta !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  delta > 0 ? 'bg-green-500' : delta < 0 ? 'bg-red-500' : 'bg-slate-500'
                                )}
                                style={{
                                  width: `${Math.min(Math.abs(delta * 2), 100)}%`,
                                }}
                              />
                            </div>
                            <span
                              className={cn(
                                'text-xs font-medium',
                                delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-slate-400'
                              )}
                            >
                              {delta > 0 ? '+' : ''}
                              {delta}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">--</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="mx-auto text-slate-600 mb-3" size={40} />
            <p className="text-slate-400 mb-2">No shelf scores yet</p>
            <p className="text-sm text-slate-500">
              Add your shelf exam scores as you complete rotations
            </p>
          </div>
        )}
      </Card>

      {/* Weak/Strong Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Weak Areas */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="text-red-400" size={18} />
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              Weak Areas
            </h3>
          </div>
          <ul className="space-y-0">
            {weakAreas.map((area) => (
              <li
                key={area.name}
                className="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0"
              >
                <span className="flex items-center gap-2 text-sm text-slate-200">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  {area.name}
                </span>
                <span className="text-sm text-slate-500">{area.percent}%</span>
              </li>
            ))}
          </ul>
          <a
            href="#"
            className="inline-block mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            View Study Plan →
          </a>
        </Card>

        {/* Strong Areas */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-green-400" size={18} />
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              Strong Areas
            </h3>
          </div>
          <ul className="space-y-0">
            {strongAreas.map((area) => (
              <li
                key={area.name}
                className="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0"
              >
                <span className="flex items-center gap-2 text-sm text-slate-200">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {area.name}
                </span>
                <span className="text-sm text-slate-500">{area.percent}%</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
