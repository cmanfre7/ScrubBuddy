'use client'

import { ReactNode } from 'react'
import { useSidebar } from '@/components/providers/sidebar-provider'
import { cn } from '@/lib/utils'
import { Menu } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface MainContentProps {
  children: ReactNode
}

export function MainContent({ children }: MainContentProps) {
  const { collapsed, toggleMobile, isMobile } = useSidebar()

  return (
    <main
      className={cn(
        'min-h-screen transition-all duration-300',
        // Desktop: add padding for sidebar
        !isMobile && (collapsed ? 'md:pl-16' : 'md:pl-64'),
        // Mobile: no left padding, but add bottom padding for nav
        isMobile && 'pb-20'
      )}
    >
      {/* Mobile Header */}
      {isMobile && (
        <header
          className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b md:hidden"
          style={{ backgroundColor: '#0a0f1a', borderBottomColor: '#1e293b' }}
        >
          <button
            onClick={toggleMobile}
            className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/logos/primary/scrubbuddy-logo-dark.svg"
              alt="ScrubBuddy"
              width={120}
              height={28}
              className="h-7 w-auto"
            />
          </Link>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>
      )}

      {/* Content */}
      <div className={cn(
        'transition-all duration-300',
        // Mobile: smaller padding
        isMobile ? 'p-4' : 'p-8'
      )}>
        {children}
      </div>
    </main>
  )
}
