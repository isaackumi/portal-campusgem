import { NextRequest, NextResponse } from 'next/server'
import { canAccessPath, safeRedirectPath } from '@/lib/auth/roles'
import { applySessionCookies, clearSessionCookies, getSessionUser } from '@/lib/auth/server-session'

export const dynamic = 'force-dynamic'

/**
 * Middleware sends a user here when their role cookie denies a page. Re-read the user
 * from the DB, refresh cookies, and continue if they now have access (e.g. just promoted).
 */
export async function GET(request: NextRequest) {
  const next = safeRedirectPath(request.nextUrl.searchParams.get('next'))
  try {
    const user = await getSessionUser()
    if (!user) {
      const signIn = new URL('/auth', request.url)
      signIn.searchParams.set('redirect', next)
      const response = NextResponse.redirect(signIn)
      clearSessionCookies(response)
      return response
    }
    const allowed = canAccessPath(user.role, next, user.permissions)
    const target = new URL(allowed ? next : '/dashboard', request.url)
    if (!allowed) target.searchParams.set('denied', next.split('?')[0])
    const response = NextResponse.redirect(target)
    applySessionCookies(response, user)
    return response
  } catch (error) {
    console.error('Access refresh error:', error)
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
}
