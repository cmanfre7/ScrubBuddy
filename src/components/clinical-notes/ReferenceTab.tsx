'use client'

import { BookOpen } from 'lucide-react'

interface ReferenceTabProps {
  rotationId: string
}

export function ReferenceTab({ rotationId }: ReferenceTabProps) {
  return (
    <div className="text-center py-12">
      <BookOpen className="mx-auto text-slate-600 mb-4" size={48} />
      <p className="text-slate-400 mb-2">Reference library coming soon</p>
      <p className="text-sm text-slate-500">
        Quick access to guidelines, scales, and algorithms
      </p>
    </div>
  )
}
