import { NextRequest, NextResponse } from 'next/server'
import { isValidMembershipId, normalizeMembershipId } from '@/lib/membershipId'
import { normalizePhone, isValidPhone } from '@/lib/phone'
import type { AppUser } from '@/lib/types'

async function findUserByMembershipId(membershipId: string): Promise<AppUser | null> {
  const { findUserByMembershipIdFromConvex } = await import('@/lib/convex/core-bridge')
  return findUserByMembershipIdFromConvex(membershipId)
}

async function findUserByPhone(phone: string): Promise<AppUser | null> {
  const { findUserByPhoneFromConvex } = await import('@/lib/convex/core-bridge')
  return findUserByPhoneFromConvex(phone)
}

async function resolveUserByPhone(phoneInput: string): Promise<AppUser | null> {
  return findUserByPhone(phoneInput.trim())
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.CAMP_CONVEX_SERVER_SECRET) {
      return NextResponse.json(
        { error: 'Convex is not configured for authentication' },
        { status: 503 }
      )
    }

    const { phoneOrId } = await request.json()

    if (!phoneOrId?.trim()) {
      return NextResponse.json(
        { error: 'Phone number or membership ID is required' },
        { status: 400 }
      )
    }

    const rawInput = phoneOrId.trim()
    const normalizedMembershipId = normalizeMembershipId(rawInput)
    const membershipLookup = isValidMembershipId(normalizedMembershipId)
    const phoneLookup = isValidPhone(rawInput)

    if (!membershipLookup && !phoneLookup) {
      return NextResponse.json(
        { error: 'Enter a valid Ghana phone number or membership ID (CG-XXXX-YYYY).' },
        { status: 400 }
      )
    }

    let userData: AppUser | null = null

    if (phoneLookup) {
      userData = await resolveUserByPhone(rawInput)
    }
    if (!userData && membershipLookup) {
      userData = await findUserByMembershipId(normalizedMembershipId)
    }

    if (!userData) {
      const checked = phoneLookup ? normalizePhone(rawInput) : normalizedMembershipId
      return NextResponse.json(
        {
          error: membershipLookup
            ? `No account matches ${checked}. Check the membership ID or sign in with the phone number on file.`
            : `No account matches ${checked}. Sign in with the phone number on file, or use your membership ID.`,
        },
        { status: 404 }
      )
    }

    if (!userData.auth_uid) {
      return NextResponse.json({ error: 'Account not properly set up' }, { status: 400 })
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        full_name: userData.full_name,
        role: userData.role,
        phone: userData.phone,
        auth_uid: userData.auth_uid,
        membership_id: userData.membership_id,
      },
    })

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    }

    response.cookies.set('firebase-auth-token', userData.auth_uid, cookieOptions)
    response.cookies.set('chms-role', userData.role, cookieOptions)
    response.cookies.set('chms-user-id', userData.id, cookieOptions)

    return response
  } catch (error) {
    console.error('Direct login error:', error)
    const message = error instanceof Error ? error.message : ''
    if (
      message.includes('CAMP_CONVEX_SERVER_SECRET') ||
      message.includes('NEXT_PUBLIC_CONVEX_URL') ||
      message === 'Unauthorized'
    ) {
      return NextResponse.json(
        { error: 'Login service is not configured correctly. Try again or use your membership ID.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
