import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/dashboard/sidebar'
import { MainContent } from '@/components/dashboard/main-content'
import { SessionProvider } from '@/components/providers/session-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { SidebarProvider } from '@/components/providers/sidebar-provider'
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
        <SidebarProvider>
          <div className="min-h-screen" style={{ backgroundColor: '#0a0f1a' }}>
            <Sidebar />
            <MainContent>{children}</MainContent>
            <FloatingAIWidget />
          </div>
        </SidebarProvider>
      </QueryProvider>
    </SessionProvider>
  )
}
