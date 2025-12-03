import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.task.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        text: body.text,
        done: body.done,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        priority: body.priority,
        recurring: body.recurring,
        category: body.category,
      },
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.task.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Handle recurring task completion differently
    if (existing.recurring && typeof body.done === 'boolean') {
      // For recurring tasks, we use TaskCompletion records instead of the task's done field
      const { date } = body // Expect date to be passed for recurring tasks

      if (!date) {
        // Default to today if no date provided
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (body.done) {
          // Create completion record
          await prisma.taskCompletion.upsert({
            where: {
              taskId_date: {
                taskId: id,
                date: today,
              },
            },
            update: { completed: true },
            create: {
              taskId: id,
              date: today,
              completed: true,
            },
          })
        } else {
          // Remove completion record
          await prisma.taskCompletion.deleteMany({
            where: {
              taskId: id,
              date: today,
            },
          })
        }
      } else {
        const targetDate = new Date(date)
        targetDate.setHours(0, 0, 0, 0)

        if (body.done) {
          // Create completion record
          await prisma.taskCompletion.upsert({
            where: {
              taskId_date: {
                taskId: id,
                date: targetDate,
              },
            },
            update: { completed: true },
            create: {
              taskId: id,
              date: targetDate,
              completed: true,
            },
          })
        } else {
          // Remove completion record
          await prisma.taskCompletion.deleteMany({
            where: {
              taskId: id,
              date: targetDate,
            },
          })
        }
      }

      return NextResponse.json({
        task: { ...existing, done: body.done },
      })
    }

    // Non-recurring task - update normally
    const task = await prisma.task.update({
      where: { id },
      data: body,
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.task.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    await prisma.task.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
