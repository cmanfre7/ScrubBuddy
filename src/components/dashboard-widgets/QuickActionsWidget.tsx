import Link from 'next/link'
import { FileText, Lightbulb, BookOpen, FolderOpen, Calendar, Edit } from 'lucide-react'

interface QuickAction {
  label: string
  href: string
  icon: React.ReactNode
  bgColor: string
}

export function QuickActionsWidget() {
  const actions: QuickAction[] = [
    {
      label: 'Log Patient',
      href: '/dashboard/patients/new',
      icon: <FileText size={18} />,
      bgColor: 'bg-blue-900/30',
    },
    {
      label: 'Add Pearl',
      href: '/dashboard/clinical-notes?tab=pearls',
      icon: <Lightbulb size={18} />,
      bgColor: 'bg-purple-900/30',
    },
    {
      label: 'Start UWorld',
      href: '/dashboard/uworld/log',
      icon: <BookOpen size={18} />,
      bgColor: 'bg-green-900/30',
    },
    {
      label: 'Add Resource',
      href: '/dashboard/resources',
      icon: <FolderOpen size={18} />,
      bgColor: 'bg-amber-900/30',
    },
    {
      label: 'Add Event',
      href: '/dashboard/planner',
      icon: <Calendar size={18} />,
      bgColor: 'bg-red-900/30',
    },
    {
      label: 'Quick Note',
      href: '/dashboard/clinical-notes',
      icon: <Edit size={18} />,
      bgColor: 'bg-cyan-900/30',
    },
  ]

  return (
    <div
      className="backdrop-blur-sm rounded-xl p-6 transition-all"
      style={{
        backgroundColor: '#111827',
        border: '1px solid #1e293b'
      }}
    >
      <div className="mb-5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Quick Actions</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {actions.map((action, index) => (
          <Link
            key={index}
            href={action.href}
            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-blue-900/10 transition-all"
            style={{
              backgroundColor: '#1a2332',
              border: '1px solid #1e293b'
            }}
          >
            <div className={`w-10 h-10 rounded-lg ${action.bgColor} flex items-center justify-center text-slate-300`}>
              {action.icon}
            </div>
            <span className="text-xs text-slate-400">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
