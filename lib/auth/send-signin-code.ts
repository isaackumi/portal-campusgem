import 'server-only'

import type { AppUser } from '@/lib/types'
import { SIGNIN_CODE_TTL_MS, buildSigninCodeSms, generateSigninCode, hashSigninCode } from '@/lib/auth/signin-code'
import { phoneTail } from '@/lib/auth/access-welcome'

export type SendCodeResult =
  | { ok: true; sentTo: string; resendInSeconds: number }
  | { ok: false; status: number; error: string; retryAfterSeconds?: number }

export function signinCodeSecret(): string {
  const secret = process.env.AUTH_CODE_SECRET || process.env.CAMP_CONVEX_SERVER_SECRET
  if (!secret) throw new Error('CAMP_CONVEX_SERVER_SECRET must be set')
  return secret
}

/** Make, store (hashed) and text a sign-in code. */
export async function sendSigninCode(user: AppUser, phone: string | null): Promise<SendCodeResult> {
  if (!phone) {
    return { ok: false, status: 400, error: 'There is no phone number on your account to text a code to. Ask an administrator to add one.' }
  }
  const { issueSigninCodeInConvex, discardSigninCodeInConvex } = await import('@/lib/convex/auth-bridge')
  const { sendSms } = await import('@/lib/comms/sms-client')
  const { siteOrigin } = await import('@/lib/site-url')

  const code = generateSigninCode()
  const issued = await issueSigninCodeInConvex({
    userId: user.id,
    codeHash: hashSigninCode(user.id, code, signinCodeSecret()),
    sentTo: phone,
    ttlMs: SIGNIN_CODE_TTL_MS,
  })
  if (!issued.ok) {
    const seconds = Math.max(1, Math.ceil(issued.retry_after_ms / 1000))
    return {
      ok: false,
      status: 429,
      retryAfterSeconds: seconds,
      error:
        issued.reason === 'wait'
          ? `A code was just sent. You can ask for another in ${seconds} seconds.`
          : `Too many codes requested. Try again in ${Math.ceil(seconds / 60)} minutes.`,
    }
  }

  const sms = await sendSms(phone, buildSigninCodeSms(code, siteOrigin()))
  if (!sms.success) {
    await discardSigninCodeInConvex(issued.id).catch(() => undefined)
    console.error('[sign-in code] SMS failed', sms.error)
    return { ok: false, status: 503, error: "We couldn't text your sign-in code just now. Try again in a minute, or contact your administrator." }
  }
  return { ok: true, sentTo: phoneTail(phone) ?? '', resendInSeconds: 45 }
}
