import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// GET /api/calendar-feed - Get user's feed info
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const feed = await prisma.calendarFeed.findUnique({
      where: { userId: session.user.id },
    })

    if (!feed) {
      return NextResponse.json({ exists: false })
    }

    // Return feed info without exposing the full token in the response
    // The full URL will be constructed client-side
    return NextResponse.json({
      exists: true,
      token: feed.token,
      isActive: feed.isActive,
      createdAt: feed.createdAt,
    })
  } catch (error) {
    console.error('Calendar feed fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
  }
}

// POST /api/calendar-feed - Create or regenerate feed token
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex')

    // Upsert: create or replace existing feed
    const feed = await prisma.calendarFeed.upsert({
      where: { userId: session.user.id },
      update: {
        token,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        token,
        isActive: true,
      },
    })

    return NextResponse.json({
      exists: true,
      token: feed.token,
      isActive: feed.isActive,
      createdAt: feed.createdAt,
    })
  } catch (error) {
    console.error('Calendar feed creation error:', error)
    return NextResponse.json({ error: 'Failed to create feed' }, { status: 500 })
  }
}

// DELETE /api/calendar-feed - Deactivate feed
export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.calendarFeed.update({
      where: { userId: session.user.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Calendar feed deletion error:', error)
    return NextResponse.json({ error: 'Failed to deactivate feed' }, { status: 500 })
  }
}
