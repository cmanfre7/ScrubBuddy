'use client'

import { ReactNode } from 'react'
import { useSidebar } from '@/components/providers/sidebar-provider'
import { cn } from '@/lib/utils'

interface MainContentProps {
  children: ReactNode
}

export function MainContent({ children }: MainContentProps) {
  const { collapsed } = useSidebar()

  return (
    <main
      className={cn(
        'min-h-screen transition-all duration-300',
        collapsed ? 'pl-16' : 'pl-64'
      )}
    >
      <div className="p-8">{children}</div>
    </main>
  )
}
