'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Star, X } from 'lucide-react'

interface QuickCaptureProps {
  rotationId: string
  rotationName: string
  onClose: () => void
}

export function QuickCapture({ rotationId, rotationName, onClose }: QuickCaptureProps) {
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isHighYield, setIsHighYield] = useState(false)

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/clinical-pearls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          tags,
          isHighYield,
          rotationId,
          source: 'quick-capture',
        }),
      })
      if (!res.ok) throw new Error('Failed to create pearl')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-pearls'] })
      queryClient.invalidateQueries({ queryKey: ['rotations'] })
      onClose()
    },
  })

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Quick Pearl">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (content.trim()) {
            createMutation.mutate()
          }
        }}
        className="space-y-4"
      >
        <div>
          <p className="text-sm text-slate-400 mb-3">
            Rotation: <span className="text-slate-200 font-medium">{rotationName}</span>
          </p>
        </div>

        <Textarea
          label="What did you learn?"
          placeholder="Quick note from rounds..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          required
          autoFocus
        />

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
            <Button type="button" variant="secondary" onClick={handleAddTag} size="sm">
              +
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {tags.map((tag) => (
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

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isHighYield}
            onChange={(e) => setIsHighYield(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-yellow-500 focus:ring-yellow-500"
          />
          <span className="text-sm text-slate-300 flex items-center gap-1.5">
            <Star size={16} className="text-yellow-400" />
            High Yield for Shelf
          </span>
        </label>

        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1" isLoading={createMutation.isPending}>
            Save
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
