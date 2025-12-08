'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  FolderOpen,
  Settings,
} from 'lucide-react'
import { useSidebar } from '@/components/providers/sidebar-provider'

const mobileNavItems = [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Notes', href: '/dashboard/clinical-notes', icon: FileText },
  { name: 'UWorld', href: '/dashboard/uworld', icon: BookOpen },
  { name: 'Resources', href: '/dashboard/resources', icon: FolderOpen },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const { isMobile } = useSidebar()

  if (!isMobile) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t md:hidden"
      style={{ backgroundColor: '#0f1419', borderTopColor: '#1e293b' }}
    >
      <div className="flex items-center justify-around h-16 px-2 safe-area-bottom">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const isExactDashboard = item.href === '/dashboard' && pathname === '/dashboard'
          const finalActive = item.href === '/dashboard' ? isExactDashboard : isActive

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg transition-colors min-h-[56px]',
                finalActive
                  ? 'text-blue-400'
                  : 'text-slate-400 active:text-slate-200 active:bg-slate-800/50'
              )}
            >
              <item.icon size={22} className={cn(finalActive && 'text-blue-400')} />
              <span className={cn(
                'text-[10px] mt-1 font-medium',
                finalActive ? 'text-blue-400' : 'text-slate-500'
              )}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
