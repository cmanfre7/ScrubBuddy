'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, X, Trash2, Star, StarOff, ImagePlus, Maximize2, FileText, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { SHELF_SUBJECTS } from '@/types'

interface AlgorithmsTabProps {
  rotationId: string
  rotationName?: string
}

interface Algorithm {
  id: string
  title: string
  description: string | null
  subject: string
  imageType: string | null
  source: string | null
  tags: string[]
  isHighYield: boolean
  rotation: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
  hasImage: boolean
  hasText: boolean
  imageData?: string
  textContent?: string
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

export function AlgorithmsTab({ rotationId, rotationName }: AlgorithmsTabProps) {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<Algorithm | null>(null)
  const [viewImageData, setViewImageData] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [contentType, setContentType] = useState<'image' | 'text'>('image')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    source: '',
    isHighYield: false,
    textContent: '',
  })
  const [pendingImage, setPendingImage] = useState<{ data: string; mediaType: string; preview: string } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Fetch algorithms for this rotation
  const { data: algorithms = [], isLoading } = useQuery<Algorithm[]>({
    queryKey: ['algorithms', 'rotation', rotationId],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('rotationId', rotationId)
      const res = await fetch(`/api/clinical-algorithms?${params}`)
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
      queryClient.invalidateQueries({ queryKey: ['algorithms', 'rotation', rotationId] })
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
      queryClient.invalidateQueries({ queryKey: ['algorithms', 'rotation', rotationId] })
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
      queryClient.invalidateQueries({ queryKey: ['algorithms', 'rotation', rotationId] })
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
    setContentType('image')
    setFormData({
      title: '',
      description: '',
      subject: '',
      source: '',
      isHighYield: false,
      textContent: '',
    })
    setPendingImage(null)
    setFormError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.subject) {
      setFormError('Title and subject are required')
      return
    }

    // Validate content based on type
    if (contentType === 'image' && !pendingImage) {
      setFormError('Please upload an image')
      return
    }
    if (contentType === 'text' && !formData.textContent.trim()) {
      setFormError('Please enter algorithm content')
      return
    }

    createMutation.mutate({
      title: formData.title,
      description: formData.description,
      subject: formData.subject,
      source: formData.source,
      isHighYield: formData.isHighYield,
      imageData: pendingImage?.data || null,
      imageType: pendingImage?.mediaType || null,
      textContent: formData.textContent || null,
      rotationId: rotationId,
    })
  }

  const [viewTextContent, setViewTextContent] = useState<string | null>(null)

  const viewAlgorithm = async (algo: Algorithm) => {
    setSelectedAlgorithm(algo)
    setShowViewModal(true)
    setViewImageData(null)
    setViewTextContent(null)

    try {
      const res = await fetch(`/api/clinical-algorithms/${algo.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.imageData && data.imageType) {
          setViewImageData(`data:${data.imageType};base64,${data.imageData}`)
        }
        if (data.textContent) {
          setViewTextContent(data.textContent)
        }
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

  // Hidden file input
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      onChange={handleFileSelect}
      className="hidden"
    />
  )

  if (isLoading) {
    return <div className="text-center py-12 text-slate-400">Loading algorithms...</div>
  }

  return (
    <div className="space-y-4">
      {fileInput}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-slate-200">{algorithms.length}</span>
          <span className="text-slate-400">Algorithm{algorithms.length !== 1 ? 's' : ''}</span>
        </div>
        <Button onClick={() => setShowAddModal(true)} size="sm" className="flex items-center gap-2">
          <Plus size={16} />
          Add Algorithm
        </Button>
      </div>

      {/* Search */}
      {algorithms.length > 0 && (
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search algorithms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Algorithm Grid */}
      {filteredAlgorithms.length === 0 ? (
        <div className="text-center py-12">
          <ImagePlus className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400 mb-2">
            {algorithms.length === 0 ? 'No algorithms saved for this rotation' : 'No algorithms match your search'}
          </p>
          <p className="text-sm text-slate-500 mb-4">
            Save diagnostic flowcharts and decision trees from UWorld
          </p>
          {algorithms.length === 0 && (
            <Button onClick={() => setShowAddModal(true)} variant="secondary" size="sm">
              Add Your First Algorithm
            </Button>
          )}
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
              <div className="mt-3 flex items-center justify-center p-4 bg-slate-900/50 rounded-lg">
                <div className="text-slate-500 text-sm flex items-center gap-2">
                  {algo.hasImage ? <Image size={14} /> : <FileText size={14} />}
                  {algo.hasImage ? 'Image' : 'Text'} - Click to view
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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

            {/* Content Type Toggle */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Content Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setContentType('image')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                    contentType === 'image'
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Image size={16} />
                  Image
                </button>
                <button
                  type="button"
                  onClick={() => setContentType('text')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                    contentType === 'text'
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <FileText size={16} />
                  Text
                </button>
              </div>
            </div>

            {/* Content Area - Image or Text */}
            {contentType === 'image' ? (
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
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Algorithm Content <span className="text-red-400">*</span>
                </label>
                <Textarea
                  value={formData.textContent}
                  onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                  placeholder="Type your algorithm steps here...

Example:
1. Check vitals and stabilize patient
2. Order labs: CBC, CMP, lipase
3. If lipase > 3x ULN → acute pancreatitis
4. NPO, IV fluids, pain management"
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Supports markdown formatting</p>
              </div>
            )}

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
      <Modal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setSelectedAlgorithm(null); setViewImageData(null); setViewTextContent(null); }}>
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
                onClick={() => { setShowViewModal(false); setSelectedAlgorithm(null); setViewImageData(null); setViewTextContent(null); }}
                className="p-1.5 hover:bg-slate-700 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {selectedAlgorithm.description && (
              <p className="text-slate-400 text-sm mb-4">{selectedAlgorithm.description}</p>
            )}

            {/* Content - Image or Text */}
            {selectedAlgorithm.hasImage ? (
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
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                {viewTextContent ? (
                  <pre className="text-slate-200 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {viewTextContent}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-32 text-slate-500">
                    Loading content...
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
