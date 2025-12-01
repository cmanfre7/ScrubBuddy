import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - List all resources with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const subject = searchParams.get('subject')
    const search = searchParams.get('search')
    const favorite = searchParams.get('favorite')

    const where: any = {
      userId: session.user.id,
      isArchived: false,
    }

    if (type && type !== 'all') {
      where.type = type
    }

    if (subject && subject !== 'all') {
      where.subject = subject
    }

    if (favorite === 'true') {
      where.isFavorite = true
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { channel: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ]
    }

    const resources = await prisma.resource.findMany({
      where,
      orderBy: [
        { isFavorite: 'desc' },
        { updatedAt: 'desc' },
      ],
    })

    return NextResponse.json(resources)
  } catch (error) {
    console.error('Error fetching resources:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST - Create new resource
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Extract YouTube video ID and create embed URL
    let embedUrl = data.embedUrl
    if (data.type === 'video' && data.url && !embedUrl) {
      embedUrl = getYouTubeEmbedUrl(data.url)
    }

    // Extract Spotify embed URL
    if (data.type === 'podcast' && data.url && !embedUrl) {
      embedUrl = getSpotifyEmbedUrl(data.url)
    }

    const resource = await prisma.resource.create({
      data: {
        userId: session.user.id,
        name: data.name,
        description: data.description,
        url: data.url,
        type: data.type,
        subject: data.subject,
        rotation: data.rotation,
        tags: data.tags || [],
        embedUrl,
        duration: data.duration,
        channel: data.channel,
        thumbnail: data.thumbnail || getYouTubeThumbnail(data.url),
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        pageCount: data.pageCount,
        favicon: data.favicon,
        notes: data.notes,
      },
    })

    return NextResponse.json(resource)
  } catch (error) {
    console.error('Error creating resource:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// Helper functions
function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null

  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`
    }
  }

  return null
}

function getYouTubeThumbnail(url: string): string | null {
  if (!url) return null

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`
    }
  }

  return null
}

function getSpotifyEmbedUrl(url: string): string | null {
  if (!url) return null

  // Handle Spotify URLs
  // https://open.spotify.com/episode/xxx -> https://open.spotify.com/embed/episode/xxx
  // https://open.spotify.com/show/xxx -> https://open.spotify.com/embed/show/xxx
  const match = url.match(/spotify\.com\/(episode|show|playlist)\/([^?]+)/)
  if (match) {
    return `https://open.spotify.com/embed/${match[1]}/${match[2]}`
  }

  return null
}
