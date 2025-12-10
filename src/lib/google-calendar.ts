import { google, calendar_v3 } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
]

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/google-calendar/callback`
  )
}

export function getAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent', // Force consent to get refresh token
  })
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials
}

export function getCalendarClient(accessToken: string, refreshToken: string) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

export async function getUserEmail(accessToken: string): Promise<string | null> {
  try {
    const oauth2Client = getOAuth2Client()
    oauth2Client.setCredentials({ access_token: accessToken })
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data } = await oauth2.userinfo.get()
    return data.email || null
  } catch (error) {
    console.error('Failed to get user email:', error)
    return null
  }
}

export async function listCalendars(accessToken: string, refreshToken: string) {
  const calendar = getCalendarClient(accessToken, refreshToken)
  const response = await calendar.calendarList.list()
  return response.data.items || []
}

export async function listEvents(
  accessToken: string,
  refreshToken: string,
  calendarId: string,
  options: {
    timeMin?: Date
    timeMax?: Date
    syncToken?: string
  } = {}
) {
  const calendar = getCalendarClient(accessToken, refreshToken)

  const params: calendar_v3.Params$Resource$Events$List = {
    calendarId,
    singleEvents: true,
    orderBy: 'startTime',
  }

  if (options.syncToken) {
    params.syncToken = options.syncToken
  } else {
    if (options.timeMin) {
      params.timeMin = options.timeMin.toISOString()
    }
    if (options.timeMax) {
      params.timeMax = options.timeMax.toISOString()
    }
  }

  const response = await calendar.events.list(params)
  return {
    events: response.data.items || [],
    nextSyncToken: response.data.nextSyncToken,
  }
}

export async function createGoogleEvent(
  accessToken: string,
  refreshToken: string,
  calendarId: string,
  event: {
    summary: string
    description?: string
    location?: string
    start: Date
    end: Date
    allDay?: boolean
  }
) {
  const calendar = getCalendarClient(accessToken, refreshToken)

  const eventData: calendar_v3.Schema$Event = {
    summary: event.summary,
    description: event.description,
    location: event.location,
  }

  if (event.allDay) {
    eventData.start = { date: event.start.toISOString().split('T')[0] }
    eventData.end = { date: event.end.toISOString().split('T')[0] }
  } else {
    eventData.start = { dateTime: event.start.toISOString() }
    eventData.end = { dateTime: event.end.toISOString() }
  }

  const response = await calendar.events.insert({
    calendarId,
    requestBody: eventData,
  })

  return response.data
}

export async function updateGoogleEvent(
  accessToken: string,
  refreshToken: string,
  calendarId: string,
  eventId: string,
  event: {
    summary: string
    description?: string
    location?: string
    start: Date
    end: Date
    allDay?: boolean
  }
) {
  const calendar = getCalendarClient(accessToken, refreshToken)

  const eventData: calendar_v3.Schema$Event = {
    summary: event.summary,
    description: event.description,
    location: event.location,
  }

  if (event.allDay) {
    eventData.start = { date: event.start.toISOString().split('T')[0] }
    eventData.end = { date: event.end.toISOString().split('T')[0] }
  } else {
    eventData.start = { dateTime: event.start.toISOString() }
    eventData.end = { dateTime: event.end.toISOString() }
  }

  const response = await calendar.events.update({
    calendarId,
    eventId,
    requestBody: eventData,
  })

  return response.data
}

export async function deleteGoogleEvent(
  accessToken: string,
  refreshToken: string,
  calendarId: string,
  eventId: string
) {
  const calendar = getCalendarClient(accessToken, refreshToken)
  await calendar.events.delete({
    calendarId,
    eventId,
  })
}
