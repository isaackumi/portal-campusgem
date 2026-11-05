import { NextRequest, NextResponse } from 'next/server'
import { applySessionCookies, toSessionPayload } from '@/lib/auth/server-session'
import { loginErrorResponse, lookupLoginUser } from '@/lib/auth/login-lookup'
import { hashSigninCode, normalizeCodeInput } from '@/lib/auth/signin-code'
import { signinCodeSecret } from '@/lib/auth/send-signin-code'

/** Step 2 of sign-in for people who were texted a code. */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.CAMP_CONVEX_SERVER_SECRET) {
      return NextResponse.json({ error: 'Convex is not configured for authentication' }, { status: 503 })
    }

    const { phoneOrId, code } = await request.json()
    const digits = normalizeCodeInput(code)
    if (!digits) return NextResponse.json({ error: 'Enter the 6-digit code from the text.' }, { status: 400 })

    const found = await lookupLoginUser(phoneOrId)
    if (!found.ok) return NextResponse.json({ error: found.error }, { status: found.status })

    const { verifySigninCodeInConvex } = await import('@/lib/convex/auth-bridge')
    const result = await verifySigninCodeInConvex(found.user.id, hashSigninCode(found.user.id, digits, signinCodeSecret()))
    if (!result.ok) {
      const error =
        result.reason === 'wrong'
          ? `That code isn't right. ${result.attempts_left} ${result.attempts_left === 1 ? 'try' : 'tries'} left.`
          : result.reason === 'expired'
            ? 'That code has expired. Send a new one.'
            : result.reason === 'locked'
              ? 'Too many wrong tries. Send a new code.'
              : 'No active code. Send a new one.'
      return NextResponse.json(
        { error, reason: result.reason, attemptsLeft: result.attempts_left },
        { status: result.reason === 'wrong' ? 401 : 410 }
      )
    }

    const response = NextResponse.json({ success: true, user: toSessionPayload(found.user) })
    applySessionCookies(response, found.user)
    return response
  } catch (error) {
    console.error('Verify code error:', error)
    const { status, error: message } = loginErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
