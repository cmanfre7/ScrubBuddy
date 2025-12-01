import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { randomBytes, createHash } from 'crypto'

// Generate a new sync token or return existing one
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existingToken = await prisma.ankiSyncToken.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        lastSyncAt: true,
        isActive: true,
        createdAt: true,
      },
    })

    if (existingToken) {
      return NextResponse.json({
        hasToken: true,
        lastSyncAt: existingToken.lastSyncAt,
        isActive: existingToken.isActive,
        createdAt: existingToken.createdAt,
      })
    }

    return NextResponse.json({ hasToken: false })
  } catch (error) {
    console.error('Error fetching anki token:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// Generate a new token
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate a random token
    const rawToken = randomBytes(32).toString('hex')
    // Hash it for storage
    const hashedToken = createHash('sha256').update(rawToken).digest('hex')

    // Delete existing token if any
    await prisma.ankiSyncToken.deleteMany({
      where: { userId: session.user.id },
    })

    // Create new token
    await prisma.ankiSyncToken.create({
      data: {
        userId: session.user.id,
        token: hashedToken,
        isActive: true,
      },
    })

    // Return the raw token (only shown once!)
    return NextResponse.json({
      token: rawToken,
      message: 'Save this token! It will only be shown once.',
    })
  } catch (error) {
    console.error('Error generating anki token:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// Revoke token
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.ankiSyncToken.deleteMany({
      where: { userId: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting anki token:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
