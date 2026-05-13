import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/firebase/server'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await auth.verifyIdToken(token).catch(() => null)
    if (!decoded?.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      updated_count: 0,
      message: 'Profile completion refresh (no-op with Firebase)'
    })
  } catch (error) {
    console.error('Error in refresh-profile-completion:', error)
    return NextResponse.json({ success: true, updated_count: 0, message: 'Profile refresh skipped' })
  }
}
