'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Video,
  Headphones,
  Globe,
  FileText,
  File,
  Plus,
  Search,
  Star,
  Trash2,
  ExternalLink,
  X,
  Play,
  Pause,
  ChevronDown,
  Grid,
  List,
  Filter,
  Heart,
  Eye,
  Clock,
  BookOpen,
  Folder,
  MoreVertical,
  Edit,
  Archive,
} from 'lucide-react'

// Types
interface Resource {
  id: string
  name: string
  description: string | null
  url: string | null
  type: string
  subject: string | null
  rotation: string | null
  tags: string[]
  embedUrl: string | null
  duration: string | null
  channel: string | null
  thumbnail: string | null
  fileUrl: string | null
  fileName: string | null
  fileSize: number | null
  pageCount: number | null
  favicon: string | null
  isFavorite: boolean
  isArchived: boolean
  viewCount: number
  lastAccessed: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

const RESOURCE_TYPES = [
  { id: 'all', label: 'All', icon: Folder },
  { id: 'video', label: 'Videos', icon: Video },
  { id: 'podcast', label: 'Podcasts', icon: Headphones },
  { id: 'website', label: 'Websites', icon: Globe },
  { id: 'pdf', label: 'PDFs', icon: FileText },
  { id: 'document', label: 'Documents', icon: File },
]

const SUBJECTS = [
  'All Subjects',
  'Surgery',
  'Internal Medicine',
  'OBGYN',
  'Pediatrics',
  'Psychiatry',
  'Family Medicine',
  'Neurology',
  'Emergency Medicine',
  'Cardiology',
  'General',
]

const POPULAR_RESOURCES = [
  { name: 'UWorld', url: 'https://www.uworld.com', type: 'website', favicon: 'https://www.uworld.com/favicon.ico' },
  { name: 'UpToDate', url: 'https://www.uptodate.com', type: 'website', favicon: 'https://www.uptodate.com/favicon.ico' },
  { name: 'AMBOSS', url: 'https://www.amboss.com', type: 'website', favicon: 'https://www.amboss.com/favicon.ico' },
  { name: 'ChatGPT', url: 'https://chat.openai.com', type: 'website', favicon: 'https://chat.openai.com/favicon.ico' },
  { name: 'Divine Intervention', url: 'https://divineinterventionpodcasts.com', type: 'podcast', channel: 'Divine Intervention' },
]

// Helper to extract YouTube video ID from various URL formats
function getYouTubeVideoId(url: string | null): string | null {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Generate YouTube thumbnail URL
function getYouTubeThumbnail(url: string | null): string | null {
  const videoId = getYouTubeVideoId(url)
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }
  return null
}

// Generate YouTube embed URL
function getYouTubeEmbedUrl(url: string | null): string | null {
  const videoId = getYouTubeVideoId(url)
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`
  }
  return null
}

// Generate Spotify embed URL
function getSpotifyEmbedUrl(url: string | null): string | null {
  if (!url) return null
  const match = url.match(/spotify\.com\/(episode|show|playlist)\/([^?]+)/)
  if (match) {
    return `https://open.spotify.com/embed/${match[1]}/${match[2]}`
  }
  return null
}

// Helper to extract Vimeo video ID from various URL formats
function getVimeoVideoId(url: string | null): string | null {
  if (!url) return null
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /vimeo\.com\/channels\/[^/]+\/(\d+)/,
    /vimeo\.com\/groups\/[^/]+\/videos\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Generate Vimeo thumbnail URL (uses vumbnail.com service)
function getVimeoThumbnail(url: string | null): string | null {
  const videoId = getVimeoVideoId(url)
  if (videoId) {
    return `https://vumbnail.com/${videoId}.jpg`
  }
  return null
}

// Generate Vimeo embed URL
function getVimeoEmbedUrl(url: string | null): string | null {
  const videoId = getVimeoVideoId(url)
  if (videoId) {
    return `https://player.vimeo.com/video/${videoId}`
  }
  return null
}

// Check if URL is a video service (YouTube or Vimeo)
function isVideoUrl(url: string | null): boolean {
  if (!url) return false
  return !!(getYouTubeVideoId(url) || getVimeoVideoId(url))
}

// Get video embed URL for any supported platform
function getVideoEmbedUrl(url: string | null): string | null {
  if (!url) return null
  return getYouTubeEmbedUrl(url) || getVimeoEmbedUrl(url)
}

// Get video thumbnail URL for any supported platform
function getVideoThumbnail(url: string | null): string | null {
  if (!url) return null
  return getYouTubeThumbnail(url) || getVimeoThumbnail(url)
}

export default function ResourcesPage() {
  const queryClient = useQueryClient()
  const [activeType, setActiveType] = useState('all')
  const [activeSubject, setActiveSubject] = useState('All Subjects')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [showViewer, setShowViewer] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  // Fetch resources
  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: ['resources', activeType, activeSubject, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (activeType !== 'all') params.set('type', activeType)
      if (activeSubject !== 'All Subjects') params.set('subject', activeSubject)
      if (searchQuery) params.set('search', searchQuery)
      const res = await fetch(`/api/resources?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  // Create resource mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Resource>) => {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create resource')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      setShowAddModal(false)
      setMutationError(null)
    },
    onError: (error: Error) => {
      setMutationError(error.message)
    },
  })

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const res = await fetch(`/api/resources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite }),
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/resources/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Resource> }) => {
      const res = await fetch(`/api/resources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update resource')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      setShowEditModal(false)
      setEditingResource(null)
      setMutationError(null)
    },
    onError: (error: Error) => {
      setMutationError(error.message)
    },
  })

  const handleEditResource = (resource: Resource) => {
    setEditingResource(resource)
    setShowEditModal(true)
    setMutationError(null)
  }

  const handleViewResource = (resource: Resource) => {
    setSelectedResource(resource)
    setShowViewer(true)
  }

  const filteredResources = resources

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Resources</h1>
          <p className="text-slate-400 mt-1">
            Your curated collection of study materials
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          Add Resource
        </button>
      </div>

      {/* Quick Add Popular Resources */}
      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: '#111827', border: '1px solid #1e293b' }}
      >
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
          Quick Add Popular Resources
        </h3>
        <div className="flex flex-wrap gap-3">
          {POPULAR_RESOURCES.map((pr) => (
            <button
              key={pr.name}
              onClick={() =>
                createMutation.mutate({
                  name: pr.name,
                  url: pr.url,
                  type: pr.type,
                  channel: pr.channel,
                  favicon: pr.favicon,
                })
              }
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white transition-colors"
              style={{ backgroundColor: '#1e293b' }}
            >
              {pr.type === 'website' ? <Globe size={16} /> : <Headphones size={16} />}
              {pr.name}
              <Plus size={14} className="text-slate-500" />
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Type Tabs */}
        <div
          className="flex items-center gap-1 p-1 rounded-lg"
          style={{ backgroundColor: '#1e293b' }}
        >
          {RESOURCE_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeType === type.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <type.icon size={16} />
              <span className="hidden sm:inline">{type.label}</span>
            </button>
          ))}
        </div>

        {/* Subject Filter */}
        <select
          value={activeSubject}
          onChange={(e) => setActiveSubject(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm text-slate-300 border-0 focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: '#1e293b' }}
        >
          {SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm text-white placeholder-slate-500 border-0 focus:ring-2 focus:ring-blue-500"
            style={{ backgroundColor: '#1e293b' }}
          />
        </div>

        {/* View Toggle */}
        <div
          className="flex items-center gap-1 p-1 rounded-lg"
          style={{ backgroundColor: '#1e293b' }}
        >
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md ${
              viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            <Grid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md ${
              viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Resource Grid/List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl p-4 h-48"
              style={{ backgroundColor: '#111827' }}
            />
          ))}
        </div>
      ) : filteredResources.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{ backgroundColor: '#111827', border: '1px solid #1e293b' }}
        >
          <Folder size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-400">No resources yet</h3>
          <p className="text-slate-500 mt-1">
            Add your first resource to get started
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Add Resource
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onView={() => handleViewResource(resource)}
              onToggleFavorite={() =>
                toggleFavoriteMutation.mutate({
                  id: resource.id,
                  isFavorite: !resource.isFavorite,
                })
              }
              onEdit={() => handleEditResource(resource)}
              onDelete={() => deleteMutation.mutate(resource.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredResources.map((resource) => (
            <ResourceListItem
              key={resource.id}
              resource={resource}
              onView={() => handleViewResource(resource)}
              onToggleFavorite={() =>
                toggleFavoriteMutation.mutate({
                  id: resource.id,
                  isFavorite: !resource.isFavorite,
                })
              }
              onDelete={() => deleteMutation.mutate(resource.id)}
            />
          ))}
        </div>
      )}

      {/* Add Resource Modal */}
      {showAddModal && (
        <AddResourceModal
          onClose={() => {
            setShowAddModal(false)
            setMutationError(null)
          }}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
          apiError={mutationError}
        />
      )}

      {/* Resource Viewer Modal */}
      {showViewer && selectedResource && (
        <ResourceViewer
          resource={selectedResource}
          onClose={() => {
            setShowViewer(false)
            setSelectedResource(null)
          }}
        />
      )}

      {/* Edit Resource Modal */}
      {showEditModal && editingResource && (
        <EditResourceModal
          resource={editingResource}
          onClose={() => {
            setShowEditModal(false)
            setEditingResource(null)
            setMutationError(null)
          }}
          onSubmit={(data) => updateMutation.mutate({ id: editingResource.id, data })}
          isLoading={updateMutation.isPending}
          apiError={mutationError}
        />
      )}
    </div>
  )
}

// Resource Card Component
function ResourceCard({
  resource,
  onView,
  onToggleFavorite,
  onEdit,
  onDelete,
}: {
  resource: Resource
  onView: () => void
  onToggleFavorite: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  // Generate thumbnail from URL if not stored in DB (supports YouTube and Vimeo)
  const thumbnailUrl = resource.thumbnail ||
    (resource.type === 'video' ? getVideoThumbnail(resource.url) : null)

  const getTypeIcon = () => {
    switch (resource.type) {
      case 'video':
        return <Video size={16} className="text-red-400" />
      case 'podcast':
        return <Headphones size={16} className="text-green-400" />
      case 'website':
        return <Globe size={16} className="text-blue-400" />
      case 'pdf':
        return <FileText size={16} className="text-orange-400" />
      case 'document':
        return <File size={16} className="text-purple-400" />
      default:
        return <Folder size={16} className="text-slate-400" />
    }
  }

  return (
    <div
      className="group rounded-xl overflow-hidden transition-all hover:border-blue-500/50 cursor-pointer"
      style={{ backgroundColor: '#111827', border: '1px solid #1e293b' }}
    >
      {/* Thumbnail / Preview */}
      {thumbnailUrl ? (
        <div className="relative aspect-video bg-slate-800" onClick={onView}>
          <img
            src={thumbnailUrl}
            alt={resource.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide broken images
              e.currentTarget.style.display = 'none'
            }}
          />
          {resource.type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <Play size={24} className="text-white ml-1" fill="white" />
              </div>
            </div>
          )}
          {resource.duration && (
            <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded">
              {resource.duration}
            </span>
          )}
        </div>
      ) : (
        <div
          className="aspect-video flex items-center justify-center relative"
          style={{ backgroundColor: '#1e293b' }}
          onClick={onView}
        >
          {resource.type === 'video' && (
            <>
              <Video size={48} className="text-slate-600" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <Play size={24} className="text-white ml-1" fill="white" />
                </div>
              </div>
            </>
          )}
          {resource.type === 'podcast' && <Headphones size={48} className="text-slate-600" />}
          {resource.type === 'website' && <Globe size={48} className="text-slate-600" />}
          {resource.type === 'pdf' && <FileText size={48} className="text-slate-600" />}
          {resource.type === 'document' && <File size={48} className="text-slate-600" />}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getTypeIcon()}
              {resource.channel && (
                <span className="text-xs text-slate-500 truncate">{resource.channel}</span>
              )}
            </div>
            <h3
              className="font-medium text-white truncate group-hover:text-blue-400 transition-colors"
              onClick={onView}
            >
              {resource.name}
            </h3>
            {resource.description && (
              <p className="text-sm text-slate-400 line-clamp-2 mt-1">
                {resource.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite()
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                resource.isFavorite
                  ? 'text-yellow-400 hover:bg-yellow-400/10'
                  : 'text-slate-500 hover:text-yellow-400 hover:bg-slate-800'
              }`}
            >
              <Star size={16} fill={resource.isFavorite ? 'currentColor' : 'none'} />
            </button>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(!showMenu)
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <MoreVertical size={16} />
              </button>
              {showMenu && (
                <div
                  className="absolute right-0 bottom-full mb-1 w-32 rounded-lg shadow-xl z-50 py-1"
                  style={{ backgroundColor: '#1e293b' }}
                >
                  <button
                    onClick={() => {
                      onEdit()
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 w-full"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onDelete()
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 w-full"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        {resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {resource.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded-full text-slate-400"
                style={{ backgroundColor: '#1e293b' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Subject */}
        {resource.subject && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <span className="text-xs text-slate-500">{resource.subject}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Resource List Item Component
function ResourceListItem({
  resource,
  onView,
  onToggleFavorite,
  onDelete,
}: {
  resource: Resource
  onView: () => void
  onToggleFavorite: () => void
  onDelete: () => void
}) {
  const getTypeIcon = () => {
    switch (resource.type) {
      case 'video':
        return <Video size={20} className="text-red-400" />
      case 'podcast':
        return <Headphones size={20} className="text-green-400" />
      case 'website':
        return <Globe size={20} className="text-blue-400" />
      case 'pdf':
        return <FileText size={20} className="text-orange-400" />
      case 'document':
        return <File size={20} className="text-purple-400" />
      default:
        return <Folder size={20} className="text-slate-400" />
    }
  }

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl transition-all hover:border-blue-500/50 cursor-pointer"
      style={{ backgroundColor: '#111827', border: '1px solid #1e293b' }}
      onClick={onView}
    >
      {/* Thumbnail */}
      {resource.thumbnail ? (
        <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
          <img
            src={resource.thumbnail}
            alt={resource.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div
          className="w-24 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#1e293b' }}
        >
          {getTypeIcon()}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {getTypeIcon()}
          <span className="text-xs text-slate-500">{resource.channel || resource.type}</span>
          {resource.duration && (
            <span className="text-xs text-slate-500">{resource.duration}</span>
          )}
        </div>
        <h3 className="font-medium text-white truncate mt-1">{resource.name}</h3>
        {resource.description && (
          <p className="text-sm text-slate-400 truncate">{resource.description}</p>
        )}
      </div>

      {/* Subject Badge */}
      {resource.subject && (
        <span
          className="px-2 py-1 text-xs rounded-full text-slate-400"
          style={{ backgroundColor: '#1e293b' }}
        >
          {resource.subject}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          className={`p-2 rounded-lg transition-colors ${
            resource.isFavorite
              ? 'text-yellow-400 hover:bg-yellow-400/10'
              : 'text-slate-500 hover:text-yellow-400 hover:bg-slate-800'
          }`}
        >
          <Star size={18} fill={resource.isFavorite ? 'currentColor' : 'none'} />
        </button>
        {resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ExternalLink size={18} />
          </a>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  )
}

// Add Resource Modal
function AddResourceModal({
  onClose,
  onSubmit,
  isLoading,
  apiError,
}: {
  onClose: () => void
  onSubmit: (data: Partial<Resource>) => void
  isLoading: boolean
  apiError: string | null
}) {
  const [type, setType] = useState('video')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [channel, setChannel] = useState('')
  const [duration, setDuration] = useState('')
  const [tags, setTags] = useState('')
  const [thumbnail, setThumbnail] = useState('')
  const [embedUrl, setEmbedUrl] = useState('')
  const [error, setError] = useState('')
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false)

  // Auto-fetch metadata when URL changes
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!url) return

      // Validate URL first
      try {
        new URL(url)
      } catch {
        return
      }

      // Only fetch for video/podcast URLs
      const isVideo = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')
      const isPodcast = url.includes('spotify.com')
      if (!isVideo && !isPodcast) return

      setIsFetchingMetadata(true)
      try {
        const res = await fetch('/api/resources/metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        if (res.ok) {
          const { metadata } = await res.json()
          if (metadata) {
            // Auto-populate fields if they're empty
            if (!name && metadata.title) setName(metadata.title)
            if (!channel && metadata.channel) setChannel(metadata.channel)
            if (!duration && metadata.duration) setDuration(metadata.duration)
            if (!description && metadata.description) setDescription(metadata.description)
            if (metadata.thumbnail) setThumbnail(metadata.thumbnail)
            if (metadata.embedUrl) setEmbedUrl(metadata.embedUrl)
            if (metadata.type) setType(metadata.type)
          }
        }
      } catch (err) {
        console.error('Failed to fetch metadata:', err)
      } finally {
        setIsFetchingMetadata(false)
      }
    }

    // Debounce the fetch
    const timeoutId = setTimeout(fetchMetadata, 500)
    return () => clearTimeout(timeoutId)
  }, [url, name, channel, duration, description])

  // Display API error if present
  const displayError = error || apiError

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Basic validation
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    // URL validation for types that need it
    if ((type === 'video' || type === 'podcast' || type === 'website') && url) {
      try {
        new URL(url)
      } catch {
        setError('Please enter a valid URL')
        return
      }
    }

    onSubmit({
      type,
      name: name.trim(),
      url: url.trim() || undefined,
      description: description.trim() || undefined,
      subject: subject || undefined,
      channel: channel.trim() || undefined,
      duration: duration.trim() || undefined,
      thumbnail: thumbnail || undefined,
      embedUrl: embedUrl || undefined,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#111827', border: '1px solid #1e293b' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Add Resource</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {displayError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {displayError}
            </div>
          )}

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Resource Type
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'video', label: 'Video', icon: Video },
                { id: 'podcast', label: 'Podcast', icon: Headphones },
                { id: 'website', label: 'Website', icon: Globe },
                { id: 'pdf', label: 'PDF', icon: FileText },
                { id: 'document', label: 'Doc', icon: File },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                    type === t.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <t.icon size={20} />
                  <span className="text-xs">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* URL - moved before Name for auto-populate */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              URL {type !== 'pdf' && type !== 'document' && '*'}
              {isFetchingMetadata && (
                <span className="ml-2 text-xs text-blue-400">Fetching metadata...</span>
              )}
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                type === 'video'
                  ? 'https://youtube.com/watch?v=... or https://vimeo.com/...'
                  : type === 'podcast'
                  ? 'https://open.spotify.com/episode/...'
                  : 'https://...'
              }
              className="w-full px-4 py-2 rounded-lg text-white placeholder-slate-500 border-0 focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: '#1e293b' }}
            />
            <p className="mt-1 text-xs text-slate-500">
              Paste a YouTube, Vimeo, or Spotify link to auto-fill details
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cardiology Overview"
              className="w-full px-4 py-2 rounded-lg text-white placeholder-slate-500 border-0 focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: '#1e293b' }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              rows={2}
              className="w-full px-4 py-2 rounded-lg text-white placeholder-slate-500 border-0 focus:ring-2 focus:ring-blue-500 resize-none"
              style={{ backgroundColor: '#1e293b' }}
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 rounded-lg text-white border-0 focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: '#1e293b' }}
            >
              <option value="">Select subject...</option>
              {SUBJECTS.slice(1).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Channel (for videos/podcasts) */}
          {(type === 'video' || type === 'podcast') && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {type === 'video' ? 'Channel' : 'Podcast Name'}
              </label>
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder={
                  type === 'video' ? 'e.g., Dirty Medicine' : 'e.g., Divine Intervention'
                }
                className="w-full px-4 py-2 rounded-lg text-white placeholder-slate-500 border-0 focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: '#1e293b' }}
              />
            </div>
          )}

          {/* Duration */}
          {(type === 'video' || type === 'podcast') && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Duration
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 45:30 or 1h 23m"
                className="w-full px-4 py-2 rounded-lg text-white placeholder-slate-500 border-0 focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: '#1e293b' }}
              />
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., cardiology, heart failure, boards"
              className="w-full px-4 py-2 rounded-lg text-white placeholder-slate-500 border-0 focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: '#1e293b' }}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg text-slate-300 hover:text-white transition-colors"
              style={{ backgroundColor: '#1e293b' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {isLoading ? 'Adding...' : 'Add Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Resource Viewer Modal (Video Player, Podcast Player, PDF Viewer)
function ResourceViewer({
  resource,
  onClose,
}: {
  resource: Resource
  onClose: () => void
}) {
  // Generate embed URLs client-side if not stored in DB (supports YouTube and Vimeo)
  const videoEmbedUrl = resource.embedUrl || getVideoEmbedUrl(resource.url)
  const podcastEmbedUrl = resource.embedUrl || getSpotifyEmbedUrl(resource.url)

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{resource.name}</h2>
            {resource.channel && (
              <p className="text-slate-400 text-sm">{resource.channel}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {resource.url && (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white transition-colors"
                style={{ backgroundColor: '#1e293b' }}
              >
                <ExternalLink size={16} />
                Open External
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: '#111827' }}
        >
          {/* Video Player */}
          {resource.type === 'video' && videoEmbedUrl && (
            <div className="aspect-video">
              <iframe
                src={videoEmbedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Podcast Player (Spotify Embed) */}
          {resource.type === 'podcast' && podcastEmbedUrl && (
            <div className="h-[352px]">
              <iframe
                src={podcastEmbedUrl}
                className="w-full h-full"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
          )}

          {/* PDF Viewer */}
          {resource.type === 'pdf' && resource.fileUrl && (
            <div className="h-[80vh]">
              <iframe
                src={`${resource.fileUrl}#view=FitH`}
                className="w-full h-full"
              />
            </div>
          )}

          {/* Website Preview */}
          {resource.type === 'website' && (
            <div className="p-8 text-center">
              <Globe size={64} className="mx-auto text-blue-400 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">{resource.name}</h3>
              {resource.description && (
                <p className="text-slate-400 mb-4">{resource.description}</p>
              )}
              <a
                href={resource.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <ExternalLink size={18} />
                Open Website
              </a>
            </div>
          )}

          {/* Fallback for videos without embed (non-YouTube videos) */}
          {resource.type === 'video' && !videoEmbedUrl && (
            <div className="p-8 text-center">
              <Video size={64} className="mx-auto text-red-400 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">{resource.name}</h3>
              {resource.description && (
                <p className="text-slate-400 mb-4">{resource.description}</p>
              )}
              <a
                href={resource.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Play size={18} />
                Watch Video
              </a>
            </div>
          )}

          {/* Fallback for podcasts without embed (non-Spotify podcasts) */}
          {resource.type === 'podcast' && !podcastEmbedUrl && (
            <div className="p-8 text-center">
              <Headphones size={64} className="mx-auto text-green-400 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">{resource.name}</h3>
              {resource.channel && (
                <p className="text-slate-500 text-sm mb-2">{resource.channel}</p>
              )}
              {resource.description && (
                <p className="text-slate-400 mb-4">{resource.description}</p>
              )}
              <a
                href={resource.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Play size={18} />
                Listen to Podcast
              </a>
            </div>
          )}
        </div>

        {/* Notes Section */}
        {resource.notes && (
          <div
            className="mt-4 p-4 rounded-xl"
            style={{ backgroundColor: '#111827', border: '1px solid #1e293b' }}
          >
            <h4 className="text-sm font-medium text-slate-400 mb-2">Notes</h4>
            <p className="text-slate-300 whitespace-pre-wrap">{resource.notes}</p>
          </div>
        )}

        {/* Tags */}
        {resource.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {resource.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-sm rounded-full text-slate-300"
                style={{ backgroundColor: '#1e293b' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Edit Resource Modal
function EditResourceModal({
  resource,
  onClose,
  onSubmit,
  isLoading,
  apiError,
}: {
  resource: Resource
  onClose: () => void
  onSubmit: (data: Partial<Resource>) => void
  isLoading: boolean
  apiError: string | null
}) {
  const [type, setType] = useState(resource.type)
  const [name, setName] = useState(resource.name)
  const [url, setUrl] = useState(resource.url || '')
  const [description, setDescription] = useState(resource.description || '')
  const [subject, setSubject] = useState(resource.subject || '')
  const [channel, setChannel] = useState(resource.channel || '')
  const [duration, setDuration] = useState(resource.duration || '')
  const [tags, setTags] = useState(resource.tags.join(', '))
  const [error, setError] = useState('')

  // Display API error if present
  const displayError = error || apiError

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Basic validation
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    // URL validation for types that need it
    if ((type === 'video' || type === 'podcast' || type === 'website') && url) {
      try {
        new URL(url)
      } catch {
        setError('Please enter a valid URL')
        return
      }
    }

    onSubmit({
      type,
      name: name.trim(),
      url: url.trim() || null,
      description: description.trim() || null,
      subject: subject || null,
      channel: channel.trim() || null,
      duration: duration.trim() || null,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#111827', border: '1px solid #1e293b' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Edit Resource</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {displayError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {displayError}
            </div>
          )}

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Resource Type
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'video', label: 'Video', icon: Video },
                { id: 'podcast', label: 'Podcast', icon: Headphones },
                { id: 'website', label: 'Website', icon: Globe },
                { id: 'pdf', label: 'PDF', icon: FileText },
                { id: 'document', label: 'Doc', icon: File },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                    type === t.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <t.icon size={20} />
                  <span className="text-xs">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cardiology Overview"
              className="w-full px-4 py-2 rounded-lg text-white placeholder-slate-500 border-0 focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: '#1e293b' }}
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              URL {type !== 'pdf' && type !== 'document' && '*'}
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                type === 'video'
                  ? 'https://youtube.com/watch?v=... or https://vimeo.com/...'
                  : type === 'podcast'
                  ? 'https://open.spotify.com/episode/...'
                  : 'https://...'
              }
              className="w-full px-4 py-2 rounded-lg text-white placeholder-slate-500 border-0 focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: '#1e293b' }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              rows={2}
              className="w-full px-4 py-2 rounded-lg text-white placeholder-slate-500 border-0 focus:ring-2 focus:ring-blue-500 resize-none"
              style={{ backgroundColor: '#1e293b' }}
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 rounded-lg text-white border-0 focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: '#1e293b' }}
            >
              <option value="">Select subject...</option>
              {SUBJECTS.slice(1).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Channel (for videos/podcasts) */}
          {(type === 'video' || type === 'podcast') && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {type === 'video' ? 'Channel' : 'Podcast Name'}
              </label>
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder={
                  type === 'video' ? 'e.g., Dirty Medicine' : 'e.g., Divine Intervention'
                }
                className="w-full px-4 py-2 rounded-lg text-white placeholder-slate-500 border-0 focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: '#1e293b' }}
              />
            </div>
          )}

          {/* Duration */}
          {(type === 'video' || type === 'podcast') && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Duration
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 45:30 or 1h 23m"
                className="w-full px-4 py-2 rounded-lg text-white placeholder-slate-500 border-0 focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: '#1e293b' }}
              />
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., cardiology, heart failure, boards"
              className="w-full px-4 py-2 rounded-lg text-white placeholder-slate-500 border-0 focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: '#1e293b' }}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg text-slate-300 hover:text-white transition-colors"
              style={{ backgroundColor: '#1e293b' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
