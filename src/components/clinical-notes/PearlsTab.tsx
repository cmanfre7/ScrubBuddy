'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { formatDate, cn } from '@/lib/utils'
import {
  Plus,
  Star,
  Search,
  Flame,
  Clock,
  Trash2,
  X,
  Stethoscope,
  RotateCw,
  HelpCircle,
  Lightbulb,
  Image,
} from 'lucide-react'

interface ClinicalPearl {
  id: string
  content: string
  backContent: string | null
  imageData: string | null
  imageType: string | null
  imagePlacement: string | null
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

// Convert file to base64
async function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve({ data: base64, mediaType: file.type })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function PearlsTab({ rotationId }: PearlsTabProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterView, setFilterView] = useState<'all' | 'high-yield' | 'recent'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRotationId, setSelectedRotationId] = useState(rotationId)
  const [newPearl, setNewPearl] = useState({
    content: '',
    backContent: '',
    tags: [] as string[],
    isHighYield: false,
    source: '',
  })
  const [tagInput, setTagInput] = useState('')
  const [pendingImage, setPendingImage] = useState<{ data: string; mediaType: string; preview: string; placement: 'front' | 'back' } | null>(null)
  const [focusedField, setFocusedField] = useState<'front' | 'back' | null>(null)

  // Flashcard modal state
  const [flashcardPearl, setFlashcardPearl] = useState<ClinicalPearl | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)

  // Handle paste for images - works in either Front or Back textarea
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!isModalOpen || !focusedField) return

      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            if (file.size > 10 * 1024 * 1024) {
              alert('Image too large. Maximum size is 10MB.')
              return
            }
            const { data, mediaType } = await fileToBase64(file)
            setPendingImage({
              data,
              mediaType,
              preview: URL.createObjectURL(file),
              placement: focusedField,
            })
          }
          break
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [isModalOpen, focusedField])

  // Fetch all rotations for the dropdown
  const { data: rotations = [] } = useQuery<Rotation[]>({
    queryKey: ['rotations-list'],
    queryFn: async () => {
      const res = await fetch('/api/rotations')
      if (!res.ok) throw new Error('Failed to fetch rotations')
      const data = await res.json()
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
    mutationFn: async (data: typeof newPearl & { imageData?: string | null; imageType?: string | null; imagePlacement?: string | null }) => {
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
      queryClient.invalidateQueries({ queryKey: ['rotations'] })
      setIsModalOpen(false)
      setNewPearl({ content: '', backContent: '', tags: [], isHighYield: false, source: '' })
      setPendingImage(null)
      setFocusedField(null)
      setSelectedRotationId(rotationId)
    },
  })

  // Reset form when opening modal
  const handleOpenModal = () => {
    setSelectedRotationId(rotationId)
    setNewPearl({ content: '', backContent: '', tags: [], isHighYield: false, source: '' })
    setPendingImage(null)
    setFocusedField(null)
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
      setFlashcardPearl(null)
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

  const openFlashcard = (pearl: ClinicalPearl) => {
    setFlashcardPearl(pearl)
    setIsFlipped(false)
  }

  const closeFlashcard = () => {
    setFlashcardPearl(null)
    setIsFlipped(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPearl.content.trim()) {
      createMutation.mutate({
        ...newPearl,
        imageData: pendingImage?.data || null,
        imageType: pendingImage?.mediaType || null,
        imagePlacement: pendingImage?.placement || null,
      })
    }
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

      {/* Pearls Grid */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pearls.map((pearl) => (
            <div
              key={pearl.id}
              onClick={() => openFlashcard(pearl)}
              className="group bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-blue-500/50 hover:bg-slate-800/70 transition-all cursor-pointer relative overflow-hidden"
            >
              {/* High Yield Indicator */}
              {pearl.isHighYield && (
                <div className="absolute top-3 right-3">
                  <Star size={18} className="text-yellow-400 fill-yellow-400" />
                </div>
              )}

              {/* Image indicator */}
              {pearl.imageData && (
                <div className="absolute top-3 left-3">
                  <Image size={16} className="text-blue-400" />
                </div>
              )}

              {/* Front Content Only */}
              <p className={cn(
                "text-slate-200 leading-relaxed line-clamp-4 pr-6",
                pearl.imageData && "pl-6"
              )}>
                {pearl.content}
              </p>

              {/* Tags Preview */}
              {pearl.tags.length > 0 && (
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {pearl.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400"
                    >
                      {tag}
                    </span>
                  ))}
                  {pearl.tags.length > 3 && (
                    <span className="text-xs text-slate-500">+{pearl.tags.length - 3}</span>
                  )}
                </div>
              )}

              {/* Click hint */}
              <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-center gap-2 text-slate-500 text-xs group-hover:text-blue-400 transition-colors">
                <RotateCw size={12} />
                Click to study
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Flashcard Modal */}
      {flashcardPearl && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg">
            {/* Close button */}
            <button
              onClick={closeFlashcard}
              className="absolute -top-12 right-0 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            {/* Flashcard Container */}
            <div
              className="relative w-full aspect-[4/3] cursor-pointer"
              style={{ perspective: '1000px' }}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Card Inner - handles the flip */}
              <div
                className="relative w-full h-full transition-transform duration-500 ease-out"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Front of Card */}
                <div
                  className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 rounded-2xl p-6 flex flex-col shadow-2xl"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  {/* High Yield Badge */}
                  {flashcardPearl.isHighYield && (
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
                      <Star size={14} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs text-yellow-400 font-medium">High Yield</span>
                    </div>
                  )}

                  {/* Front Label */}
                  <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-4">
                    <HelpCircle size={16} />
                    Front
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col items-center justify-center overflow-auto">
                    {/* Show image on front if imagePlacement is 'front' */}
                    {flashcardPearl.imageData && flashcardPearl.imageType && flashcardPearl.imagePlacement === 'front' && (
                      <div className="mb-3 bg-white rounded-lg p-2">
                        <img
                          src={`data:${flashcardPearl.imageType};base64,${flashcardPearl.imageData}`}
                          alt="Pearl image"
                          className="max-h-36 object-contain rounded"
                        />
                      </div>
                    )}
                    <p className="text-slate-100 text-lg leading-relaxed text-center">
                      {flashcardPearl.content}
                    </p>
                  </div>

                  {/* Flip hint */}
                  <div className="flex items-center justify-center gap-2 text-slate-500 text-sm mt-4">
                    <RotateCw size={14} />
                    Tap to flip
                  </div>
                </div>

                {/* Back of Card */}
                <div
                  className="absolute inset-0 bg-gradient-to-br from-green-900/30 to-slate-900 border border-green-500/30 rounded-2xl p-6 flex flex-col shadow-2xl overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  {/* Back Label */}
                  <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-4">
                    <Lightbulb size={16} />
                    Back
                  </div>

                  {/* Back Content */}
                  <div className="flex-1 flex flex-col justify-center overflow-auto">
                    {/* Show image on back if imagePlacement is 'back' or null (legacy) */}
                    {flashcardPearl.imageData && flashcardPearl.imageType && (flashcardPearl.imagePlacement === 'back' || !flashcardPearl.imagePlacement) && (
                      <div className="mb-4 bg-white rounded-lg p-2">
                        <img
                          src={`data:${flashcardPearl.imageType};base64,${flashcardPearl.imageData}`}
                          alt="Pearl image"
                          className="w-full max-h-48 object-contain rounded"
                        />
                      </div>
                    )}

                    {flashcardPearl.backContent ? (
                      <p className="text-slate-100 text-lg leading-relaxed text-center">
                        {flashcardPearl.backContent}
                      </p>
                    ) : !(flashcardPearl.imageData && (flashcardPearl.imagePlacement === 'back' || !flashcardPearl.imagePlacement)) ? (
                      <div className="text-center">
                        <p className="text-slate-400 text-sm mb-4">No back content added</p>
                        {/* Show metadata instead */}
                        <div className="space-y-3 text-left max-w-xs mx-auto">
                          {flashcardPearl.tags.length > 0 && (
                            <div>
                              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Tags</p>
                              <div className="flex flex-wrap gap-1.5">
                                {flashcardPearl.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-xs text-blue-300"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {flashcardPearl.source && (
                            <div>
                              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Source</p>
                              <p className="text-slate-300 text-sm">{flashcardPearl.source}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Added</p>
                            <p className="text-slate-300 text-sm">{formatDate(new Date(flashcardPearl.createdAt))}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Tags on back if there's content */}
                  {(flashcardPearl.backContent || (flashcardPearl.imageData && (flashcardPearl.imagePlacement === 'back' || !flashcardPearl.imagePlacement))) && flashcardPearl.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                      {flashcardPearl.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded bg-green-500/20 border border-green-500/30 text-xs text-green-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Flip hint */}
                  <div className="flex items-center justify-center gap-2 text-slate-500 text-sm mt-4">
                    <RotateCw size={14} />
                    Tap to flip back
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons below card */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleHighYieldMutation.mutate({
                    id: flashcardPearl.id,
                    isHighYield: !flashcardPearl.isHighYield,
                  })
                  setFlashcardPearl({
                    ...flashcardPearl,
                    isHighYield: !flashcardPearl.isHighYield,
                  })
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                  flashcardPearl.isHighYield
                    ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
                    : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-yellow-400 hover:border-yellow-500/30'
                )}
              >
                <Star size={16} fill={flashcardPearl.isHighYield ? 'currentColor' : 'none'} />
                {flashcardPearl.isHighYield ? 'High Yield' : 'Mark High Yield'}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Delete this pearl?')) {
                    deleteMutation.mutate(flashcardPearl.id)
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Pearl Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Clinical Pearl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Front Text Box */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <HelpCircle size={16} className="text-blue-400" />
              Front (Question/Prompt)
            </label>
            <Textarea
              placeholder="E.g., What are the classic signs of appendicitis?"
              value={newPearl.content}
              onChange={(e) => setNewPearl({ ...newPearl, content: e.target.value })}
              onFocus={() => setFocusedField('front')}
              rows={3}
              required
            />
            {/* Inline image preview for front */}
            {pendingImage && pendingImage.placement === 'front' && (
              <div className="relative mt-2">
                <img
                  src={pendingImage.preview}
                  alt="Preview"
                  className="max-h-32 object-contain rounded border border-slate-600 bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setPendingImage(null)}
                  className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full hover:bg-red-600"
                >
                  <X size={12} className="text-white" />
                </button>
              </div>
            )}
          </div>

          {/* Back Text Box */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Lightbulb size={16} className="text-green-400" />
              Back (Answer/Explanation)
            </label>
            <Textarea
              placeholder="E.g., McBurney's point tenderness, RLQ pain, rebound tenderness..."
              value={newPearl.backContent}
              onChange={(e) => setNewPearl({ ...newPearl, backContent: e.target.value })}
              onFocus={() => setFocusedField('back')}
              rows={3}
            />
            {/* Inline image preview for back */}
            {pendingImage && pendingImage.placement === 'back' && (
              <div className="relative mt-2">
                <img
                  src={pendingImage.preview}
                  alt="Preview"
                  className="max-h-32 object-contain rounded border border-slate-600 bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setPendingImage(null)}
                  className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full hover:bg-red-600"
                >
                  <X size={12} className="text-white" />
                </button>
              </div>
            )}
          </div>

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
            placeholder="rounds, attending, UWorld, etc..."
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
