'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Stethoscope,
  BookOpen,
  Calendar,
  FolderOpen,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  Layers,
  GitBranch,
} from 'lucide-react'
import { useSidebar } from '@/components/providers/sidebar-provider'
import { useQuery } from '@tanstack/react-query'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clinical Notes', href: '/dashboard/clinical-notes', icon: FileText },
  { name: 'Clinical Algorithms', href: '/dashboard/algorithms', icon: GitBranch },
  { name: 'Procedures', href: '/dashboard/procedures', icon: Stethoscope },
  { name: 'UWorld', href: '/dashboard/uworld', icon: BookOpen },
  { name: 'Board/Shelf Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Anki', href: '/dashboard/anking', icon: Layers },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Resources', href: '/dashboard/resources', icon: FolderOpen },
]

interface QuickLink {
  id: string
  name: string
  url: string
  order: number
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { collapsed, toggle, mobileOpen, setMobileOpen, isMobile } = useSidebar()

  // Fetch user's quick links
  const { data: quickLinks = [] } = useQuery<QuickLink[]>({
    queryKey: ['quickLinks'],
    queryFn: async () => {
      const res = await fetch('/api/quick-links')
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!session?.user?.id,
  })

  const handleNavClick = () => {
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  // Desktop sidebar
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b" style={{ borderBottomColor: '#1e293b' }}>
        {(!collapsed || isMobile) && (
          <Link href="/dashboard" className="flex items-center gap-2" onClick={handleNavClick}>
            <Image
              src="/logos/primary/scrubbuddy-logo-dark.svg"
              alt="ScrubBuddy"
              width={140}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
        )}
        {collapsed && !isMobile && (
          <Link href="/dashboard" className="flex items-center justify-center w-full">
            <Image
              src="/logos/mascot/scrubbuddy-mascot-dark.svg"
              alt="ScrubBuddy"
              width={32}
              height={32}
              className="h-8 w-8"
            />
          </Link>
        )}
        {/* Desktop collapse toggle */}
        {!isMobile && (
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        )}
        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
                // Larger touch targets on mobile
                isMobile && 'min-h-[48px]'
              )}
            >
              <item.icon size={isMobile ? 22 : 20} />
              {(!collapsed || isMobile) && (
                <span className={cn('font-medium', isMobile ? 'text-base' : 'text-sm')}>
                  {item.name}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Quick Links */}
      {(!collapsed || isMobile) && quickLinks.length > 0 && (
        <div className="px-2 py-3 border-t" style={{ borderTopColor: '#1e293b' }}>
          <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Quick Links
          </p>
          <div className="space-y-0.5">
            {quickLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-2 px-3 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded transition-colors',
                  isMobile ? 'py-2.5 text-sm min-h-[44px]' : 'py-1.5 text-xs'
                )}
              >
                <ExternalLink size={isMobile ? 14 : 12} />
                <span>{link.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* User & Settings */}
      <div className="border-t p-2 space-y-1" style={{ borderTopColor: '#1e293b' }}>
        <Link
          href="/dashboard/settings"
          onClick={handleNavClick}
          className={cn(
            'flex items-center gap-3 px-3 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors',
            pathname === '/dashboard/settings' && 'bg-slate-800 text-slate-200',
            isMobile ? 'py-3 min-h-[48px]' : 'py-2.5'
          )}
        >
          <Settings size={isMobile ? 22 : 20} />
          {(!collapsed || isMobile) && (
            <span className={cn('font-medium', isMobile ? 'text-base' : 'text-sm')}>Settings</span>
          )}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={cn(
            'w-full flex items-center gap-3 px-3 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors',
            isMobile ? 'py-3 min-h-[48px]' : 'py-2.5'
          )}
        >
          <LogOut size={isMobile ? 22 : 20} />
          {(!collapsed || isMobile) && (
            <span className={cn('font-medium', isMobile ? 'text-base' : 'text-sm')}>Sign Out</span>
          )}
        </button>
      </div>

      {/* User Info */}
      {(!collapsed || isMobile) && session?.user && (
        <div className="p-4 border-t" style={{ borderTopColor: '#1e293b' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-8 md:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-base md:text-sm font-medium">
                {session.user.name?.[0] || session.user.email?.[0] || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('font-medium text-slate-200 truncate', isMobile ? 'text-base' : 'text-sm')}>
                {session.user.name || 'User'}
              </p>
              <p className={cn('text-slate-500 truncate', isMobile ? 'text-sm' : 'text-xs')}>
                {session.user.email}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Mobile: drawer overlay
  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        {/* Drawer */}
        <aside
          className={cn(
            'fixed left-0 top-0 z-50 h-screen w-72 border-r transition-transform duration-300 ease-in-out md:hidden',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          style={{
            backgroundColor: '#0f1419',
            borderRightColor: '#1e293b'
          }}
        >
          {sidebarContent}
        </aside>
      </>
    )
  }

  // Desktop: fixed sidebar
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r transition-all duration-300 hidden md:block',
        collapsed ? 'w-16' : 'w-64'
      )}
      style={{
        backgroundColor: '#0f1419',
        borderRightColor: '#1e293b'
      }}
    >
      {sidebarContent}
    </aside>
  )
}
