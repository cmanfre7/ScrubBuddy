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
import { Plus, Calendar, Trash2, Settings, Target } from 'lucide-react'
import { ROTATION_OPTIONS } from '@/types'

interface Rotation {
  id: string
  name: string
  startDate: string
  endDate: string
  shelfDate: string | null
  isCurrent: boolean
  _count: { patients: number }
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [isRotationModalOpen, setIsRotationModalOpen] = useState(false)
  const [newRotation, setNewRotation] = useState({
    name: '',
    startDate: '',
    endDate: '',
    shelfDate: '',
    isCurrent: false,
  })

  const { data: rotationsData } = useQuery({
    queryKey: ['rotations'],
    queryFn: async () => {
      const res = await fetch('/api/rotations?includeCounts=true')
      if (!res.ok) throw new Error('Failed to fetch rotations')
      return res.json()
    },
  })

  const createRotationMutation = useMutation({
    mutationFn: async (data: typeof newRotation) => {
      const res = await fetch('/api/rotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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

  const rotations: Rotation[] = Array.isArray(rotationsData) ? rotationsData : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account and rotations</p>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={18} className="text-purple-400" />
              Rotations
            </CardTitle>
            <CardDescription>Manage your clinical rotations</CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsRotationModalOpen(true)}>
            <Plus size={16} className="mr-1" />
            Add Rotation
          </Button>
        </CardHeader>
        <CardContent>
          {rotations.length === 0 ? (
            <p className="text-slate-500">No rotations set up yet. Add your first rotation to get started!</p>
          ) : (
            <div className="space-y-3">
              {rotations.map((rotation) => (
                <div
                  key={rotation.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    rotation.isCurrent
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : 'bg-slate-800/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-200">{rotation.name}</p>
                      {rotation.isCurrent && (
                        <span className="text-xs px-2 py-0.5 bg-blue-500/30 text-blue-300 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {formatDate(rotation.startDate)} - {formatDate(rotation.endDate)}
                    </p>
                    {rotation.shelfDate && (
                      <p className="text-sm text-slate-500">
                        Shelf: {formatDate(rotation.shelfDate)}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 mt-1">
                      {rotation._count.patients} patients logged
                    </p>
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
          />
          <div className="grid grid-cols-2 gap-4">
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
    </div>
  )
}
