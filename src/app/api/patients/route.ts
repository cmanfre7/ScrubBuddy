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
    const rotationId = searchParams.get('rotationId')
    const setting = searchParams.get('setting')
    const search = searchParams.get('search')

    const patients = await prisma.patient.findMany({
      where: {
        userId: session.user.id,
        ...(rotationId && { rotationId }),
        ...(setting && { setting }),
        ...(search && {
          OR: [
            { chiefComplaint: { contains: search, mode: 'insensitive' } },
            { diagnosis: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        rotation: true,
        proceduresPerformed: { include: { procedure: true } },
        proceduresObserved: { include: { procedure: true } },
      },
      orderBy: { encounterDate: 'desc' },
    })

    return NextResponse.json({ patients })
  } catch (error) {
    console.error('Error fetching patients:', error)
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
    const {
      chiefComplaint,
      diagnosis,
      rotationId,
      encounterDate,
      secondaryDx,
      setting,
      ageGroup,
      attendingName,
      learningPoints,
      followUpNeeded,
      followUpNotes,
    } = body

    if (!chiefComplaint || !diagnosis) {
      return NextResponse.json(
        { error: 'Chief complaint and diagnosis are required' },
        { status: 400 }
      )
    }

    const patient = await prisma.patient.create({
      data: {
        userId: session.user.id,
        chiefComplaint,
        diagnosis,
        rotationId: rotationId || null,
        encounterDate: encounterDate ? new Date(encounterDate) : new Date(),
        secondaryDx: secondaryDx || [],
        setting,
        ageGroup,
        attendingName,
        learningPoints,
        followUpNeeded: followUpNeeded || false,
        followUpNotes,
      },
      include: {
        rotation: true,
      },
    })

    return NextResponse.json({ patient }, { status: 201 })
  } catch (error) {
    console.error('Error creating patient:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
