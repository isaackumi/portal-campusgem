import { NextResponse } from 'next/server'
import { getSmsProviderStatus } from '@/lib/comms/sms-client'

/** Diagnostic endpoint — never returns secret values, only presence. */
export async function GET() {
  const status = getSmsProviderStatus()
  const registrationSmsFlag = process.env.CAMP_REGISTRATION_SMS_ENABLED?.trim().toLowerCase() ?? null
  return NextResponse.json({
    ok: status.configured,
    provider: status.provider,
    configured: status.configured,
    senderId: status.senderId,
    environment: status.environment,
    missingKeys: status.missingKeys,
    envPresence: status.envPresence,
    registrationSms: {
      enabledFlag: registrationSmsFlag,
      defaultRule: 'send when camp year >= 2026 unless CAMP_REGISTRATION_SMS_ENABLED=false',
    },
    hint: status.configured
      ? 'Hubtel credentials are visible to this deployment.'
      : 'Add the missing keys in Vercel Project Settings → Environment Variables (Production + Preview), then Redeploy.',
  })
}
