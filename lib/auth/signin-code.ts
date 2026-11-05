import { createHmac, randomInt } from 'node:crypto'

/** How long a texted code works. */
export const SIGNIN_CODE_TTL_MS = 10 * 60 * 1000

export { requiresSigninCode, signinCodeMode, type SigninCodeMode } from '@/lib/auth/signin-policy'

export function generateSigninCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/** Codes are stored hashed and bound to the person, so a leaked row is useless. */
export function hashSigninCode(userId: string, code: string, secret: string): string {
  return createHmac('sha256', secret).update(`signin:${userId}:${code}`).digest('hex')
}

export function normalizeCodeInput(input: unknown): string | null {
  const digits = String(input ?? '').replace(/\D/g, '')
  return digits.length === 6 ? digits : null
}

/**
 * Code first so it shows in the notification preview. The last line lets Android
 * Chrome offer to fill it in (WebOTP); it is only added for an https origin.
 */
export function buildSigninCodeSms(code: string, origin: string): string {
  const lines = [`${code} is your Campus Gem sign-in code. It expires in 10 minutes. Never share it.`]
  try {
    const url = new URL(origin)
    if (url.protocol === 'https:') lines.push('', `@${url.host} #${code}`)
  } catch {
    /* no origin line */
  }
  return lines.join('\n')
}
