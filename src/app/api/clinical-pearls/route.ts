import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rotationId = searchParams.get('rotationId')
    const search = searchParams.get('search')
    const highYield = searchParams.get('highYield') === 'true'
    const recent = searchParams.get('recent') === 'true'

    const where: any = {
      userId: session.user.id,
    }

    if (rotationId) {
      where.rotationId = rotationId
    }

    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { backContent: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ]
    }

    if (highYield) {
      where.isHighYield = true
    }

    let orderBy: any = { createdAt: 'desc' }
    if (recent) {
      orderBy = { createdAt: 'desc' }
    }

    const pearls = await prisma.clinicalPearl.findMany({
      where,
      orderBy,
      take: recent ? 20 : undefined,
    })

    return NextResponse.json(pearls)
  } catch (error) {
    console.error('Error fetching clinical pearls:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { content, backContent, imageData, imageType, imagePlacement, tags, isHighYield, source, rotationId, patientId } = data

    // Validate image size if provided (max 10MB base64 ~ 13MB string)
    if (imageData && imageData.length > 13 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    const pearl = await prisma.clinicalPearl.create({
      data: {
        userId: session.user.id,
        content,
        backContent: backContent || null,
        imageData: imageData || null,
        imageType: imageType || null,
        imagePlacement: imagePlacement || null,
        tags: tags || [],
        isHighYield: isHighYield || false,
        source,
        rotationId,
        patientId,
      },
    })

    return NextResponse.json(pearl, { status: 201 })
  } catch (error) {
    console.error('Error creating clinical pearl:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
