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
import { Plus, Search, GitBranch, Trash2, ExternalLink, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClinicalGuideline {
  id: string
  title: string
  description: string | null
  specialty: string
  content: GuidelineStep[]
  source: string | null
  lastReviewed: string | null
  createdAt: string
  rotation: { id: string; name: string } | null
}

interface GuidelineStep {
  id: string
  text: string
  children?: GuidelineStep[]
}

const SPECIALTIES = [
  'Internal Medicine',
  'Surgery',
  'OBGYN',
  'Pediatrics',
  'Psychiatry',
  'Family Medicine',
  'Emergency Medicine',
  'Neurology',
  'Cardiology',
  'Pulmonology',
  'GI/Hepatology',
  'Nephrology',
  'Endocrinology',
  'Oncology',
  'Orthopedics',
  'Other',
]

function GuidelineTree({ steps, level = 0 }: { steps: GuidelineStep[]; level?: number }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  return (
    <div className={cn('space-y-1', level > 0 && 'ml-4 pl-4 border-l border-slate-700')}>
      {steps.map((step) => {
        const hasChildren = step.children && step.children.length > 0
        const isExpanded = expanded[step.id]

        return (
          <div key={step.id}>
            <div className="flex items-start gap-2 py-1">
              {hasChildren ? (
                <button
                  onClick={() => setExpanded({ ...expanded, [step.id]: !isExpanded })}
                  className="p-0.5 text-slate-400 hover:text-slate-200"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <span className="w-5 h-5 flex items-center justify-center text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                </span>
              )}
              <p className="text-sm text-slate-300 flex-1">{step.text}</p>
            </div>
            {hasChildren && isExpanded && (
              <GuidelineTree steps={step.children!} level={level + 1} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function ClinicalGuidelines() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedGuideline, setExpandedGuideline] = useState<string | null>(null)
  const [newGuideline, setNewGuideline] = useState({
    title: '',
    description: '',
    specialty: 'Internal Medicine',
    content: '',
    source: '',
    rotationId: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['clinical-guidelines', search, filterSpecialty],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterSpecialty) params.set('specialty', filterSpecialty)
      const res = await fetch(`/api/clinical-guidelines?${params}`)
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

  const parseContentToSteps = (content: string): GuidelineStep[] => {
    const lines = content.split('\n').filter(line => line.trim())
    const steps: GuidelineStep[] = []
    let currentStack: { level: number; steps: GuidelineStep[] }[] = [{ level: -1, steps }]

    lines.forEach((line, index) => {
      const indentMatch = line.match(/^(\s*)/)
      const indent = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0
      const text = line.trim().replace(/^[-*]\s*/, '')

      const step: GuidelineStep = {
        id: `step-${index}`,
        text,
        children: [],
      }

      while (currentStack.length > 1 && currentStack[currentStack.length - 1].level >= indent) {
        currentStack.pop()
      }

      const parent = currentStack[currentStack.length - 1]
      parent.steps.push(step)
      currentStack.push({ level: indent, steps: step.children! })
    })

    return steps
  }

  const createMutation = useMutation({
    mutationFn: async (data: typeof newGuideline) => {
      const content = parseContentToSteps(data.content)
      const res = await fetch('/api/clinical-guidelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          content,
        }),
      })
      if (!res.ok) throw new Error('Failed to create guideline')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-guidelines'] })
      setIsModalOpen(false)
      setNewGuideline({
        title: '',
        description: '',
        specialty: 'Internal Medicine',
        content: '',
        source: '',
        rotationId: '',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/clinical-guidelines/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete guideline')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-guidelines'] })
    },
  })

  const guidelines: ClinicalGuideline[] = data?.guidelines || []
  const rotations = rotationsData?.rotations || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <GitBranch className="text-green-400" size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-100">{guidelines.length}</p>
            <p className="text-sm text-slate-400">Clinical Guidelines</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} className="mr-2" />
          Add Guideline
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <Input
            placeholder="Search guidelines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={filterSpecialty}
          onChange={(e) => setFilterSpecialty(e.target.value)}
          options={[
            { value: '', label: 'All Specialties' },
            ...SPECIALTIES.map(s => ({ value: s, label: s })),
          ]}
          className="w-48"
        />
      </div>

      {/* Guidelines List */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-slate-500">Loading...</p>
        ) : guidelines.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <GitBranch size={48} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">No clinical guidelines yet.</p>
              <p className="text-sm text-slate-500 mt-1">
                Add decision trees and algorithms for quick reference during rotations!
              </p>
            </CardContent>
          </Card>
        ) : (
          guidelines.map((guideline) => (
            <Card key={guideline.id} className="hover:border-slate-600 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setExpandedGuideline(
                        expandedGuideline === guideline.id ? null : guideline.id
                      )}
                      className="flex items-center gap-2 text-left"
                    >
                      {expandedGuideline === guideline.id ? (
                        <ChevronDown size={18} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={18} className="text-slate-400" />
                      )}
                      <h3 className="font-semibold text-slate-100">{guideline.title}</h3>
                    </button>
                    <div className="flex items-center gap-2 mt-2 ml-6">
                      <Badge variant="default">{guideline.specialty}</Badge>
                      {guideline.rotation && (
                        <Badge variant="info">{guideline.rotation.name}</Badge>
                      )}
                    </div>
                    {guideline.description && (
                      <p className="text-sm text-slate-400 mt-2 ml-6">{guideline.description}</p>
                    )}
                    {expandedGuideline === guideline.id && (
                      <div className="mt-4 ml-6 p-4 bg-slate-800/30 rounded-lg">
                        <GuidelineTree steps={guideline.content} />
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-3 ml-6 text-xs text-slate-500">
                      {guideline.source && (
                        <span className="flex items-center gap-1">
                          <ExternalLink size={12} />
                          {guideline.source}
                        </span>
                      )}
                      <span>Added {formatDate(guideline.createdAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(guideline.id)}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Guideline Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Clinical Guideline">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate(newGuideline)
          }}
          className="space-y-4"
        >
          <Input
            label="Title *"
            placeholder="e.g., Breast Mass Workup"
            value={newGuideline.title}
            onChange={(e) => setNewGuideline({ ...newGuideline, title: e.target.value })}
            required
          />
          <Input
            label="Description"
            placeholder="Brief description of the guideline"
            value={newGuideline.description}
            onChange={(e) => setNewGuideline({ ...newGuideline, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Specialty"
              value={newGuideline.specialty}
              onChange={(e) => setNewGuideline({ ...newGuideline, specialty: e.target.value })}
              options={SPECIALTIES.map(s => ({ value: s, label: s }))}
            />
            <Select
              label="Rotation"
              value={newGuideline.rotationId}
              onChange={(e) => setNewGuideline({ ...newGuideline, rotationId: e.target.value })}
              options={[
                { value: '', label: 'Select rotation...' },
                ...rotations.map((r: { id: string; name: string }) => ({ value: r.id, label: r.name })),
              ]}
            />
          </div>
          <Textarea
            label="Algorithm/Decision Tree *"
            placeholder={`Use indentation for hierarchy:\n- Patient presents with breast mass\n  - Age < 30\n    - Ultrasound first\n  - Age >= 30\n    - Mammogram + Ultrasound`}
            value={newGuideline.content}
            onChange={(e) => setNewGuideline({ ...newGuideline, content: e.target.value })}
            rows={8}
            required
          />
          <Input
            label="Source"
            placeholder="e.g., UpToDate, ACOG Guidelines"
            value={newGuideline.source}
            onChange={(e) => setNewGuideline({ ...newGuideline, source: e.target.value })}
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending} className="flex-1">
              Save Guideline
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
