import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase/server'
import { normalizeMembershipId, isValidPhone } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { phoneOrId, action } = await request.json()

    if (!phoneOrId || !action) {
      return NextResponse.json(
        { error: 'Phone number or membership ID and action are required' },
        { status: 400 }
      )
    }

    let phone = phoneOrId.trim()
    let userId: string | null = null

    if (phoneOrId.toUpperCase().includes('EA')) {
      const normalizedId = normalizeMembershipId(phoneOrId)
      const usersSnap = await db
        .collection('users')
        .where('membershipId', '==', normalizedId)
        .limit(1)
        .get()

      if (usersSnap.empty) {
        return NextResponse.json({ error: 'Membership ID not found' }, { status: 404 })
      }

      const userData = usersSnap.docs[0].data()
      const userPhone = userData.phone
      if (!userPhone) {
        return NextResponse.json(
          { error: 'No phone number associated with this membership ID' },
          { status: 400 }
        )
      }
      phone = userPhone
      userId = usersSnap.docs[0].id
    } else {
      if (!isValidPhone(phone)) {
        return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
      }
      if (phone.startsWith('0')) {
        phone = '+233' + phone.slice(1)
      } else if (!phone.startsWith('+')) {
        phone = '+233' + phone
      }

      const usersSnap = await db
        .collection('users')
        .where('phone', '==', phone)
        .limit(1)
        .get()

      if (usersSnap.empty) {
        return NextResponse.json({ error: 'Phone number not found in system' }, { status: 404 })
      }
      userId = usersSnap.docs[0].id
    }

    if (action === 'send') {
      return NextResponse.json(
        {
          error: 'OTP via SMS is not configured. Use Firebase Phone Auth or another provider.',
          code: 'OTP_NOT_CONFIGURED'
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
