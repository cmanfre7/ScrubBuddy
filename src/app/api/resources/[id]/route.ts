import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Get single resource
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

    const resource = await prisma.resource.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    // Update view count and last accessed
    await prisma.resource.update({
      where: { id },
      data: {
        viewCount: { increment: 1 },
        lastAccessed: new Date(),
      },
    })

    return NextResponse.json(resource)
  } catch (error) {
    console.error('Error fetching resource:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PUT - Update resource
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
    const data = await request.json()

    // Verify ownership
    const existing = await prisma.resource.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    const resource = await prisma.resource.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        url: data.url,
        type: data.type,
        subject: data.subject,
        rotation: data.rotation,
        tags: data.tags,
        embedUrl: data.embedUrl,
        duration: data.duration,
        channel: data.channel,
        thumbnail: data.thumbnail,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        pageCount: data.pageCount,
        favicon: data.favicon,
        isFavorite: data.isFavorite,
        isArchived: data.isArchived,
        notes: data.notes,
      },
    })

    return NextResponse.json(resource)
  } catch (error) {
    console.error('Error updating resource:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PATCH - Toggle favorite or archive
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

    // Verify ownership
    const existing = await prisma.resource.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    const updateData: any = {}

    if (typeof data.isFavorite === 'boolean') {
      updateData.isFavorite = data.isFavorite
    }

    if (typeof data.isArchived === 'boolean') {
      updateData.isArchived = data.isArchived
    }

    const resource = await prisma.resource.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(resource)
  } catch (error) {
    console.error('Error patching resource:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE - Delete resource
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
    const existing = await prisma.resource.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    await prisma.resource.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting resource:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
