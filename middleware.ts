import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { canAccessPath, decodePermissionsCookie, isUserRole, safeRedirectPath } from '@/lib/auth/roles'
import { CHMS_AUTH_SESSION_COOKIE } from '@/lib/auth/session-cookie'
import { RLC_PUBLIC_VISIT_PATH, RLC_PUBLIC_JOIN_PATH } from '@/lib/constants/rlc'

/** Staff-only admin form; guests without a session use the public self-registration page. */
const RLC_ADMIN_VISITOR_ADD_PATH = '/admin/rlc/visitors/add'
const RLC_ADMIN_MEMBER_ADD_PATH = '/admin/rlc/members/add'

const protectedPrefixes = [
  '/dashboard',
  '/admin',
  '/members',
  '/attendance',
  '/groups',
  '/sms',
  '/celebrations',
  '/visitors',
  '/financial',
  '/communication',
  '/settings',
  '/recommendations',
]

function legacyVisitorsRedirect(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl
  if (pathname === '/visitors') {
    return NextResponse.redirect(new URL('/admin/rlc/visitors', request.url))
  }
  if (pathname === '/visitors/add') {
    return NextResponse.redirect(new URL('/admin/rlc/visitors/add', request.url))
  }
  if (pathname.startsWith('/visitors/')) {
    const suffix = pathname.slice('/visitors'.length)
    return NextResponse.redirect(new URL(`/admin/rlc/visitors${suffix}`, request.url))
  }
  return null
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const visitorsRedirect = legacyVisitorsRedirect(request)
  if (visitorsRedirect) return visitorsRedirect

  if (pathname.endsWith('/') && pathname !== '/') {
    const redirectUrl = new URL(request.url)
    redirectUrl.pathname = pathname.slice(0, -1)
    return NextResponse.redirect(redirectUrl, 301)
  }

  const isProtectedRoute = protectedPrefixes.some((prefix) => pathname.startsWith(prefix))
  const hasAuthToken = request.cookies.has(CHMS_AUTH_SESSION_COOKIE)

  if (pathname === RLC_ADMIN_VISITOR_ADD_PATH && !hasAuthToken) {
    return NextResponse.redirect(new URL(RLC_PUBLIC_VISIT_PATH, request.url))
  }

  if (pathname === RLC_ADMIN_MEMBER_ADD_PATH && !hasAuthToken) {
    return NextResponse.redirect(new URL(RLC_PUBLIC_JOIN_PATH, request.url))
  }

  if (isProtectedRoute) {
    if (!hasAuthToken) {
      const redirectUrl = new URL('/auth', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    const role = request.cookies.get('chms-role')?.value
    const extra = decodePermissionsCookie(request.cookies.get('chms-perms')?.value)
    if (role && isUserRole(role) && !canAccessPath(role, pathname, extra)) {
      // The cookie may predate a promotion: re-check against the DB before refusing.
      const refreshUrl = new URL('/api/auth/refresh', request.url)
      refreshUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
      return NextResponse.redirect(refreshUrl)
    }
  }

  // Already signed in: skip the sign-in form instead of making the user log in again.
  if (pathname === '/auth' && hasAuthToken) {
    const target = safeRedirectPath(request.nextUrl.searchParams.get('redirect'))
    return NextResponse.redirect(new URL(target, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)',
  ],
}
