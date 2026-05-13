import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { canAccessPath, isUserRole } from '@/lib/auth/roles'

const publicRoutes = ['/', '/auth', '/camp-meeting/register', '/camp-meeting/success', '/f']

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
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.endsWith('/') && pathname !== '/') {
    const redirectUrl = new URL(request.url)
    redirectUrl.pathname = pathname.slice(0, -1)
    return NextResponse.redirect(redirectUrl, 301)
  }

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isProtectedRoute = protectedPrefixes.some((prefix) => pathname.startsWith(prefix))

  if (isProtectedRoute) {
    const hasAuthToken = request.cookies.has('firebase-auth-token')
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
    const hasAuthToken = request.cookies.has('firebase-auth-token')
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
