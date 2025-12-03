import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface MediaMetadata {
  title?: string
  description?: string
  thumbnail?: string
  duration?: string
  channel?: string
  embedUrl?: string
  favicon?: string
  type?: 'video' | 'podcast' | 'website'
}

// Format duration from seconds to human readable
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Fetch YouTube metadata via oEmbed
async function fetchYouTubeMetadata(url: string): Promise<MediaMetadata | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const res = await fetch(oembedUrl)
    if (!res.ok) return null

    const data = await res.json()

    // Extract video ID for thumbnail and embed
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/)
    const videoId = videoIdMatch?.[1]

    return {
      title: data.title,
      channel: data.author_name,
      thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : data.thumbnail_url,
      embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : undefined,
      type: 'video',
    }
  } catch {
    return null
  }
}

// Fetch Vimeo metadata via oEmbed
async function fetchVimeoMetadata(url: string): Promise<MediaMetadata | null> {
  try {
    const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`
    const res = await fetch(oembedUrl)
    if (!res.ok) return null

    const data = await res.json()

    // Extract video ID for embed
    const videoIdMatch = url.match(/vimeo\.com\/(\d+)/)
    const videoId = videoIdMatch?.[1]

    return {
      title: data.title,
      description: data.description,
      channel: data.author_name,
      thumbnail: data.thumbnail_url,
      duration: data.duration ? formatDuration(data.duration) : undefined,
      embedUrl: videoId ? `https://player.vimeo.com/video/${videoId}` : undefined,
      type: 'video',
    }
  } catch {
    return null
  }
}

// Fetch Spotify metadata via oEmbed
async function fetchSpotifyMetadata(url: string): Promise<MediaMetadata | null> {
  try {
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
    const res = await fetch(oembedUrl)
    if (!res.ok) return null

    const data = await res.json()

    // Extract episode/show ID for embed
    const match = url.match(/spotify\.com\/(episode|show|playlist)\/([^?]+)/)
    const embedUrl = match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}` : undefined

    return {
      title: data.title,
      thumbnail: data.thumbnail_url,
      embedUrl,
      type: 'podcast',
    }
  } catch {
    return null
  }
}

// Fetch generic website metadata via HTML scraping (Open Graph)
async function fetchWebsiteMetadata(url: string): Promise<MediaMetadata | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ScrubBuddy/1.0)',
      },
    })
    if (!res.ok) return null

    const html = await res.text()
    const urlObj = new URL(url)

    // Extract meta tags using regex (simple approach without DOM parser)
    const getMetaContent = (name: string): string | undefined => {
      // Try property first (Open Graph), then name
      const ogMatch = html.match(new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, 'i'))
      if (ogMatch) return ogMatch[1]

      const nameMatch = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'))
      return nameMatch?.[1]
    }

    // Get title
    const ogTitle = getMetaContent('og:title')
    const twitterTitle = getMetaContent('twitter:title')
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = ogTitle || twitterTitle || titleMatch?.[1]

    // Get description
    const ogDescription = getMetaContent('og:description')
    const twitterDescription = getMetaContent('twitter:description')
    const metaDescription = getMetaContent('description')
    const description = ogDescription || twitterDescription || metaDescription

    // Get image (thumbnail)
    const ogImage = getMetaContent('og:image')
    const twitterImage = getMetaContent('twitter:image')
    let thumbnail = ogImage || twitterImage

    // Make relative URLs absolute
    if (thumbnail && !thumbnail.startsWith('http')) {
      thumbnail = new URL(thumbnail, url).href
    }

    // Get favicon
    let favicon: string | undefined
    const iconMatch = html.match(/<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']+)["']/i)
      || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:icon|shortcut icon)["']/i)
    if (iconMatch) {
      favicon = iconMatch[1]
      if (!favicon.startsWith('http')) {
        favicon = new URL(favicon, url).href
      }
    } else {
      // Default to /favicon.ico
      favicon = `${urlObj.origin}/favicon.ico`
    }

    // Get site name as channel
    const siteName = getMetaContent('og:site_name')

    return {
      title: title?.trim(),
      description: description?.trim(),
      thumbnail,
      favicon,
      channel: siteName?.trim(),
      type: 'website',
    }
  } catch {
    return null
  }
}

// Detect platform from URL
function detectPlatform(url: string): 'youtube' | 'vimeo' | 'spotify' | 'website' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube'
  }
  if (url.includes('vimeo.com')) {
    return 'vimeo'
  }
  if (url.includes('spotify.com')) {
    return 'spotify'
  }
  return 'website'
}

// POST - Fetch metadata for a URL
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const platform = detectPlatform(url)
    let metadata: MediaMetadata | null = null

    switch (platform) {
      case 'youtube':
        metadata = await fetchYouTubeMetadata(url)
        break
      case 'vimeo':
        metadata = await fetchVimeoMetadata(url)
        break
      case 'spotify':
        metadata = await fetchSpotifyMetadata(url)
        break
      case 'website':
        metadata = await fetchWebsiteMetadata(url)
        break
    }

    return NextResponse.json({ platform, metadata })
  } catch (error) {
    console.error('Error fetching metadata:', error)
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}
