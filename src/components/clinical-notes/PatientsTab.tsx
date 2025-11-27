'use client'

import { PatientLog } from '@/components/clinical-notes/PatientLog'

interface PatientsTabProps {
  rotationId: string
}

export function PatientsTab({ rotationId }: PatientsTabProps) {
  return <PatientLog rotationId={rotationId} />
}
