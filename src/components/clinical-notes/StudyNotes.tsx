'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/utils'
import { Plus, Search, Star, Trash2, BookOpen, Tag, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StudyNote {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  source: string | null
  isStarred: boolean
  createdAt: string
  rotation: { id: string; name: string } | null
}

const CATEGORIES = [
  { value: 'high_yield', label: 'High Yield', color: 'bg-red-500' },
  { value: 'diagnosis', label: 'Diagnosis', color: 'bg-blue-500' },
  { value: 'preceptor_tip', label: 'Preceptor Tip', color: 'bg-green-500' },
  { value: 'clinical_pearl', label: 'Clinical Pearl', color: 'bg-yellow-500' },
  { value: 'ddx', label: 'Differential Diagnosis', color: 'bg-purple-500' },
  { value: 'other', label: 'Other', color: 'bg-slate-500' },
]

const SOURCES = [
  { value: 'preceptor', label: 'Preceptor' },
  { value: 'uworld', label: 'UWorld' },
  { value: 'lecture', label: 'Lecture' },
  { value: 'reading', label: 'Reading' },
  { value: 'patient', label: 'Patient Case' },
  { value: 'anki', label: 'AnKing/Anki' },
]

export function StudyNotes() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    category: 'high_yield',
    tags: '',
    source: '',
    rotationId: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['study-notes', search, filterCategory],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterCategory) params.set('category', filterCategory)
      const res = await fetch(`/api/study-notes?${params}`)
      return res.json()
    },
  })

  const { data: rotationsData } = useQuery({
    queryKey: ['rotations'],
    queryFn: async () => {
      const res = await fetch('/api/rotations')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof newNote) => {
      const res = await fetch('/api/study-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          tags: data.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })
      if (!res.ok) throw new Error('Failed to create note')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-notes'] })
      setIsModalOpen(false)
      setNewNote({
        title: '',
        content: '',
        category: 'high_yield',
        tags: '',
        source: '',
        rotationId: '',
      })
    },
  })

  const toggleStarMutation = useMutation({
    mutationFn: async ({ id, isStarred }: { id: string; isStarred: boolean }) => {
      const res = await fetch(`/api/study-notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !isStarred }),
      })
      if (!res.ok) throw new Error('Failed to update note')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-notes'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/study-notes/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete note')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-notes'] })
    },
  })

  const notes: StudyNote[] = data?.notes || []
  const rotations = rotationsData?.rotations || []

  const getCategoryBadge = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category)
    return cat || { label: category, color: 'bg-slate-500' }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <BookOpen className="text-purple-400" size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-100">{notes.length}</p>
            <p className="text-sm text-slate-400">Study Notes</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} className="mr-2" />
          Add Note
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          options={[
            { value: '', label: 'All Categories' },
            ...CATEGORIES.map(c => ({ value: c.value, label: c.label })),
          ]}
          className="w-48"
        />
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-slate-500">Loading...</p>
        ) : notes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen size={48} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">No study notes yet.</p>
              <p className="text-sm text-slate-500 mt-1">
                Start adding high yield topics, preceptor tips, and clinical pearls!
              </p>
            </CardContent>
          </Card>
        ) : (
          notes.map((note) => {
            const category = getCategoryBadge(note.category)
            return (
              <Card key={note.id} className="hover:border-slate-600 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-100">{note.title}</h3>
                        <span className={cn('px-2 py-0.5 text-xs rounded-full text-white', category.color)}>
                          {category.label}
                        </span>
                        {note.rotation && (
                          <Badge variant="info">{note.rotation.name}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-2 whitespace-pre-wrap line-clamp-3">
                        {note.content}
                      </p>
                      {note.tags.length > 0 && (
                        <div className="flex items-center gap-2 mt-3">
                          <Tag size={12} className="text-slate-500" />
                          <div className="flex gap-1 flex-wrap">
                            {note.tags.map((tag, i) => (
                              <span key={i} className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        {note.source && `Source: ${SOURCES.find(s => s.value === note.source)?.label || note.source} • `}
                        {formatDate(note.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleStarMutation.mutate({ id: note.id, isStarred: note.isStarred })}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          note.isStarred ? 'text-yellow-400' : 'text-slate-500 hover:text-yellow-400'
                        )}
                      >
                        <Star size={18} fill={note.isStarred ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(note.id)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Add Note Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Study Note">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate(newNote)
          }}
          className="space-y-4"
        >
          <Input
            label="Title *"
            placeholder="e.g., NSTEMI vs STEMI Management"
            value={newNote.title}
            onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
            required
          />
          <Textarea
            label="Content *"
            placeholder="Write your notes here..."
            value={newNote.content}
            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            rows={5}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={newNote.category}
              onChange={(e) => setNewNote({ ...newNote, category: e.target.value })}
              options={CATEGORIES.map(c => ({ value: c.value, label: c.label }))}
            />
            <Select
              label="Source"
              value={newNote.source}
              onChange={(e) => setNewNote({ ...newNote, source: e.target.value })}
              options={[
                { value: '', label: 'Select source...' },
                ...SOURCES,
              ]}
            />
          </div>
          <Select
            label="Rotation"
            value={newNote.rotationId}
            onChange={(e) => setNewNote({ ...newNote, rotationId: e.target.value })}
            options={[
              { value: '', label: 'Select rotation...' },
              ...rotations.map((r: { id: string; name: string }) => ({ value: r.id, label: r.name })),
            ]}
          />
          <Input
            label="Tags (comma-separated)"
            placeholder="e.g., cardiology, STEMI, ACS"
            value={newNote.tags}
            onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })}
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending} className="flex-1">
              Save Note
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
