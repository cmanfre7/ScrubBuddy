import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Default quick links for new users
const DEFAULT_QUICK_LINKS = [
  { name: 'NewInnovations', url: 'https://www.new-innov.com/login/Login.aspx', order: 0 },
  { name: 'VSLO', url: 'https://www.aamc.org/services/vslo', order: 1 },
  { name: 'ERAS', url: 'https://www.aamc.org/services/eras', order: 2 },
  { name: 'MyNBME', url: 'https://www.nbme.org', order: 3 },
  { name: 'UWorld', url: 'https://www.uworld.com', order: 4 },
]

// GET - Get all quick links for the user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let quickLinks = await prisma.quickLink.findMany({
      where: { userId: session.user.id },
      orderBy: { order: 'asc' },
    })

    // If user has no quick links, create default ones
    if (quickLinks.length === 0) {
      await prisma.quickLink.createMany({
        data: DEFAULT_QUICK_LINKS.map((link) => ({
          ...link,
          userId: session.user.id,
        })),
      })

      quickLinks = await prisma.quickLink.findMany({
        where: { userId: session.user.id },
        orderBy: { order: 'asc' },
      })
    }

    return NextResponse.json(quickLinks)
  } catch (error) {
    console.error('Error fetching quick links:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST - Create a new quick link
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    if (!data.name || !data.url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 })
    }

    // Get the highest order to add new link at the end
    const maxOrder = await prisma.quickLink.findFirst({
      where: { userId: session.user.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const quickLink = await prisma.quickLink.create({
      data: {
        userId: session.user.id,
        name: data.name,
        url: data.url,
        order: (maxOrder?.order ?? -1) + 1,
      },
    })

    return NextResponse.json(quickLink)
  } catch (error) {
    console.error('Error creating quick link:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PUT - Update order of all quick links
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    if (!Array.isArray(data.links)) {
      return NextResponse.json({ error: 'links array is required' }, { status: 400 })
    }

    // Update order for each link
    await Promise.all(
      data.links.map((link: { id: string; order: number }, index: number) =>
        prisma.quickLink.updateMany({
          where: { id: link.id, userId: session.user.id },
          data: { order: index },
        })
      )
    )

    const quickLinks = await prisma.quickLink.findMany({
      where: { userId: session.user.id },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(quickLinks)
  } catch (error) {
    console.error('Error updating quick links order:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
