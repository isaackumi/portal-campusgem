import { NextResponse } from 'next/server'
import { CHMS_AUTH_SESSION_COOKIE } from '@/lib/auth/session-cookie'

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 0,
  path: '/',
}

export async function POST() {
  const response = NextResponse.json({ success: true })

  response.cookies.set(CHMS_AUTH_SESSION_COOKIE, '', cookieOptions)
  response.cookies.set('firebase-auth-token', '', cookieOptions)
  response.cookies.set('chms-role', '', cookieOptions)
  response.cookies.set('chms-user-id', '', cookieOptions)
  response.cookies.set('sb-access-token', '', cookieOptions)

  return response
}
