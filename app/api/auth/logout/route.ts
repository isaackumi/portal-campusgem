import { NextResponse } from 'next/server'
import { clearSessionCookies } from '@/lib/auth/server-session'
import { logActivity } from '@/lib/activity/log'

export async function POST() {
  // Noted before the session goes, so the log knows who signed out.
  await logActivity({ category: 'auth', action: 'auth.signout', summary: 'Signed out' })
  const response = NextResponse.json({ success: true })
  clearSessionCookies(response)
  return response
}
