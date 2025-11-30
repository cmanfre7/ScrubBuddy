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
  MessageSquare,
  Layers,
  ExternalLink,
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clinical Notes', href: '/dashboard/clinical-notes', icon: FileText },
  { name: 'Procedures', href: '/dashboard/procedures', icon: Stethoscope },
  { name: 'UWorld', href: '/dashboard/uworld', icon: BookOpen },
  { name: 'Board/Shelf Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Anki', href: '/dashboard/anking', icon: Layers },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Resources', href: '/dashboard/resources', icon: FolderOpen },
]

const quickLinks = [
  { name: 'MyUniversity', url: '#', placeholder: true },
  { name: 'NewInnovations', url: 'https://www.new-innov.com/login/Login.aspx' },
  { name: 'VSLO', url: 'https://www.aamc.org/services/vslo' },
  { name: 'ERAS', url: 'https://www.aamc.org/services/eras' },
  { name: 'MyNBME', url: 'https://www.nbme.org' },
  { name: 'UWorld', url: 'https://www.uworld.com' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
      style={{
        backgroundColor: '#0f1419',
        borderRightColor: '#1e293b'
      }}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b" style={{ borderBottomColor: '#1e293b' }}>
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/logos/primary/scrubbuddy-logo-dark.svg"
                alt="ScrubBuddy"
                width={140}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
          )}
          {collapsed && (
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
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                )}
              >
                <item.icon size={20} />
                {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Quick Links */}
        {!collapsed && (
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
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded transition-colors"
                >
                  <ExternalLink size={12} />
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
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors',
              pathname === '/dashboard/settings' && 'bg-slate-800 text-slate-200'
            )}
          >
            <Settings size={20} />
            {!collapsed && <span className="text-sm font-medium">Settings</span>}
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut size={20} />
            {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>

        {/* User Info */}
        {!collapsed && session?.user && (
          <div className="p-4 border-t" style={{ borderTopColor: '#1e293b' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {session.user.name?.[0] || session.user.email?.[0] || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">
                  {session.user.name || 'User'}
                </p>
                <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
