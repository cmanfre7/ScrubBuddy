'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Filter, X, Trash2, Star, StarOff, ImagePlus, ChevronDown, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { SHELF_SUBJECTS } from '@/types'

interface Algorithm {
  id: string
  title: string
  description: string | null
  subject: string
  imageType: string
  source: string | null
  tags: string[]
  isHighYield: boolean
  rotation: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
  hasImage: boolean
  imageData?: string // Only when fetching single
}

interface Rotation {
  id: string
  name: string
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

export default function AlgorithmsPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<Algorithm | null>(null)
  const [viewImageData, setViewImageData] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    source: '',
    rotationId: '',
    isHighYield: false,
  })
  const [pendingImage, setPendingImage] = useState<{ data: string; mediaType: string; preview: string } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Fetch algorithms
  const { data: algorithms = [], isLoading } = useQuery<Algorithm[]>({
    queryKey: ['algorithms', selectedSubject],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedSubject) params.set('subject', selectedSubject)
      const res = await fetch(`/api/clinical-algorithms?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  // Fetch rotations for dropdown
  const { data: rotations = [] } = useQuery<Rotation[]>({
    queryKey: ['rotations'],
    queryFn: async () => {
      const res = await fetch('/api/rotations')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  // Create algorithm mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/clinical-algorithms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['algorithms'] })
      resetForm()
      setShowAddModal(false)
    },
    onError: (error: Error) => {
      setFormError(error.message)
    },
  })

  // Delete algorithm mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/clinical-algorithms/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['algorithms'] })
    },
  })

  // Toggle high yield mutation
  const toggleHighYieldMutation = useMutation({
    mutationFn: async ({ id, isHighYield }: { id: string; isHighYield: boolean }) => {
      const res = await fetch(`/api/clinical-algorithms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHighYield }),
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['algorithms'] })
    },
  })

  // Handle paste event for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!showAddModal) return

      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            await addImage(file)
          }
          break
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [showAddModal])

  const addImage = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) {
      setFormError('Image must be less than 10MB')
      return
    }

    try {
      const { data, mediaType } = await fileToBase64(file)
      const preview = `data:${mediaType};base64,${data}`
      setPendingImage({ data, mediaType, preview })
      setFormError(null)
    } catch (error) {
      console.error('Error processing image:', error)
      setFormError('Failed to process image')
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await addImage(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      subject: '',
      source: '',
      rotationId: '',
      isHighYield: false,
    })
    setPendingImage(null)
    setFormError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.subject || !pendingImage) {
      setFormError('Title, subject, and image are required')
      return
    }

    createMutation.mutate({
      ...formData,
      imageData: pendingImage.data,
      imageType: pendingImage.mediaType,
      rotationId: formData.rotationId || null,
    })
  }

  const viewAlgorithm = async (algo: Algorithm) => {
    setSelectedAlgorithm(algo)
    setShowViewModal(true)
    setViewImageData(null)

    // Fetch full algorithm with image data
    try {
      const res = await fetch(`/api/clinical-algorithms/${algo.id}`)
      if (res.ok) {
        const data = await res.json()
        setViewImageData(`data:${data.imageType};base64,${data.imageData}`)
      }
    } catch (error) {
      console.error('Error fetching algorithm:', error)
    }
  }

  // Filter algorithms by search term
  const filteredAlgorithms = algorithms.filter(algo =>
    algo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    algo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    algo.source?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Clinical Algorithms</h1>
          <p className="text-slate-400 mt-1">Save and reference diagnostic flowcharts by rotation</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus size={18} />
          Add Algorithm
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search algorithms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full sm:w-48 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 appearance-none cursor-pointer focus:outline-none focus:border-blue-500"
          >
            <option value="">All Subjects</option>
            {SHELF_SUBJECTS.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Algorithm Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : filteredAlgorithms.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            {algorithms.length === 0 ? 'No algorithms saved yet' : 'No algorithms match your search'}
          </div>
          <Button onClick={() => setShowAddModal(true)} variant="secondary">
            Add Your First Algorithm
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAlgorithms.map(algo => (
            <div
              key={algo.id}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-blue-500/50 transition-all cursor-pointer group"
              onClick={() => viewAlgorithm(algo)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {algo.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded">
                      {algo.subject}
                    </span>
                    {algo.source && (
                      <span className="text-xs text-slate-500">{algo.source}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleHighYieldMutation.mutate({ id: algo.id, isHighYield: !algo.isHighYield })
                    }}
                    className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                    title={algo.isHighYield ? 'Unmark high yield' : 'Mark as high yield'}
                  >
                    {algo.isHighYield ? (
                      <Star size={16} className="text-yellow-400 fill-yellow-400" />
                    ) : (
                      <StarOff size={16} className="text-slate-400" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Delete this algorithm?')) {
                        deleteMutation.mutate(algo.id)
                      }
                    }}
                    className="p-1.5 hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} className="text-slate-400 hover:text-red-400" />
                  </button>
                </div>
              </div>
              {algo.description && (
                <p className="text-sm text-slate-400 line-clamp-2 mb-2">{algo.description}</p>
              )}
              {algo.rotation && (
                <div className="text-xs text-slate-500">
                  Rotation: {algo.rotation.name}
                </div>
              )}
              <div className="mt-3 flex items-center justify-center p-4 bg-slate-900/50 rounded-lg">
                <div className="text-slate-500 text-sm flex items-center gap-2">
                  <Maximize2 size={14} />
                  Click to view
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Add Algorithm Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); resetForm(); }}>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Add Clinical Algorithm</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                {formError}
              </div>
            )}

            {/* Image upload area */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Algorithm Image <span className="text-red-400">*</span>
              </label>
              {pendingImage ? (
                <div className="relative">
                  <img
                    src={pendingImage.preview}
                    alt="Preview"
                    className="w-full max-h-64 object-contain rounded-lg border border-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setPendingImage(null)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full hover:bg-red-600"
                  >
                    <X size={14} className="text-white" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                >
                  <ImagePlus size={32} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-slate-400">Click to upload or paste image (Ctrl+V)</p>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Title <span className="text-red-400">*</span>
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Blunt Chest Trauma"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Subject <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select subject</option>
                  {SHELF_SUBJECTS.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Source
                </label>
                <Input
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="e.g., UWorld, UpToDate"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Rotation
                </label>
                <select
                  value={formData.rotationId}
                  onChange={(e) => setFormData({ ...formData, rotationId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">No specific rotation</option>
                  {rotations.map(rotation => (
                    <option key={rotation.id} value={rotation.id}>{rotation.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Notes (optional)
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Any notes about this algorithm..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isHighYield"
                checked={formData.isHighYield}
                onChange={(e) => setFormData({ ...formData, isHighYield: e.target.checked })}
                className="w-4 h-4 bg-slate-800 border-slate-600 rounded"
              />
              <label htmlFor="isHighYield" className="text-sm text-slate-300 flex items-center gap-1">
                <Star size={14} className="text-yellow-400" />
                Mark as High Yield
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? 'Saving...' : 'Save Algorithm'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* View Algorithm Modal */}
      <Modal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setSelectedAlgorithm(null); setViewImageData(null); }}>
        {selectedAlgorithm && (
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{selectedAlgorithm.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded">
                    {selectedAlgorithm.subject}
                  </span>
                  {selectedAlgorithm.source && (
                    <span className="text-xs text-slate-500">Source: {selectedAlgorithm.source}</span>
                  )}
                  {selectedAlgorithm.isHighYield && (
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  )}
                </div>
              </div>
              <button
                onClick={() => { setShowViewModal(false); setSelectedAlgorithm(null); setViewImageData(null); }}
                className="p-1.5 hover:bg-slate-700 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {selectedAlgorithm.description && (
              <p className="text-slate-400 text-sm mb-4">{selectedAlgorithm.description}</p>
            )}

            {selectedAlgorithm.rotation && (
              <p className="text-xs text-slate-500 mb-4">Rotation: {selectedAlgorithm.rotation.name}</p>
            )}

            {/* Image */}
            <div className="bg-white rounded-lg p-2">
              {viewImageData ? (
                <img
                  src={viewImageData}
                  alt={selectedAlgorithm.title}
                  className="w-full max-h-[70vh] object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-slate-500">
                  Loading image...
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
