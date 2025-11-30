import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Get a single UWorld log entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const log = await prisma.uWorldLog.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!log) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    }

    return NextResponse.json(log)
  } catch (error) {
    console.error('Error fetching UWorld log:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PATCH - Update a UWorld log entry
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

    // Verify ownership
    const existing = await prisma.uWorldLog.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    }

    // Build update data - only include fields that were provided
    const updateData: Record<string, unknown> = {}

    if (body.date !== undefined) {
      updateData.date = new Date(body.date)
    }
    if (body.questionsTotal !== undefined) {
      updateData.questionsTotal = body.questionsTotal
    }
    if (body.questionsCorrect !== undefined) {
      updateData.questionsCorrect = body.questionsCorrect
    }
    if (body.timeSpentMins !== undefined) {
      updateData.timeSpentMins = body.timeSpentMins
    }
    if (body.mode !== undefined) {
      updateData.mode = body.mode
    }
    if (body.blockName !== undefined) {
      updateData.blockName = body.blockName
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }

    const log = await prisma.uWorldLog.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(log)
  } catch (error) {
    console.error('Error updating UWorld log:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE - Delete a UWorld log entry
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

    // Verify ownership
    const existing = await prisma.uWorldLog.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    }

    await prisma.uWorldLog.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting UWorld log:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
