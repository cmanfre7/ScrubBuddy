import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAuthUrl } from '@/lib/google-calendar'
import crypto from 'crypto'

// GET /api/google-calendar/connect - Get Google OAuth URL
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if Google credentials are configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Google Calendar integration is not configured' },
      { status: 503 }
    )
  }

  try {
    // Create a state token that includes the user ID for verification
    // This prevents CSRF attacks
    const stateData = {
      userId: session.user.id,
      nonce: crypto.randomBytes(16).toString('hex'),
    }
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64')

    const authUrl = getAuthUrl(state)

    return NextResponse.json({ url: authUrl })
  } catch (error) {
    console.error('Google Calendar connect error:', error)
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}
