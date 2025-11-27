import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

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

    const patient = await prisma.patient.findFirst({
      where: { id, userId: session.user.id },
      include: {
        rotation: true,
        proceduresPerformed: { include: { procedure: true } },
        proceduresObserved: { include: { procedure: true } },
      },
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    return NextResponse.json({ patient })
  } catch (error) {
    console.error('Error fetching patient:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

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
    const body = await request.json()

    const existing = await prisma.patient.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        chiefComplaint: body.chiefComplaint,
        diagnosis: body.diagnosis,
        rotationId: body.rotationId || null,
        encounterDate: body.encounterDate ? new Date(body.encounterDate) : undefined,
        secondaryDx: body.secondaryDx,
        setting: body.setting,
        ageGroup: body.ageGroup,
        attendingName: body.attendingName,
        learningPoints: body.learningPoints,
        followUpNeeded: body.followUpNeeded,
        followUpNotes: body.followUpNotes,
      },
      include: {
        rotation: true,
      },
    })

    return NextResponse.json({ patient })
  } catch (error) {
    console.error('Error updating patient:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

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

    const existing = await prisma.patient.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    await prisma.patient.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting patient:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
