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
import { Plus, Search, Users, Calendar, MapPin, Trash2 } from 'lucide-react'
import { PATIENT_SETTINGS, AGE_GROUPS } from '@/types'

interface Patient {
  id: string
  chiefComplaint: string
  diagnosis: string
  encounterDate: string
  setting: string | null
  ageGroup: string | null
  attendingName: string | null
  learningPoints: string | null
  rotation: { id: string; name: string } | null
}

export default function PatientsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newPatient, setNewPatient] = useState({
    chiefComplaint: '',
    diagnosis: '',
    setting: '',
    ageGroup: '',
    attendingName: '',
    learningPoints: '',
    rotationId: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['patients', search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/patients?${params}`)
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
    mutationFn: async (data: typeof newPatient) => {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create patient')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      setIsModalOpen(false)
      setNewPatient({
        chiefComplaint: '',
        diagnosis: '',
        setting: '',
        ageGroup: '',
        attendingName: '',
        learningPoints: '',
        rotationId: '',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete patient')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
  })

  const patients: Patient[] = data?.patients || []
  const rotations = rotationsData?.rotations || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Patient Log</h1>
          <p className="text-slate-400 mt-1">Track your clinical encounters</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} className="mr-2" />
          Log Patient
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <Input
          placeholder="Search by complaint or diagnosis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{patients.length}</p>
                <p className="text-sm text-slate-400">Total Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Encounters</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-slate-500">Loading...</p>
          ) : patients.length === 0 ? (
            <p className="text-slate-500">No patients logged yet. Start by adding your first encounter!</p>
          ) : (
            <div className="space-y-3">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-200">{patient.diagnosis}</p>
                      {patient.rotation && (
                        <Badge variant="info">{patient.rotation.name}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{patient.chiefComplaint}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(patient.encounterDate)}
                      </span>
                      {patient.setting && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {patient.setting}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(patient.id)}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Patient Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log New Patient">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate(newPatient)
          }}
          className="space-y-4"
        >
          <Input
            label="Chief Complaint *"
            placeholder="e.g., Chest pain"
            value={newPatient.chiefComplaint}
            onChange={(e) => setNewPatient({ ...newPatient, chiefComplaint: e.target.value })}
            required
          />
          <Input
            label="Primary Diagnosis *"
            placeholder="e.g., NSTEMI"
            value={newPatient.diagnosis}
            onChange={(e) => setNewPatient({ ...newPatient, diagnosis: e.target.value })}
            required
          />
          <Select
            label="Rotation"
            value={newPatient.rotationId}
            onChange={(e) => setNewPatient({ ...newPatient, rotationId: e.target.value })}
            options={[
              { value: '', label: 'Select rotation...' },
              ...rotations.map((r: { id: string; name: string }) => ({ value: r.id, label: r.name })),
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Setting"
              value={newPatient.setting}
              onChange={(e) => setNewPatient({ ...newPatient, setting: e.target.value })}
              options={[
                { value: '', label: 'Select setting...' },
                ...PATIENT_SETTINGS.map((s) => ({ value: s, label: s })),
              ]}
            />
            <Select
              label="Age Group"
              value={newPatient.ageGroup}
              onChange={(e) => setNewPatient({ ...newPatient, ageGroup: e.target.value })}
              options={[
                { value: '', label: 'Select age...' },
                ...AGE_GROUPS.map((a) => ({ value: a, label: a })),
              ]}
            />
          </div>
          <Input
            label="Attending Name"
            placeholder="Dr. Smith"
            value={newPatient.attendingName}
            onChange={(e) => setNewPatient({ ...newPatient, attendingName: e.target.value })}
          />
          <Textarea
            label="Key Learning Points"
            placeholder="What did you learn from this patient?"
            value={newPatient.learningPoints}
            onChange={(e) => setNewPatient({ ...newPatient, learningPoints: e.target.value })}
            rows={3}
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending} className="flex-1">
              Save Patient
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
