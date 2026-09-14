import { NextResponse } from 'next/server'
import { getSmsProviderStatus } from '@/lib/comms/sms-client'

/** Diagnostic endpoint — never returns secret values, only presence. */
export async function GET() {
  const status = getSmsProviderStatus()
  return NextResponse.json({
    ok: status.configured,
    provider: status.provider,
    configured: status.configured,
    senderId: status.senderId,
    environment: status.environment,
    missingKeys: status.missingKeys,
    envPresence: status.envPresence,
    hint: status.configured
      ? 'Hubtel credentials are visible to this deployment.'
      : 'Add the missing keys in Vercel Project Settings → Environment Variables (Production + Preview), then Redeploy.',
  })
}
