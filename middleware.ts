import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { canAccessPath, isUserRole } from '@/lib/auth/roles'
import { CHMS_AUTH_SESSION_COOKIE } from '@/lib/auth/session-cookie'
import { RLC_PUBLIC_VISIT_PATH, RLC_PUBLIC_JOIN_PATH } from '@/lib/constants/rlc'

const publicRoutes = ['/', '/auth', '/camp-meeting/register', '/camp-meeting/success', '/f', '/rlc/visit', '/rlc/join']

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

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
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
    if (role && isUserRole(role) && !canAccessPath(role, pathname)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  if (pathname === '/') {
    const hasAuthToken = request.cookies.has(CHMS_AUTH_SESSION_COOKIE)
    if (hasAuthToken && !isPublicRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)',
  ],
}
