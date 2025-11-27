import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const specialty = searchParams.get('specialty')

    const guidelines = await prisma.clinicalGuideline.findMany({
      where: {
        userId: session.user.id,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(specialty && { specialty }),
      },
      include: {
        rotation: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ guidelines })
  } catch (error) {
    console.error('Error fetching clinical guidelines:', error)
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
    const { title, description, specialty, content, source, rotationId } = body

    if (!title || !specialty || !content) {
      return NextResponse.json({ error: 'Title, specialty, and content are required' }, { status: 400 })
    }

    const guideline = await prisma.clinicalGuideline.create({
      data: {
        userId: session.user.id,
        title,
        description: description || null,
        specialty,
        content,
        source: source || null,
        rotationId: rotationId || null,
      },
      include: {
        rotation: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ guideline }, { status: 201 })
  } catch (error) {
    console.error('Error creating clinical guideline:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
