'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import { Plus, Calendar, Trash2, Settings, Target, Edit2, Award, Link, GripVertical, ExternalLink, RefreshCw, Copy, Check, Cloud, Apple } from 'lucide-react'
import { ROTATION_OPTIONS } from '@/types'

interface BoardExam {
  id: string
  examType: string
  targetScore: number
  examDate: string | null
}

interface Rotation {
  id: string
  name: string
  startDate: string
  endDate: string
  shelfDate: string | null
  isCurrent: boolean
  _count: { patients: number }
}

interface QuickLink {
  id: string
  name: string
  url: string
  order: number
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [isRotationModalOpen, setIsRotationModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedRotation, setSelectedRotation] = useState<Rotation | null>(null)
  const [newRotation, setNewRotation] = useState({
    name: '',
    startDate: '',
    endDate: '',
    shelfDate: '',
    isCurrent: false,
  })
  const [editRotation, setEditRotation] = useState({
    name: '',
    startDate: '',
    endDate: '',
    shelfDate: '',
    isCurrent: false,
  })

  // Board target states
  const [step2Target, setStep2Target] = useState('')
  const [comlexTarget, setComlexTarget] = useState('')
  const [isBoardTargetModalOpen, setIsBoardTargetModalOpen] = useState(false)
  const [editingBoardType, setEditingBoardType] = useState<'USMLE_STEP_2_CK' | 'COMLEX_LEVEL_2_CE' | null>(null)

  // Quick links states
  const [isQuickLinkModalOpen, setIsQuickLinkModalOpen] = useState(false)
  const [isEditQuickLinkModalOpen, setIsEditQuickLinkModalOpen] = useState(false)
  const [isDeleteQuickLinkModalOpen, setIsDeleteQuickLinkModalOpen] = useState(false)
  const [selectedQuickLink, setSelectedQuickLink] = useState<QuickLink | null>(null)
  const [newQuickLink, setNewQuickLink] = useState({ name: '', url: '' })
  const [editQuickLinkData, setEditQuickLinkData] = useState({ name: '', url: '' })

  // Calendar sync states
  const [feedUrlCopied, setFeedUrlCopied] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Fetch board exams
  const { data: boardExamsData } = useQuery<BoardExam[]>({
    queryKey: ['board-exams'],
    queryFn: async () => {
      const res = await fetch('/api/board-exams')
      if (!res.ok) return []
      return res.json()
    },
  })

  const boardExams = boardExamsData || []
  const step2Exam = boardExams.find(e => e.examType === 'USMLE_STEP_2_CK')
  const comlexExam = boardExams.find(e => e.examType === 'COMLEX_LEVEL_2_CE')

  const { data: rotationsData } = useQuery({
    queryKey: ['rotations'],
    queryFn: async () => {
      const res = await fetch('/api/rotations?includeCounts=true')
      if (!res.ok) throw new Error('Failed to fetch rotations')
      return res.json()
    },
  })

  // Fetch quick links
  const { data: quickLinksData } = useQuery<QuickLink[]>({
    queryKey: ['quickLinks'],
    queryFn: async () => {
      const res = await fetch('/api/quick-links')
      if (!res.ok) return []
      return res.json()
    },
  })

  const quickLinks = quickLinksData || []

  // Fetch Google Calendar status
  const { data: googleCalendarStatus, refetch: refetchGoogleStatus } = useQuery({
    queryKey: ['google-calendar-status'],
    queryFn: async () => {
      const res = await fetch('/api/google-calendar/status')
      if (!res.ok) return { connected: false }
      return res.json()
    },
  })

  // Fetch ICS feed info
  const { data: feedData, refetch: refetchFeed } = useQuery({
    queryKey: ['calendar-feed'],
    queryFn: async () => {
      const res = await fetch('/api/calendar-feed')
      if (!res.ok) return { exists: false }
      return res.json()
    },
  })

  // Generate ICS feed URL
  const feedUrl = feedData?.token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/feed/${feedData.token}`
    : null

  const createRotationMutation = useMutation({
    mutationFn: async (data: typeof newRotation) => {
      // Convert date strings to ISO-8601 DateTime format
      const formattedData = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        shelfDate: data.shelfDate ? new Date(data.shelfDate).toISOString() : null,
      }
      const res = await fetch('/api/rotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData),
      })
      if (!res.ok) throw new Error('Failed to create rotation')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotations'] })
      setIsRotationModalOpen(false)
      setNewRotation({ name: '', startDate: '', endDate: '', shelfDate: '', isCurrent: false })
    },
  })

  const updateRotationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editRotation }) => {
      // Convert date strings to ISO-8601 DateTime format
      const formattedData = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        shelfDate: data.shelfDate ? new Date(data.shelfDate).toISOString() : null,
      }
      const res = await fetch(`/api/rotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update rotation')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotations'] })
      setIsEditModalOpen(false)
      setSelectedRotation(null)
    },
  })

  const deleteRotationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/rotations/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete rotation')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotations'] })
      setIsDeleteModalOpen(false)
      setSelectedRotation(null)
    },
  })

  // Board target mutation
  const saveBoardTargetMutation = useMutation({
    mutationFn: async ({ examType, targetScore }: { examType: string; targetScore: number }) => {
      const res = await fetch('/api/board-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examType, targetScore }),
      })
      if (!res.ok) throw new Error('Failed to save board target')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-exams'] })
      setIsBoardTargetModalOpen(false)
      setEditingBoardType(null)
      setStep2Target('')
      setComlexTarget('')
    },
  })

  // Quick link mutations
  const createQuickLinkMutation = useMutation({
    mutationFn: async (data: { name: string; url: string }) => {
      const res = await fetch('/api/quick-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create quick link')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickLinks'] })
      setIsQuickLinkModalOpen(false)
      setNewQuickLink({ name: '', url: '' })
    },
  })

  const updateQuickLinkMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; url: string } }) => {
      const res = await fetch(`/api/quick-links/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update quick link')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickLinks'] })
      setIsEditQuickLinkModalOpen(false)
      setSelectedQuickLink(null)
    },
  })

  const deleteQuickLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/quick-links/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete quick link')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickLinks'] })
      setIsDeleteQuickLinkModalOpen(false)
      setSelectedQuickLink(null)
    },
  })

  const handleEditBoardTarget = (examType: 'USMLE_STEP_2_CK' | 'COMLEX_LEVEL_2_CE') => {
    setEditingBoardType(examType)
    if (examType === 'USMLE_STEP_2_CK' && step2Exam) {
      setStep2Target(step2Exam.targetScore.toString())
    } else if (examType === 'COMLEX_LEVEL_2_CE' && comlexExam) {
      setComlexTarget(comlexExam.targetScore.toString())
    }
    setIsBoardTargetModalOpen(true)
  }

  const rotations: Rotation[] = Array.isArray(rotationsData) ? rotationsData : []

  const handleEditClick = (rotation: Rotation) => {
    setSelectedRotation(rotation)
    setEditRotation({
      name: rotation.name,
      startDate: rotation.startDate.split('T')[0],
      endDate: rotation.endDate.split('T')[0],
      shelfDate: rotation.shelfDate ? rotation.shelfDate.split('T')[0] : '',
      isCurrent: rotation.isCurrent,
    })
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (rotation: Rotation) => {
    setSelectedRotation(rotation)
    setIsDeleteModalOpen(true)
  }

  const handleEditQuickLink = (link: QuickLink) => {
    setSelectedQuickLink(link)
    setEditQuickLinkData({ name: link.name, url: link.url })
    setIsEditQuickLinkModalOpen(true)
  }

  const handleDeleteQuickLink = (link: QuickLink) => {
    setSelectedQuickLink(link)
    setIsDeleteQuickLinkModalOpen(true)
  }

  // Calendar sync handlers
  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/google-calendar/connect')
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        alert(data.error)
      }
    } catch (error) {
      console.error('Failed to connect Google Calendar:', error)
    }
  }

  const handleDisconnectGoogle = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) return
    try {
      await fetch('/api/google-calendar/disconnect', { method: 'POST' })
      refetchGoogleStatus()
    } catch (error) {
      console.error('Failed to disconnect Google Calendar:', error)
    }
  }

  const handleSyncGoogle = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/google-calendar/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        alert(`Sync complete! Pulled: ${data.pulled}, Pushed: ${data.pushed}`)
        refetchGoogleStatus()
      } else {
        alert(data.error || 'Sync failed')
      }
    } catch (error) {
      console.error('Failed to sync:', error)
      alert('Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleGenerateFeed = async () => {
    try {
      await fetch('/api/calendar-feed', { method: 'POST' })
      refetchFeed()
    } catch (error) {
      console.error('Failed to generate feed:', error)
    }
  }

  const handleCopyFeedUrl = () => {
    if (feedUrl) {
      navigator.clipboard.writeText(feedUrl)
      setFeedUrlCopied(true)
      setTimeout(() => setFeedUrlCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-sm md:text-base text-slate-400 mt-1">Manage your account and rotations</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings size={18} className="text-blue-400" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400">Name</label>
              <p className="text-slate-200">{session?.user?.name || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm text-slate-400">Email</label>
              <p className="text-slate-200">{session?.user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rotations Card */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Calendar size={18} className="text-purple-400" />
              Rotations
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Manage your clinical rotations</CardDescription>
          </div>
          <Button size="sm" className="w-full sm:w-auto" onClick={() => setIsRotationModalOpen(true)}>
            <Plus size={16} className="mr-1" />
            Add Rotation
          </Button>
        </CardHeader>
        <CardContent>
          {rotations.length === 0 ? (
            <p className="text-slate-500">No rotations set up yet. Add your first rotation to get started!</p>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {rotations.map((rotation) => (
                <div
                  key={rotation.id}
                  className={`flex items-start sm:items-center justify-between gap-2 p-3 md:p-4 rounded-lg ${
                    rotation.isCurrent
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : 'bg-slate-800/30'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm md:text-base font-medium text-slate-200">{rotation.name}</p>
                      {rotation.isCurrent && (
                        <span className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 bg-blue-500/30 text-blue-300 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">
                      {formatDate(rotation.startDate)} - {formatDate(rotation.endDate)}
                    </p>
                    {rotation.shelfDate && (
                      <p className="text-xs md:text-sm text-slate-500">
                        Shelf: {formatDate(rotation.shelfDate)}
                      </p>
                    )}
                    <p className="text-[10px] md:text-xs text-slate-600 mt-1">
                      {rotation._count.patients} patients logged
                    </p>
                  </div>
                  <div className="flex gap-1 md:gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-h-[44px] min-w-[44px] p-2"
                      onClick={() => handleEditClick(rotation)}
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      className="min-h-[44px] min-w-[44px] p-2"
                      onClick={() => handleDeleteClick(rotation)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goals Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target size={18} className="text-green-400" />
            Study Goals
          </CardTitle>
          <CardDescription>Set your daily and weekly targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400">Daily Question Goal</label>
              <p className="text-2xl font-bold text-slate-100">40</p>
            </div>
            <div>
              <label className="text-sm text-slate-400">Weekly Question Goal</label>
              <p className="text-2xl font-bold text-slate-100">200</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Board Targets Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award size={18} className="text-yellow-400" />
            Board Exam Targets
          </CardTitle>
          <CardDescription>Set your target scores for Step 2 CK and COMLEX Level 2</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 2 CK */}
            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">USMLE Step 2 CK</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEditBoardTarget('USMLE_STEP_2_CK')}
                >
                  <Edit2 size={14} />
                </Button>
              </div>
              {step2Exam ? (
                <p className="text-3xl font-bold text-blue-400">{step2Exam.targetScore}</p>
              ) : (
                <button
                  onClick={() => handleEditBoardTarget('USMLE_STEP_2_CK')}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  + Set target score
                </button>
              )}
            </div>

            {/* COMLEX Level 2 */}
            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">COMLEX Level 2-CE</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEditBoardTarget('COMLEX_LEVEL_2_CE')}
                >
                  <Edit2 size={14} />
                </Button>
              </div>
              {comlexExam ? (
                <p className="text-3xl font-bold text-green-400">{comlexExam.targetScore}</p>
              ) : (
                <button
                  onClick={() => handleEditBoardTarget('COMLEX_LEVEL_2_CE')}
                  className="text-sm text-green-400 hover:text-green-300"
                >
                  + Set target score
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links Card */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Link size={18} className="text-cyan-400" />
              Quick Links
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Customize your sidebar quick links</CardDescription>
          </div>
          <Button size="sm" className="w-full sm:w-auto" onClick={() => setIsQuickLinkModalOpen(true)}>
            <Plus size={16} className="mr-1" />
            Add Link
          </Button>
        </CardHeader>
        <CardContent>
          {quickLinks.length === 0 ? (
            <p className="text-slate-500">No quick links yet. Add your first link to get started!</p>
          ) : (
            <div className="space-y-2">
              {quickLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-2.5 md:p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 active:bg-slate-800/60 transition-colors gap-2"
                >
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <ExternalLink size={14} className="text-slate-500 shrink-0 md:w-4 md:h-4" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm md:text-base font-medium text-slate-200 truncate">{link.name}</p>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] md:text-xs text-slate-500 hover:text-blue-400 truncate block"
                      >
                        {link.url}
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-h-[44px] min-w-[44px] p-2"
                      onClick={() => handleEditQuickLink(link)}
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      className="min-h-[44px] min-w-[44px] p-2"
                      onClick={() => handleDeleteQuickLink(link)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Sync Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Calendar size={18} className="text-orange-400" />
            Calendar Sync
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Sync your ScrubBuddy calendar with Google and Apple
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Calendar Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Cloud size={16} className="text-blue-400" />
              <span className="text-sm font-medium text-slate-200">Google Calendar</span>
              {googleCalendarStatus?.connected && (
                <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">Connected</span>
              )}
            </div>

            {googleCalendarStatus?.connected ? (
              <div className="space-y-3 pl-6">
                <p className="text-xs text-slate-400">
                  Connected as {googleCalendarStatus.googleEmail}
                </p>
                {googleCalendarStatus.lastSyncAt && (
                  <p className="text-xs text-slate-500">
                    Last synced: {new Date(googleCalendarStatus.lastSyncAt).toLocaleString()}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSyncGoogle} disabled={isSyncing}>
                    <RefreshCw size={14} className={`mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={handleDisconnectGoogle}>
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pl-6">
                <p className="text-xs text-slate-500 mb-2">
                  Two-way sync: Events sync between ScrubBuddy and Google Calendar
                </p>
                <Button size="sm" onClick={handleConnectGoogle}>
                  <Cloud size={14} className="mr-1" />
                  Connect Google Calendar
                </Button>
              </div>
            )}
          </div>

          <hr className="border-slate-700" />

          {/* Apple Calendar / ICS Feed Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Apple size={16} className="text-slate-300" />
              <span className="text-sm font-medium text-slate-200">Apple Calendar / Other Apps</span>
            </div>

            <div className="pl-6 space-y-3">
              <p className="text-xs text-slate-500">
                Subscribe to an ICS feed to see ScrubBuddy events in Apple Calendar, Outlook, or any calendar app.
                <br />
                <span className="text-slate-600">(One-way: ScrubBuddy → Calendar app)</span>
              </p>

              {feedUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-slate-800 px-2 py-1.5 rounded text-slate-300 truncate">
                      {feedUrl}
                    </code>
                    <Button size="sm" variant="secondary" onClick={handleCopyFeedUrl}>
                      {feedUrlCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-600">
                    In Apple Calendar: File → New Calendar Subscription → paste URL
                  </p>
                  <Button size="sm" variant="secondary" onClick={handleGenerateFeed}>
                    <RefreshCw size={14} className="mr-1" />
                    Regenerate URL
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={handleGenerateFeed}>
                  Generate Feed URL
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Rotation Modal */}
      <Modal isOpen={isRotationModalOpen} onClose={() => setIsRotationModalOpen(false)} title="Add Rotation">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createRotationMutation.mutate(newRotation)
          }}
          className="space-y-4"
        >
          <Select
            label="Rotation *"
            value={newRotation.name}
            onChange={(e) => setNewRotation({ ...newRotation, name: e.target.value })}
            options={[
              { value: '', label: 'Select rotation...' },
              ...ROTATION_OPTIONS.map((r) => ({ value: r, label: r })),
            ]}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date *"
              type="date"
              value={newRotation.startDate}
              onChange={(e) => setNewRotation({ ...newRotation, startDate: e.target.value })}
              required
            />
            <Input
              label="End Date *"
              type="date"
              value={newRotation.endDate}
              onChange={(e) => setNewRotation({ ...newRotation, endDate: e.target.value })}
              required
            />
          </div>
          <Input
            label="Shelf Exam Date"
            type="date"
            value={newRotation.shelfDate}
            onChange={(e) => setNewRotation({ ...newRotation, shelfDate: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={newRotation.isCurrent}
              onChange={(e) => setNewRotation({ ...newRotation, isCurrent: e.target.checked })}
              className="rounded bg-slate-700 border-slate-600"
            />
            This is my current rotation
          </label>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsRotationModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={createRotationMutation.isPending} className="flex-1">
              Save Rotation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Rotation Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Rotation">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (selectedRotation) {
              updateRotationMutation.mutate({ id: selectedRotation.id, data: editRotation })
            }
          }}
          className="space-y-4"
        >
          <Select
            label="Rotation *"
            value={editRotation.name}
            onChange={(e) => setEditRotation({ ...editRotation, name: e.target.value })}
            options={[
              { value: '', label: 'Select rotation...' },
              ...ROTATION_OPTIONS.map((r) => ({ value: r, label: r })),
            ]}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date *"
              type="date"
              value={editRotation.startDate}
              onChange={(e) => setEditRotation({ ...editRotation, startDate: e.target.value })}
              required
            />
            <Input
              label="End Date *"
              type="date"
              value={editRotation.endDate}
              onChange={(e) => setEditRotation({ ...editRotation, endDate: e.target.value })}
              required
            />
          </div>
          <Input
            label="Shelf Exam Date"
            type="date"
            value={editRotation.shelfDate}
            onChange={(e) => setEditRotation({ ...editRotation, shelfDate: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={editRotation.isCurrent}
              onChange={(e) => setEditRotation({ ...editRotation, isCurrent: e.target.checked })}
              className="rounded bg-slate-700 border-slate-600"
            />
            This is my current rotation
          </label>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={updateRotationMutation.isPending} className="flex-1">
              Update Rotation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Rotation">
        <div className="space-y-4">
          <p className="text-slate-300">
            Are you sure you want to delete <span className="font-semibold text-slate-100">{selectedRotation?.name}</span>?
          </p>
          <p className="text-sm text-slate-500">
            This will also delete {selectedRotation?._count.patients || 0} patient(s) logged for this rotation. This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsDeleteModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => selectedRotation && deleteRotationMutation.mutate(selectedRotation.id)}
              isLoading={deleteRotationMutation.isPending}
              className="flex-1"
            >
              Delete Rotation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Board Target Modal */}
      <Modal
        isOpen={isBoardTargetModalOpen}
        onClose={() => {
          setIsBoardTargetModalOpen(false)
          setEditingBoardType(null)
        }}
        title={editingBoardType === 'USMLE_STEP_2_CK' ? 'Set Step 2 CK Target' : 'Set COMLEX Level 2 Target'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (editingBoardType) {
              const targetValue = editingBoardType === 'USMLE_STEP_2_CK'
                ? parseInt(step2Target)
                : parseInt(comlexTarget)
              if (!isNaN(targetValue) && targetValue > 0) {
                saveBoardTargetMutation.mutate({
                  examType: editingBoardType,
                  targetScore: targetValue,
                })
              }
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Target Score
            </label>
            {editingBoardType === 'USMLE_STEP_2_CK' ? (
              <>
                <Input
                  type="number"
                  value={step2Target}
                  onChange={(e) => setStep2Target(e.target.value)}
                  placeholder="e.g., 260"
                  min={1}
                  max={300}
                  required
                />
                <p className="text-xs text-slate-500 mt-2">
                  Step 2 CK scores typically range from 200-300. Average is around 245.
                </p>
              </>
            ) : (
              <>
                <Input
                  type="number"
                  value={comlexTarget}
                  onChange={(e) => setComlexTarget(e.target.value)}
                  placeholder="e.g., 700"
                  min={1}
                  max={999}
                  required
                />
                <p className="text-xs text-slate-500 mt-2">
                  COMLEX Level 2-CE scores typically range from 400-800. Average is around 550.
                </p>
              </>
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsBoardTargetModalOpen(false)
                setEditingBoardType(null)
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={saveBoardTargetMutation.isPending}
              className="flex-1"
            >
              Save Target
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Quick Link Modal */}
      <Modal isOpen={isQuickLinkModalOpen} onClose={() => setIsQuickLinkModalOpen(false)} title="Add Quick Link">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createQuickLinkMutation.mutate(newQuickLink)
          }}
          className="space-y-4"
        >
          <Input
            label="Name *"
            value={newQuickLink.name}
            onChange={(e) => setNewQuickLink({ ...newQuickLink, name: e.target.value })}
            placeholder="e.g., MyUniversity"
            required
          />
          <Input
            label="URL *"
            type="url"
            value={newQuickLink.url}
            onChange={(e) => setNewQuickLink({ ...newQuickLink, url: e.target.value })}
            placeholder="https://..."
            required
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsQuickLinkModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={createQuickLinkMutation.isPending} className="flex-1">
              Add Link
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Quick Link Modal */}
      <Modal isOpen={isEditQuickLinkModalOpen} onClose={() => setIsEditQuickLinkModalOpen(false)} title="Edit Quick Link">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (selectedQuickLink) {
              updateQuickLinkMutation.mutate({ id: selectedQuickLink.id, data: editQuickLinkData })
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Name *"
            value={editQuickLinkData.name}
            onChange={(e) => setEditQuickLinkData({ ...editQuickLinkData, name: e.target.value })}
            placeholder="e.g., MyUniversity"
            required
          />
          <Input
            label="URL *"
            type="url"
            value={editQuickLinkData.url}
            onChange={(e) => setEditQuickLinkData({ ...editQuickLinkData, url: e.target.value })}
            placeholder="https://..."
            required
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsEditQuickLinkModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={updateQuickLinkMutation.isPending} className="flex-1">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Quick Link Modal */}
      <Modal isOpen={isDeleteQuickLinkModalOpen} onClose={() => setIsDeleteQuickLinkModalOpen(false)} title="Delete Quick Link">
        <div className="space-y-4">
          <p className="text-slate-300">
            Are you sure you want to delete <span className="font-semibold text-slate-100">{selectedQuickLink?.name}</span>?
          </p>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsDeleteQuickLinkModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => selectedQuickLink && deleteQuickLinkMutation.mutate(selectedQuickLink.id)}
              isLoading={deleteQuickLinkMutation.isPending}
              className="flex-1"
            >
              Delete Link
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
