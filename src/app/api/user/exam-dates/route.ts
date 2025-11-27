import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { step2Date, comlexDate } = body

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        step2Date: step2Date ? new Date(step2Date) : null,
        comlexDate: comlexDate ? new Date(comlexDate) : null,
      },
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Error updating exam dates:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
