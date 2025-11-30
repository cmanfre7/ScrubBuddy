'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { formatDate, cn } from '@/lib/utils'
import {
  Plus,
  Star,
  Tag,
  Search,
  Flame,
  Clock,
  Link as LinkIcon,
  Trash2,
  X,
  Stethoscope,
} from 'lucide-react'

interface ClinicalPearl {
  id: string
  content: string
  tags: string[]
  isHighYield: boolean
  source: string | null
  patientId: string | null
  createdAt: string
  rotation?: {
    id: string
    name: string
  } | null
}

interface Rotation {
  id: string
  name: string
}

interface PearlsTabProps {
  rotationId: string
}

export function PearlsTab({ rotationId }: PearlsTabProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterView, setFilterView] = useState<'all' | 'high-yield' | 'recent'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRotationId, setSelectedRotationId] = useState(rotationId)
  const [newPearl, setNewPearl] = useState({
    content: '',
    tags: [] as string[],
    isHighYield: false,
    source: '',
  })
  const [tagInput, setTagInput] = useState('')

  // Fetch all rotations for the dropdown
  const { data: rotations = [] } = useQuery<Rotation[]>({
    queryKey: ['rotations-list'],
    queryFn: async () => {
      const res = await fetch('/api/rotations')
      if (!res.ok) throw new Error('Failed to fetch rotations')
      const data = await res.json()
      // API returns { rotations: [...] } so we need to extract the array
      return data.rotations || []
    },
  })

  // Fetch pearls
  const { data: pearls = [], isLoading } = useQuery<ClinicalPearl[]>({
    queryKey: ['clinical-pearls', rotationId, search, filterView],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('rotationId', rotationId)
      if (search) params.set('search', search)
      if (filterView === 'high-yield') params.set('highYield', 'true')
      if (filterView === 'recent') params.set('recent', 'true')
      const res = await fetch(`/api/clinical-pearls?${params}`)
      if (!res.ok) throw new Error('Failed to fetch pearls')
      return res.json()
    },
  })

  // Create pearl
  const createMutation = useMutation({
    mutationFn: async (data: typeof newPearl) => {
      const res = await fetch('/api/clinical-pearls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, rotationId: selectedRotationId }),
      })
      if (!res.ok) throw new Error('Failed to create pearl')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-pearls'] })
      queryClient.invalidateQueries({ queryKey: ['rotations'] }) // Update counts
      setIsModalOpen(false)
      setNewPearl({ content: '', tags: [], isHighYield: false, source: '' })
      setSelectedRotationId(rotationId) // Reset to current rotation
    },
  })

  // Reset selected rotation when opening modal
  const handleOpenModal = () => {
    setSelectedRotationId(rotationId)
    setIsModalOpen(true)
  }

  // Toggle high yield
  const toggleHighYieldMutation = useMutation({
    mutationFn: async ({ id, isHighYield }: { id: string; isHighYield: boolean }) => {
      const res = await fetch(`/api/clinical-pearls/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHighYield }),
      })
      if (!res.ok) throw new Error('Failed to update pearl')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-pearls'] })
    },
  })

  // Delete pearl
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/clinical-pearls/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete pearl')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-pearls'] })
      queryClient.invalidateQueries({ queryKey: ['rotations'] })
    },
  })

  const handleAddTag = () => {
    if (tagInput.trim() && !newPearl.tags.includes(tagInput.trim())) {
      setNewPearl({ ...newPearl, tags: [...newPearl.tags, tagInput.trim()] })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setNewPearl({ ...newPearl, tags: newPearl.tags.filter((t) => t !== tag) })
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
          <Input
            placeholder="Search pearls..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleOpenModal}>
          <Plus size={18} />
          Add Pearl
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterView('all')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            filterView === 'all'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          )}
        >
          All
        </button>
        <button
          onClick={() => setFilterView('high-yield')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
            filterView === 'high-yield'
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          )}
        >
          <Flame size={16} />
          High Yield
        </button>
        <button
          onClick={() => setFilterView('recent')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
            filterView === 'recent'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          )}
        >
          <Clock size={16} />
          Recent
        </button>
      </div>

      {/* Pearls List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading pearls...</div>
      ) : pearls.length === 0 ? (
        <div className="text-center py-12">
          <Flame className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400 mb-2">No pearls yet</p>
          <p className="text-sm text-slate-500">
            Start capturing clinical pearls as you learn on rounds
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pearls.map((pearl) => (
            <div
              key={pearl.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Star button */}
                <button
                  onClick={() =>
                    toggleHighYieldMutation.mutate({
                      id: pearl.id,
                      isHighYield: !pearl.isHighYield,
                    })
                  }
                  className={cn(
                    'mt-1 transition-colors',
                    pearl.isHighYield ? 'text-yellow-400' : 'text-slate-600 hover:text-slate-400'
                  )}
                >
                  <Star size={20} fill={pearl.isHighYield ? 'currentColor' : 'none'} />
                </button>

                {/* Content */}
                <div className="flex-1">
                  <p className="text-slate-200 leading-relaxed">{pearl.content}</p>

                  {/* Tags & Metadata */}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {pearl.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400"
                      >
                        <Tag size={12} />
                        {tag}
                      </span>
                    ))}
                    {pearl.source && (
                      <span className="text-xs text-slate-500">
                        Source: {pearl.source}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {formatDate(new Date(pearl.createdAt))}
                    </span>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => {
                    if (confirm('Delete this pearl?')) {
                      deleteMutation.mutate(pearl.id)
                    }
                  }}
                  className="text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Pearl Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Clinical Pearl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (newPearl.content.trim()) {
              createMutation.mutate(newPearl)
            }
          }}
          className="space-y-4"
        >
          <Textarea
            label="What did you learn?"
            placeholder="E.g., Lithium toxicity can present like gastroenteritis in early stages..."
            value={newPearl.content}
            onChange={(e) => setNewPearl({ ...newPearl, content: e.target.value })}
            rows={4}
            required
          />

          {/* Rotation Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-1.5">
              <Stethoscope size={14} />
              Rotation
            </label>
            <select
              value={selectedRotationId}
              onChange={(e) => setSelectedRotationId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {rotations.map((rotation) => (
                <option key={rotation.id} value={rotation.id}>
                  {rotation.name} {rotation.id === rotationId ? '(current)' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Select which rotation this pearl is from
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tags (optional)
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={handleAddTag}>
                Add
              </Button>
            </div>
            {newPearl.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {newPearl.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-blue-300"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Input
            label="Source (optional)"
            placeholder="rounds, attending, patient, reading..."
            value={newPearl.source}
            onChange={(e) => setNewPearl({ ...newPearl, source: e.target.value })}
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newPearl.isHighYield}
              onChange={(e) => setNewPearl({ ...newPearl, isHighYield: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-yellow-500 focus:ring-yellow-500"
            />
            <span className="text-sm text-slate-300 flex items-center gap-1.5">
              <Star size={16} className="text-yellow-400" />
              High Yield for Shelf Exam
            </span>
          </label>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" isLoading={createMutation.isPending}>
              Save Pearl
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
