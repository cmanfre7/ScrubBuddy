'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { StatCard } from '@/components/ui/stat-card'
import { formatDate, cn } from '@/lib/utils'
import {
  Layers,
  Plus,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  Calculator,
  Settings,
  BarChart3,
} from 'lucide-react'
import { format, differenceInDays, addDays, subDays, startOfWeek, eachDayOfInterval } from 'date-fns'

interface AnkiProgress {
  id: string
  date: string
  newCards: number
  reviewCards: number
  totalTime: number | null
  deckName: string | null
}

interface AnkiGoal {
  id: string
  totalCards: number
  cardsCompleted: number
  targetDate: string | null
  dailyNewGoal: number
  dailyReviewGoal: number
}

export default function AnkingPage() {
  const queryClient = useQueryClient()
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [logData, setLogData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    newCards: 0,
    reviewCards: 0,
    totalTime: 0,
    deckName: 'AnKing',
  })

  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['anki-progress'],
    queryFn: async () => {
      const res = await fetch('/api/anking/progress')
      return res.json()
    },
  })

  const { data: goalData, isLoading: goalLoading } = useQuery({
    queryKey: ['anki-goal'],
    queryFn: async () => {
      const res = await fetch('/api/anking/goal')
      return res.json()
    },
  })

  const logMutation = useMutation({
    mutationFn: async (data: typeof logData) => {
      const res = await fetch('/api/anking/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to log progress')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anki-progress'] })
      setIsLogModalOpen(false)
      setLogData({
        date: format(new Date(), 'yyyy-MM-dd'),
        newCards: 0,
        reviewCards: 0,
        totalTime: 0,
        deckName: 'AnKing',
      })
    },
  })

  const goalMutation = useMutation({
    mutationFn: async (data: Partial<AnkiGoal>) => {
      const res = await fetch('/api/anking/goal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update goal')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anki-goal'] })
      setIsGoalModalOpen(false)
    },
  })

  const progress: AnkiProgress[] = progressData?.progress || []
  const goal: AnkiGoal | null = goalData?.goal || null

  // Calculate statistics
  const today = new Date()
  const todayProgress = progress.find(p =>
    format(new Date(p.date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  )

  const last7Days = progress.filter(p => {
    const date = new Date(p.date)
    return differenceInDays(today, date) < 7
  })

  const totalNewThisWeek = last7Days.reduce((sum, p) => sum + p.newCards, 0)
  const totalReviewThisWeek = last7Days.reduce((sum, p) => sum + p.reviewCards, 0)
  const avgTimePerDay = last7Days.length > 0
    ? Math.round(last7Days.reduce((sum, p) => sum + (p.totalTime || 0), 0) / last7Days.length)
    : 0

  // Calculate days until goal and required daily pace
  const daysUntilTarget = goal?.targetDate
    ? differenceInDays(new Date(goal.targetDate), today)
    : null
  const cardsRemaining = goal ? goal.totalCards - goal.cardsCompleted : 0
  const requiredDailyPace = daysUntilTarget && daysUntilTarget > 0
    ? Math.ceil(cardsRemaining / daysUntilTarget)
    : 0

  // Weekly heatmap data
  const weekStart = startOfWeek(today)
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })

  const [goalForm, setGoalForm] = useState({
    totalCards: goal?.totalCards || 0,
    cardsCompleted: goal?.cardsCompleted || 0,
    targetDate: goal?.targetDate ? format(new Date(goal.targetDate), 'yyyy-MM-dd') : '',
    dailyNewGoal: goal?.dailyNewGoal || 30,
    dailyReviewGoal: goal?.dailyReviewGoal || 200,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="text-purple-400" size={28} />
            AnKing Tracker
          </h1>
          <p className="text-slate-400 mt-1">Track your Anki progress and stay on pace</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => {
            setGoalForm({
              totalCards: goal?.totalCards || 0,
              cardsCompleted: goal?.cardsCompleted || 0,
              targetDate: goal?.targetDate ? format(new Date(goal.targetDate), 'yyyy-MM-dd') : '',
              dailyNewGoal: goal?.dailyNewGoal || 30,
              dailyReviewGoal: goal?.dailyReviewGoal || 200,
            })
            setIsGoalModalOpen(true)
          }}>
            <Settings size={18} className="mr-2" />
            Set Goals
          </Button>
          <Button onClick={() => setIsLogModalOpen(true)}>
            <Plus size={18} className="mr-2" />
            Log Progress
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's New Cards"
          value={todayProgress?.newCards || 0}
          icon={<Layers size={20} />}
          trend={todayProgress && goal && todayProgress.newCards >= goal.dailyNewGoal ? 'up' : 'stable'}
        />
        <StatCard
          label="Today's Reviews"
          value={todayProgress?.reviewCards || 0}
          icon={<TrendingUp size={20} />}
          trend={todayProgress && goal && todayProgress.reviewCards >= goal.dailyReviewGoal ? 'up' : 'stable'}
        />
        <StatCard
          label="This Week (New)"
          value={totalNewThisWeek}
          icon={<BarChart3 size={20} />}
        />
        {daysUntilTarget !== null && daysUntilTarget > 0 && (
          <StatCard
            label="Days to Goal"
            value={daysUntilTarget}
            icon={<Calendar size={20} />}
            trend={daysUntilTarget <= 30 ? 'down' : 'stable'}
          />
        )}
      </div>

      {/* Daily Pace Calculator */}
      {goal && goal.targetDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator size={18} className="text-blue-400" />
              Pace Calculator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-slate-800/30 rounded-lg">
                <p className="text-3xl font-bold text-slate-100">{cardsRemaining.toLocaleString()}</p>
                <p className="text-sm text-slate-400 mt-1">Cards Remaining</p>
              </div>
              <div className="text-center p-4 bg-slate-800/30 rounded-lg">
                <p className="text-3xl font-bold text-blue-400">{requiredDailyPace}</p>
                <p className="text-sm text-slate-400 mt-1">New Cards/Day Needed</p>
              </div>
              <div className="text-center p-4 bg-slate-800/30 rounded-lg">
                <p className="text-3xl font-bold text-slate-100">
                  {goal.cardsCompleted > 0
                    ? Math.round((goal.cardsCompleted / goal.totalCards) * 100)
                    : 0}%
                </p>
                <p className="text-sm text-slate-400 mt-1">Deck Completion</p>
              </div>
            </div>
            {requiredDailyPace > (goal.dailyNewGoal || 30) && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                You need {requiredDailyPace - (goal.dailyNewGoal || 30)} more new cards per day than your current goal to finish on time!
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Weekly Activity */}
      <Card>
        <CardHeader>
          <CardTitle>This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayProgress = progress.find(p =>
                format(new Date(p.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
              )
              const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
              const totalCards = dayProgress ? dayProgress.newCards + dayProgress.reviewCards : 0
              const intensity = totalCards > 200 ? 'high' : totalCards > 100 ? 'medium' : totalCards > 0 ? 'low' : 'none'

              return (
                <div key={day.toISOString()} className="text-center">
                  <p className="text-xs text-slate-500 mb-1">{format(day, 'EEE')}</p>
                  <div
                    className={cn(
                      'aspect-square rounded-lg flex flex-col items-center justify-center',
                      isToday && 'ring-2 ring-blue-500',
                      intensity === 'high' && 'bg-green-500/30',
                      intensity === 'medium' && 'bg-green-500/20',
                      intensity === 'low' && 'bg-green-500/10',
                      intensity === 'none' && 'bg-slate-800/30'
                    )}
                  >
                    <p className="text-lg font-semibold text-slate-100">{format(day, 'd')}</p>
                    {dayProgress && (
                      <p className="text-xs text-slate-400">
                        {dayProgress.newCards}n/{dayProgress.reviewCards}r
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {progressLoading ? (
            <p className="text-slate-500">Loading...</p>
          ) : progress.length === 0 ? (
            <p className="text-slate-500">No progress logged yet. Start tracking your Anki reviews!</p>
          ) : (
            <div className="space-y-3">
              {progress.slice(0, 10).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-200">{format(new Date(p.date), 'MMM d')}</p>
                      <p className="text-xs text-slate-500">{format(new Date(p.date), 'EEE')}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-700" />
                    <div className="flex gap-4">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-blue-400">{p.newCards}</p>
                        <p className="text-xs text-slate-500">New</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-green-400">{p.reviewCards}</p>
                        <p className="text-xs text-slate-500">Reviews</p>
                      </div>
                    </div>
                  </div>
                  {p.totalTime && (
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock size={14} />
                      <span className="text-sm">{p.totalTime} min</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Progress Modal */}
      <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title="Log Anki Progress">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            logMutation.mutate(logData)
          }}
          className="space-y-4"
        >
          <Input
            label="Date"
            type="date"
            value={logData.date}
            onChange={(e) => setLogData({ ...logData, date: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="New Cards"
              type="number"
              min={0}
              value={logData.newCards}
              onChange={(e) => setLogData({ ...logData, newCards: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="Reviews"
              type="number"
              min={0}
              value={logData.reviewCards}
              onChange={(e) => setLogData({ ...logData, reviewCards: parseInt(e.target.value) || 0 })}
            />
          </div>
          <Input
            label="Time Spent (minutes)"
            type="number"
            min={0}
            value={logData.totalTime}
            onChange={(e) => setLogData({ ...logData, totalTime: parseInt(e.target.value) || 0 })}
          />
          <Input
            label="Deck Name"
            value={logData.deckName}
            onChange={(e) => setLogData({ ...logData, deckName: e.target.value })}
            placeholder="AnKing, Zanki, etc."
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsLogModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={logMutation.isPending} className="flex-1">
              Log Progress
            </Button>
          </div>
        </form>
      </Modal>

      {/* Goals Modal */}
      <Modal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} title="Set AnKing Goals">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            goalMutation.mutate(goalForm)
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Total Cards in Deck"
              type="number"
              min={0}
              value={goalForm.totalCards}
              onChange={(e) => setGoalForm({ ...goalForm, totalCards: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="Cards Already Completed"
              type="number"
              min={0}
              value={goalForm.cardsCompleted}
              onChange={(e) => setGoalForm({ ...goalForm, cardsCompleted: parseInt(e.target.value) || 0 })}
            />
          </div>
          <Input
            label="Target Completion Date (e.g., Step 2 date)"
            type="date"
            value={goalForm.targetDate}
            onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Daily New Card Goal"
              type="number"
              min={0}
              value={goalForm.dailyNewGoal}
              onChange={(e) => setGoalForm({ ...goalForm, dailyNewGoal: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="Daily Review Goal"
              type="number"
              min={0}
              value={goalForm.dailyReviewGoal}
              onChange={(e) => setGoalForm({ ...goalForm, dailyReviewGoal: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsGoalModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={goalMutation.isPending} className="flex-1">
              Save Goals
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
