'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { StatCard } from '@/components/ui/stat-card'
import { cn } from '@/lib/utils'
import {
  Layers,
  Plus,
  TrendingUp,
  Calendar,
  Clock,
  Calculator,
  Settings,
  BarChart3,
  RefreshCw,
  Key,
  CheckCircle,
  AlertCircle,
  Copy,
  Trash2,
  Zap,
  BookOpen,
  Brain,
} from 'lucide-react'
import { format, differenceInDays, addDays, startOfWeek, eachDayOfInterval } from 'date-fns'

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

interface AnkiSyncStats {
  id: string
  syncedAt: string
  newDue: number
  reviewDue: number
  learningDue: number
  totalDue: number
  newStudied: number
  reviewsStudied: number
  learnedToday: number
  timeStudiedSecs: number
  againCount: number
  hardCount: number
  goodCount: number
  easyCount: number
  totalCards: number
  totalNotes: number
  matureCards: number
  youngCards: number
  suspendedCards: number
  buriedCards: number
  retentionRate: number | null
}

interface DeckStats {
  id: string
  deckName: string
  newDue: number
  reviewDue: number
  learningDue: number
  totalCards: number
}

export default function AnkingPage() {
  const queryClient = useQueryClient()
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [logData, setLogData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    newCards: 0,
    reviewCards: 0,
    totalTime: 0,
    deckName: 'AnKing',
  })

  // Existing queries
  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['anki-progress'],
    queryFn: async () => {
      const res = await fetch('/api/anking/progress')
      return res.json()
    },
  })

  const { data: goalData } = useQuery({
    queryKey: ['anki-goal'],
    queryFn: async () => {
      const res = await fetch('/api/anking/goal')
      return res.json()
    },
  })

  // New sync queries
  const { data: syncData, isLoading: syncLoading } = useQuery({
    queryKey: ['anki-sync'],
    queryFn: async () => {
      const res = await fetch('/api/anking/sync')
      return res.json()
    },
  })

  const { data: tokenData, isLoading: tokenLoading } = useQuery({
    queryKey: ['anki-token'],
    queryFn: async () => {
      const res = await fetch('/api/anking/token')
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

  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/anking/token', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to generate token')
      return res.json()
    },
    onSuccess: (data) => {
      setNewToken(data.token)
      queryClient.invalidateQueries({ queryKey: ['anki-token'] })
    },
  })

  const revokeTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/anking/token', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to revoke token')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anki-token'] })
      queryClient.invalidateQueries({ queryKey: ['anki-sync'] })
    },
  })

  const progress: AnkiProgress[] = progressData?.progress || []
  const goal: AnkiGoal | null = goalData?.goal || null
  const syncStats: AnkiSyncStats | null = syncData?.stats || null
  const deckStats: DeckStats[] = syncData?.decks || []
  const isSyncConfigured = syncData?.isSyncConfigured || false
  const lastSyncAt = syncData?.lastSyncAt

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Use synced stats if available, otherwise fall back to manual
  const displayNewDone = syncStats?.newStudied ?? todayProgress?.newCards ?? 0
  const displayReviewsDone = syncStats?.reviewsStudied ?? todayProgress?.reviewCards ?? 0
  const displayCardsDue = syncStats?.totalDue ?? 0
  const displayTimeSpent = syncStats ? Math.round(syncStats.timeStudiedSecs / 60) : (todayProgress?.totalTime ?? 0)

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
          <Button variant="secondary" onClick={() => setIsSyncModalOpen(true)}>
            <RefreshCw size={18} className="mr-2" />
            Sync Setup
          </Button>
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
            Goals
          </Button>
          <Button onClick={() => setIsLogModalOpen(true)}>
            <Plus size={18} className="mr-2" />
            Log
          </Button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {isSyncConfigured && lastSyncAt && (
        <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle className="text-green-400" size={18} />
          <span className="text-sm text-green-400">
            Auto-sync active. Last synced: {format(new Date(lastSyncAt), 'MMM d, h:mm a')}
          </span>
        </div>
      )}

      {/* Cards Due Today (from sync) */}
      {isSyncConfigured && syncStats && (
        <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-slate-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="text-yellow-400" size={20} />
              Cards Due Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <p className="text-3xl font-bold text-blue-400">{syncStats.newDue}</p>
                <p className="text-sm text-slate-400 mt-1">New</p>
              </div>
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <p className="text-3xl font-bold text-green-400">{syncStats.reviewDue}</p>
                <p className="text-sm text-slate-400 mt-1">Review</p>
              </div>
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <p className="text-3xl font-bold text-orange-400">{syncStats.learningDue}</p>
                <p className="text-sm text-slate-400 mt-1">Learning</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center">
              <div className="text-center">
                <p className="text-5xl font-bold text-slate-100">{syncStats.totalDue}</p>
                <p className="text-slate-400 mt-1">Total Cards Due</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="New Cards Done"
          value={displayNewDone}
          icon={<Layers size={20} />}
          trend={goal && displayNewDone >= goal.dailyNewGoal ? 'up' : 'stable'}
        />
        <StatCard
          label="Reviews Done"
          value={displayReviewsDone}
          icon={<TrendingUp size={20} />}
          trend={goal && displayReviewsDone >= goal.dailyReviewGoal ? 'up' : 'stable'}
        />
        <StatCard
          label="This Week (New)"
          value={totalNewThisWeek}
          icon={<BarChart3 size={20} />}
        />
        <StatCard
          label="Time Today"
          value={`${displayTimeSpent}m`}
          icon={<Clock size={20} />}
        />
      </div>

      {/* Collection Stats (from sync) */}
      {isSyncConfigured && syncStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="text-purple-400" size={20} />
              Collection Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <p className="text-2xl font-bold text-slate-100">{syncStats.totalCards.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Total Cards</p>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <p className="text-2xl font-bold text-green-400">{syncStats.matureCards.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Mature</p>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <p className="text-2xl font-bold text-blue-400">{syncStats.youngCards.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Young</p>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <p className="text-2xl font-bold text-slate-400">{syncStats.suspendedCards.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Suspended</p>
              </div>
            </div>
            {syncStats.retentionRate && (
              <div className="mt-4 p-3 bg-slate-800/30 rounded-lg flex items-center justify-between">
                <span className="text-slate-300">Retention Rate</span>
                <span className="text-2xl font-bold text-green-400">{(syncStats.retentionRate * 100).toFixed(1)}%</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deck Stats (from sync) */}
      {isSyncConfigured && deckStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="text-blue-400" size={20} />
              Decks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deckStats.slice(0, 10).map((deck) => (
                <div key={deck.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                  <span className="text-slate-200 font-medium truncate flex-1">{deck.deckName}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-blue-400">{deck.newDue} new</span>
                    <span className="text-green-400">{deck.reviewDue} rev</span>
                    <span className="text-slate-400">{deck.totalCards.toLocaleString()} total</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            {daysUntilTarget !== null && daysUntilTarget > 0 && (
              <div className="mt-4 text-center text-slate-400">
                <Calendar className="inline mr-2" size={16} />
                {daysUntilTarget} days until {format(new Date(goal.targetDate!), 'MMM d, yyyy')}
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
            <p className="text-slate-500">No progress logged yet. Set up auto-sync or log manually!</p>
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

      {/* Sync Setup Modal */}
      <Modal isOpen={isSyncModalOpen} onClose={() => { setIsSyncModalOpen(false); setNewToken(null); }} title="Anki Sync Setup">
        <div className="space-y-6">
          {/* Current Status */}
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {tokenData?.hasToken ? (
                <CheckCircle className="text-green-400" size={20} />
              ) : (
                <AlertCircle className="text-yellow-400" size={20} />
              )}
              <span className="font-medium text-slate-200">
                {tokenData?.hasToken ? 'Sync Configured' : 'Sync Not Configured'}
              </span>
            </div>
            {tokenData?.hasToken && tokenData?.lastSyncAt && (
              <p className="text-sm text-slate-400">
                Last sync: {format(new Date(tokenData.lastSyncAt), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>

          {/* New Token Display */}
          {newToken && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-400 font-medium mb-2">Your Sync Token (save this!):</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-slate-900 rounded text-xs text-slate-300 overflow-x-auto">
                  {newToken}
                </code>
                <Button variant="secondary" size="sm" onClick={() => copyToClipboard(newToken)}>
                  <Copy size={16} />
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-2">This token will only be shown once!</p>
            </div>
          )}

          {/* Setup Instructions */}
          <div className="space-y-4">
            <h3 className="font-medium text-slate-200 flex items-center gap-2">
              <Key size={18} />
              Setup Instructions
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
              <li>Install the <a href="https://ankiweb.net/shared/info/2055492159" target="_blank" rel="noopener" className="text-blue-400 hover:underline">AnkiConnect add-on</a> in Anki Desktop</li>
              <li>Generate a sync token below</li>
              <li>Download the ScrubBuddy Anki add-on</li>
              <li>Paste your token in the add-on config</li>
              <li>Stats will auto-sync when Anki starts!</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {!tokenData?.hasToken ? (
              <Button
                onClick={() => generateTokenMutation.mutate()}
                isLoading={generateTokenMutation.isPending}
                className="flex-1"
              >
                <Key size={18} className="mr-2" />
                Generate Sync Token
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => generateTokenMutation.mutate()}
                  isLoading={generateTokenMutation.isPending}
                  variant="secondary"
                  className="flex-1"
                >
                  <RefreshCw size={18} className="mr-2" />
                  Regenerate Token
                </Button>
                <Button
                  onClick={() => revokeTokenMutation.mutate()}
                  isLoading={revokeTokenMutation.isPending}
                  variant="secondary"
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 size={18} />
                </Button>
              </>
            )}
          </div>

          {/* Download Add-on */}
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <p className="text-sm text-slate-300 mb-2">Download the Anki add-on:</p>
            <Button variant="secondary" className="w-full" onClick={() => {
              // This will download the add-on file
              const link = document.createElement('a')
              link.href = '/downloads/scrubbuddy_anki_sync.py'
              link.download = 'scrubbuddy_anki_sync.py'
              link.click()
            }}>
              Download ScrubBuddy Add-on
            </Button>
          </div>
        </div>
      </Modal>

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
