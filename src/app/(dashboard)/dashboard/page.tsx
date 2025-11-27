import { getCurrentUser } from '@/lib/session'
import prisma from '@/lib/prisma'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { daysUntil, calculatePercentage, formatDate } from '@/lib/utils'
import {
  Target,
  BookOpen,
  Users,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import { DashboardCalendar } from '@/components/DashboardCalendar'
import { ExamDateButtons } from '@/components/ExamDateButtons'

async function getDashboardData(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [
    user,
    todayLogs,
    weekLogs,
    allLogs,
    recentPatients,
    tasks,
    currentRotation,
    rotations,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { dailyGoal: true, weeklyGoal: true, step2Date: true, comlexDate: true },
    }),
    prisma.uWorldLog.findMany({
      where: { userId, date: { gte: today } },
    }),
    prisma.uWorldLog.findMany({
      where: { userId, date: { gte: weekAgo } },
    }),
    prisma.uWorldLog.findMany({
      where: { userId },
    }),
    prisma.patient.findMany({
      where: { userId },
      orderBy: { encounterDate: 'desc' },
      take: 5,
      include: { rotation: true },
    }),
    prisma.task.findMany({
      where: { userId, done: false },
      orderBy: { priority: 'desc' },
      take: 5,
    }),
    prisma.rotation.findFirst({
      where: { userId, isCurrent: true },
    }),
    prisma.rotation.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' },
      select: { id: true, name: true, shelfDate: true },
    }),
  ])

  const questionsToday = todayLogs.reduce((sum, log) => sum + log.questionsTotal, 0)
  const questionsThisWeek = weekLogs.reduce((sum, log) => sum + log.questionsTotal, 0)
  const totalQuestions = allLogs.reduce((sum, log) => sum + log.questionsTotal, 0)
  const totalCorrect = allLogs.reduce((sum, log) => sum + log.questionsCorrect, 0)

  return {
    user,
    questionsToday,
    questionsThisWeek,
    totalQuestions,
    totalCorrect,
    uworldPercentage: calculatePercentage(totalCorrect, totalQuestions),
    recentPatients,
    tasks,
    currentRotation,
    rotations,
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getDashboardData(user.id)

  const daysUntilStep2 = data.user?.step2Date ? daysUntil(data.user.step2Date) : null
  const daysUntilComlex = data.user?.comlexDate ? daysUntil(data.user.comlexDate) : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">
            Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-slate-400 mt-1">
            {data.currentRotation
              ? `Currently on ${data.currentRotation.name}`
              : 'Set up your rotations to get started'}
          </p>
        </div>
        <ExamDateButtons
          step2Date={data.user?.step2Date?.toISOString() || null}
          comlexDate={data.user?.comlexDate?.toISOString() || null}
          rotations={data.rotations.map(r => ({
            id: r.id,
            name: r.name,
            shelfDate: r.shelfDate?.toISOString() || null,
          }))}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="UWorld Score"
          value={`${data.uworldPercentage}%`}
          trend={data.uworldPercentage >= 70 ? 'up' : data.uworldPercentage >= 60 ? 'stable' : 'down'}
          icon={<Target size={20} />}
        />
        <StatCard
          label="Questions Today"
          value={`${data.questionsToday}/${data.user?.dailyGoal || 40}`}
          trend={data.questionsToday >= (data.user?.dailyGoal || 40) ? 'up' : 'stable'}
          icon={<BookOpen size={20} />}
        />
        <StatCard
          label="This Week"
          value={data.questionsThisWeek}
          icon={<TrendingUp size={20} />}
        />
        {daysUntilStep2 !== null && daysUntilStep2 > 0 && (
          <StatCard
            label="Days Until STEP 2"
            value={daysUntilStep2}
            trend={daysUntilStep2 <= 30 ? 'down' : 'stable'}
            icon={<Calendar size={20} />}
          />
        )}
        {daysUntilComlex !== null && daysUntilComlex > 0 && !daysUntilStep2 && (
          <StatCard
            label="Days Until COMLEX"
            value={daysUntilComlex}
            trend={daysUntilComlex <= 30 ? 'down' : 'stable'}
            icon={<Calendar size={20} />}
          />
        )}
      </div>

      {/* Calendar */}
      <DashboardCalendar />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-400" />
              Tasks
            </CardTitle>
            <Link
              href="/dashboard/tasks"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.tasks.length === 0 ? (
              <p className="text-slate-500 text-sm">No pending tasks</p>
            ) : (
              <ul className="space-y-3">
                {data.tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg"
                  >
                    <div
                      className={`mt-0.5 w-4 h-4 rounded border-2 ${
                        task.done
                          ? 'bg-green-500 border-green-500'
                          : 'border-slate-600'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{task.text}</p>
                      {task.dueDate && (
                        <p className="text-xs text-slate-500 mt-1">
                          Due: {formatDate(task.dueDate)}
                        </p>
                      )}
                    </div>
                    {task.category && (
                      <Badge variant="default" className="text-xs">
                        {task.category}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Patients */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users size={18} className="text-blue-400" />
              Recent Patients
            </CardTitle>
            <Link
              href="/dashboard/patients"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentPatients.length === 0 ? (
              <p className="text-slate-500 text-sm">No patients logged yet</p>
            ) : (
              <div className="space-y-3">
                {data.recentPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200">
                        {patient.diagnosis}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {patient.chiefComplaint}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {patient.rotation && (
                        <Badge variant="info">{patient.rotation.name}</Badge>
                      )}
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(patient.encounterDate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/patients/new"
              className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium"
            >
              Log Patient
            </Link>
            <Link
              href="/dashboard/uworld/log"
              className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors text-sm font-medium"
            >
              Log UWorld
            </Link>
            <Link
              href="/dashboard/procedures"
              className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors text-sm font-medium"
            >
              Procedure Lookup
            </Link>
            <Link
              href="/dashboard/ai"
              className="px-4 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/30 transition-colors text-sm font-medium"
            >
              AI Study Coach
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
