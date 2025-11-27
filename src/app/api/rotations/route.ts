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

    const { searchParams } = new URL(request.url)
    const includeCounts = searchParams.get('includeCounts') === 'true'

    const rotations = await prisma.rotation.findMany({
      where: { userId: session.user.id },
      orderBy: { startDate: 'asc' },
      include: includeCounts
        ? {
            _count: {
              select: {
                patients: true,
                clinicalPearls: true,
              },
            },
          }
        : undefined,
    })

    // If includeCounts is true, return array directly for clinical-notes page
    // Otherwise return wrapped in object for backward compatibility
    return NextResponse.json(includeCounts ? rotations : { rotations })
  } catch (error) {
    console.error('Error fetching rotations:', error)
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
    const { name, startDate, endDate, shelfDate, isCurrent } = body

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Name, start date, and end date are required' },
        { status: 400 }
      )
    }

    // If setting as current, unset other current rotations
    if (isCurrent) {
      await prisma.rotation.updateMany({
        where: { userId: session.user.id, isCurrent: true },
        data: { isCurrent: false },
      })
    }

    const rotation = await prisma.rotation.create({
      data: {
        userId: session.user.id,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        shelfDate: shelfDate ? new Date(shelfDate) : null,
        isCurrent: isCurrent || false,
      },
    })

    return NextResponse.json({ rotation }, { status: 201 })
  } catch (error) {
    console.error('Error creating rotation:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
