import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTokensFromCode, getUserEmail } from '@/lib/google-calendar'

// GET /api/google-calendar/callback - Handle Google OAuth callback
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    // Redirect to login if not authenticated
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/calendar?error=google_auth_denied', request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard/calendar?error=google_auth_invalid', request.url)
    )
  }

  try {
    // Verify state token
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    if (stateData.userId !== session.user.id) {
      return NextResponse.redirect(
        new URL('/dashboard/calendar?error=google_auth_invalid', request.url)
      )
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      console.error('Missing tokens from Google OAuth')
      return NextResponse.redirect(
        new URL('/dashboard/calendar?error=google_auth_failed', request.url)
      )
    }

    // Get user's Google email
    const googleEmail = await getUserEmail(tokens.access_token)

    // Calculate token expiry
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000) // Default 1 hour

    // Store tokens in database
    await prisma.googleCalendarSync.upsert({
      where: { userId: session.user.id },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: expiresAt,
        googleEmail,
        syncEnabled: true,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: expiresAt,
        googleEmail,
        syncEnabled: true,
        selectedCalendars: ['primary'], // Default to primary calendar
      },
    })

    // Redirect back to calendar with success
    return NextResponse.redirect(
      new URL('/dashboard/calendar?success=google_connected', request.url)
    )
  } catch (error) {
    console.error('Google Calendar callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/calendar?error=google_auth_failed', request.url)
    )
  }
}
