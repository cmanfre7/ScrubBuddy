import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - List all clinical algorithms (with optional subject filter)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const subject = searchParams.get('subject')
    const rotationId = searchParams.get('rotationId')
    const highYieldOnly = searchParams.get('highYield') === 'true'

    const algorithms = await prisma.clinicalAlgorithm.findMany({
      where: {
        userId: session.user.id,
        ...(subject && { subject }),
        ...(rotationId && { rotationId }),
        ...(highYieldOnly && { isHighYield: true }),
      },
      include: {
        rotation: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Return algorithms without image data for list view (for performance)
    // Frontend will fetch individual images when needed
    const algorithmsWithoutImageData = algorithms.map(algo => ({
      id: algo.id,
      title: algo.title,
      description: algo.description,
      subject: algo.subject,
      imageType: algo.imageType,
      source: algo.source,
      tags: algo.tags,
      isHighYield: algo.isHighYield,
      rotation: algo.rotation,
      createdAt: algo.createdAt,
      updatedAt: algo.updatedAt,
      // Include a small preview indicator
      hasImage: !!algo.imageData,
    }))

    return NextResponse.json(algorithmsWithoutImageData)
  } catch (error) {
    console.error('Error fetching algorithms:', error)
    return NextResponse.json({ error: 'Failed to fetch algorithms' }, { status: 500 })
  }
}

// POST - Create new clinical algorithm
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, subject, imageData, imageType, source, tags, isHighYield, rotationId } = body

    // Validate required fields
    if (!title || !subject || !imageData || !imageType) {
      return NextResponse.json(
        { error: 'Title, subject, and image are required' },
        { status: 400 }
      )
    }

    // Validate image size (max 10MB base64 ~ 13MB string)
    if (imageData.length > 13 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    const algorithm = await prisma.clinicalAlgorithm.create({
      data: {
        userId: session.user.id,
        title,
        description: description || null,
        subject,
        imageData,
        imageType,
        source: source || null,
        tags: tags || [],
        isHighYield: isHighYield || false,
        rotationId: rotationId || null,
      },
      include: {
        rotation: {
          select: { id: true, name: true },
        },
      },
    })

    // Return without image data
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
      hasImage: true,
    })
  } catch (error) {
    console.error('Error creating algorithm:', error)
    return NextResponse.json({ error: 'Failed to create algorithm' }, { status: 500 })
  }
}
