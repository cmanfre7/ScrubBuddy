'use client'

import { Pill } from 'lucide-react'

interface PharmTabProps {
  rotationId: string
}

export function PharmTab({ rotationId }: PharmTabProps) {
  return (
    <div className="text-center py-12">
      <Pill className="mx-auto text-slate-600 mb-4" size={48} />
      <p className="text-slate-400 mb-2">Pharmacology reference coming soon</p>
      <p className="text-sm text-slate-500">
        High-yield drug info for your rotation
      </p>
    </div>
  )
}
