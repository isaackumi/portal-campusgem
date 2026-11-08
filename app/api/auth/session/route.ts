import { NextResponse, after, type NextRequest } from 'next/server'
import { noteVisit } from '@/lib/activity/log'
import {
  applySessionCookies,
  clearSessionCookies,
  getSessionUser,
  toSessionPayload,
} from '@/lib/auth/server-session'

export const dynamic = 'force-dynamic'

/**
 * Returns the signed-in user as stored in the database right now and refreshes the
 * role/permission cookies, so role changes apply without signing out and back in.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !user.auth_uid) {
      const response = NextResponse.json({ user: null }, { status: 401 })
      clearSessionCookies(response)
      return response
    }
    // "Opened the app" in the activity log, once a day each; after the reply so it adds no wait.
    const h = new Headers(request.headers)
    after(() => noteVisit(user, h))
    const response = NextResponse.json(
      { user: toSessionPayload(user) },
      { headers: { 'Cache-Control': 'no-store' } }
    )
    applySessionCookies(response, user)
    return response
  } catch (error) {
    console.error('Session refresh error:', error)
    // Transient backend failure: keep the existing session rather than signing the user out.
    return NextResponse.json({ error: 'Session check failed' }, { status: 503 })
  }
}
