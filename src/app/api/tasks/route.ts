import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Helper to check if a recurring task applies to a given date
function recurringApplies(recurring: string, taskCreatedAt: Date, targetDate: Date): boolean {
  // Task must have been created on or before the target date
  const taskStart = new Date(taskCreatedAt)
  taskStart.setHours(0, 0, 0, 0)

  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)

  if (target < taskStart) return false

  const dayOfWeek = target.getDay() // 0 = Sunday, 6 = Saturday

  switch (recurring) {
    case 'daily':
      return true
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5
    case 'weekly':
      // Same day of week as when created
      return taskStart.getDay() === dayOfWeek
    default:
      return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    if (!dateParam) {
      // Return all tasks if no date filter
      const tasks = await prisma.task.findMany({
        where: { userId: session.user.id },
        orderBy: [{ done: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
      })
      return NextResponse.json({ tasks })
    }

    // Parse target date
    const targetDate = new Date(dateParam + 'T00:00:00')
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    // Get non-recurring tasks for this specific date
    const nonRecurringTasks = await prisma.task.findMany({
      where: {
        userId: session.user.id,
        recurring: null,
        dueDate: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      orderBy: [{ done: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    })

    // Get all recurring tasks
    const recurringTasks = await prisma.task.findMany({
      where: {
        userId: session.user.id,
        recurring: { not: null },
      },
      include: {
        completions: {
          where: {
            date: {
              gte: targetDate,
              lt: nextDay,
            },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })

    // Filter recurring tasks that apply to this date and add completion status
    const applicableRecurringTasks = recurringTasks
      .filter(task => recurringApplies(task.recurring!, task.createdAt, targetDate))
      .map(task => {
        // Check if completed for this specific date
        const completionForDate = task.completions.length > 0
        return {
          id: task.id,
          text: task.text,
          done: completionForDate, // Done status based on completion for this date
          dueDate: task.dueDate?.toISOString() || null,
          priority: task.priority,
          recurring: task.recurring,
          category: task.category,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
        }
      })

    // Format non-recurring tasks
    const formattedNonRecurring = nonRecurringTasks.map(task => ({
      id: task.id,
      text: task.text,
      done: task.done,
      dueDate: task.dueDate?.toISOString() || null,
      priority: task.priority,
      recurring: task.recurring,
      category: task.category,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }))

    // Combine and sort: incomplete first, then by priority
    const allTasks = [...formattedNonRecurring, ...applicableRecurringTasks]
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1
        return b.priority - a.priority
      })

    return NextResponse.json({ tasks: allTasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { text, dueDate, priority, recurring, category } = body

    if (!text) {
      return NextResponse.json({ error: 'Task text is required' }, { status: 400 })
    }

    const task = await prisma.task.create({
      data: {
        userId: session.user.id,
        text,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 0,
        recurring,
        category,
      },
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
