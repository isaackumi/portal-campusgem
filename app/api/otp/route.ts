import { NextRequest, NextResponse } from 'next/server'
import { normalizeMembershipId, isValidPhone } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.CAMP_CONVEX_SERVER_SECRET) {
      return NextResponse.json({ error: 'OTP service is not configured' }, { status: 503 })
    }

    const { phoneOrId, action } = await request.json()

    if (!phoneOrId || !action) {
      return NextResponse.json(
        { error: 'Phone number or membership ID and action are required' },
        { status: 400 }
      )
    }

    const { findUserByMembershipIdFromConvex, findUserByPhoneFromConvex } = await import(
      '@/lib/convex/core-bridge'
    )

    let phone = String(phoneOrId).trim()
    let userId: string | null = null

    if (String(phoneOrId).toUpperCase().includes('EA')) {
      const normalizedId = normalizeMembershipId(phoneOrId)
      const user = await findUserByMembershipIdFromConvex(normalizedId)
      if (!user) {
        return NextResponse.json({ error: 'Membership ID not found' }, { status: 404 })
      }
      if (!user.phone) {
        return NextResponse.json(
          { error: 'No phone number associated with this membership ID' },
          { status: 400 }
        )
      }
      phone = user.phone
      userId = user.id
    } else {
      if (!isValidPhone(phone)) {
        return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
      }
      if (phone.startsWith('0')) {
        phone = '+233' + phone.slice(1)
      } else if (!phone.startsWith('+')) {
        phone = '+233' + phone
      }

      const user = await findUserByPhoneFromConvex(phone)
      if (!user) {
        return NextResponse.json({ error: 'Phone number not found in system' }, { status: 404 })
      }
      userId = user.id
    }

    void userId

    if (action === 'send') {
      return NextResponse.json(
        {
          error: 'OTP via SMS is not configured. Wire an SMS provider or use direct login.',
          code: 'OTP_NOT_CONFIGURED',
        },
        { status: 501 }
      )
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('OTP API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
