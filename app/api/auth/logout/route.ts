import { NextResponse } from 'next/server'
import { clearSessionCookies } from '@/lib/auth/server-session'

export async function POST() {
  const response = NextResponse.json({ success: true })
  clearSessionCookies(response)
  return response
}
