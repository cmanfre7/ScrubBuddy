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
    const category = searchParams.get('category')

    const notes = await prisma.studyNote.findMany({
      where: {
        userId: session.user.id,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
            { tags: { has: search } },
          ],
        }),
        ...(category && { category }),
      },
      include: {
        rotation: { select: { id: true, name: true } },
      },
      orderBy: [
        { isStarred: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ notes })
  } catch (error) {
    console.error('Error fetching study notes:', error)
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
    const { title, content, category, tags, source, rotationId } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const note = await prisma.studyNote.create({
      data: {
        userId: session.user.id,
        title,
        content,
        category: category || 'other',
        tags: tags || [],
        source: source || null,
        rotationId: rotationId || null,
      },
      include: {
        rotation: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    console.error('Error creating study note:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
