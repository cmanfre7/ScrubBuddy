import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subject } = body

    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    }

    // Find all logs that include this subject
    const logsToDelete = await prisma.uWorldLog.findMany({
      where: {
        userId: session.user.id,
        systems: {
          has: subject,
        },
      },
      select: { id: true },
    })

    // Delete all matching logs
    const deleteResult = await prisma.uWorldLog.deleteMany({
      where: {
        id: {
          in: logsToDelete.map((log) => log.id),
        },
      },
    })

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
    })
  } catch (error) {
    console.error('Error clearing UWorld data:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
