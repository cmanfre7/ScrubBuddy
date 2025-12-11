import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Get single algorithm (with image data)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const algorithm = await prisma.clinicalAlgorithm.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        rotation: {
          select: { id: true, name: true },
        },
      },
    })

    if (!algorithm) {
      return NextResponse.json({ error: 'Algorithm not found' }, { status: 404 })
    }

    return NextResponse.json(algorithm)
  } catch (error) {
    console.error('Error fetching algorithm:', error)
    return NextResponse.json({ error: 'Failed to fetch algorithm' }, { status: 500 })
  }
}

// PUT - Update algorithm
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, description, subject, imageData, imageType, textContent, source, tags, isHighYield, rotationId } = body

    // Check ownership
    const existing = await prisma.clinicalAlgorithm.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Algorithm not found' }, { status: 404 })
    }

    // Build update data - only include fields that are provided
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (subject !== undefined) updateData.subject = subject
    if (source !== undefined) updateData.source = source
    if (tags !== undefined) updateData.tags = tags
    if (isHighYield !== undefined) updateData.isHighYield = isHighYield
    if (rotationId !== undefined) updateData.rotationId = rotationId || null
    if (textContent !== undefined) updateData.textContent = textContent || null

    // Only update image if new image is provided
    if (imageData && imageType) {
      // Validate image size
      if (imageData.length > 13 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Image too large. Maximum size is 10MB.' },
          { status: 400 }
        )
      }
      updateData.imageData = imageData
      updateData.imageType = imageType
    }

    const algorithm = await prisma.clinicalAlgorithm.update({
      where: { id },
      data: updateData,
      include: {
        rotation: {
          select: { id: true, name: true },
        },
      },
    })

    // Return without image data for performance
    return NextResponse.json({
      id: algorithm.id,
      title: algorithm.title,
      description: algorithm.description,
      subject: algorithm.subject,
      imageType: algorithm.imageType,
      source: algorithm.source,
      tags: algorithm.tags,
      isHighYield: algorithm.isHighYield,
      rotation: algorithm.rotation,
      createdAt: algorithm.createdAt,
      updatedAt: algorithm.updatedAt,
      hasImage: !!algorithm.imageData,
      hasText: !!algorithm.textContent,
    })
  } catch (error) {
    console.error('Error updating algorithm:', error)
    return NextResponse.json({ error: 'Failed to update algorithm' }, { status: 500 })
  }
}

// DELETE - Delete algorithm
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check ownership
    const existing = await prisma.clinicalAlgorithm.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Algorithm not found' }, { status: 404 })
    }

    await prisma.clinicalAlgorithm.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting algorithm:', error)
    return NextResponse.json({ error: 'Failed to delete algorithm' }, { status: 500 })
  }
}
