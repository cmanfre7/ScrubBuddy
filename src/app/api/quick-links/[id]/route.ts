import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Get a single quick link
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

    const quickLink = await prisma.quickLink.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!quickLink) {
      return NextResponse.json({ error: 'Quick link not found' }, { status: 404 })
    }

    return NextResponse.json(quickLink)
  } catch (error) {
    console.error('Error fetching quick link:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PATCH - Update a quick link
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
    const data = await request.json()

    // Verify the quick link belongs to the user
    const existing = await prisma.quickLink.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Quick link not found' }, { status: 404 })
    }

    const quickLink = await prisma.quickLink.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        url: data.url ?? existing.url,
        order: data.order ?? existing.order,
      },
    })

    return NextResponse.json(quickLink)
  } catch (error) {
    console.error('Error updating quick link:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE - Delete a quick link
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

    // Verify the quick link belongs to the user
    const existing = await prisma.quickLink.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Quick link not found' }, { status: 404 })
    }

    await prisma.quickLink.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting quick link:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
