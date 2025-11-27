import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tasks = await prisma.task.findMany({
      where: { userId: session.user.id },
      orderBy: [{ done: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ tasks })
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
