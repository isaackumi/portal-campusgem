import { NextRequest, NextResponse } from 'next/server'
import { applySessionCookies, toSessionPayload } from '@/lib/auth/server-session'
import { loginErrorResponse, lookupLoginUser } from '@/lib/auth/login-lookup'
import { requiresSigninCode } from '@/lib/auth/signin-code'
import { sendSigninCode } from '@/lib/auth/send-signin-code'

/**
 * Step 1 of sign-in. Members go straight in. People with more access (see
 * AUTH_SIGNIN_CODES) are texted a 6-digit code instead and finish at
 * /api/auth/verify-code. Calling this again resends the code (rate limited).
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.CAMP_CONVEX_SERVER_SECRET) {
      return NextResponse.json({ error: 'Convex is not configured for authentication' }, { status: 503 })
    }

    const { phoneOrId } = await request.json()
    const found = await lookupLoginUser(phoneOrId)
    if (!found.ok) return NextResponse.json({ error: found.error }, { status: found.status })

    if (requiresSigninCode(found.user)) {
      const sent = await sendSigninCode(found.user, found.codePhone)
      if (!sent.ok) {
        return NextResponse.json(
          { error: sent.error, retryAfterSeconds: sent.retryAfterSeconds },
          { status: sent.status }
        )
      }
      return NextResponse.json({ codeRequired: true, sentTo: sent.sentTo, resendInSeconds: sent.resendInSeconds })
    }

    const response = NextResponse.json({ success: true, user: toSessionPayload(found.user) })
    applySessionCookies(response, found.user)
    return response
  } catch (error) {
    console.error('Direct login error:', error)
    const { status, error: message } = loginErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
