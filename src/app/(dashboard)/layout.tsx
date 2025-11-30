import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/dashboard/sidebar'
import { SessionProvider } from '@/components/providers/session-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { FloatingAIWidget } from '@/components/FloatingAIWidget'
import { ReactNode } from 'react'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <SessionProvider>
      <QueryProvider>
        <div className="min-h-screen" style={{ backgroundColor: '#0a0f1a' }}>
          <Sidebar />
          <main className="pl-64 min-h-screen">
            <div className="p-8">{children}</div>
          </main>
          <FloatingAIWidget />
        </div>
      </QueryProvider>
    </SessionProvider>
  )
}
