import { NextRequest, NextResponse } from 'next/server'
import { asSystem } from '@/lib/auth/action-guard'
import {
  bearerToken,
  entriesToRecord,
  inboundAction,
  inboundSecretOk,
  parseInboundSms,
} from '@/lib/comms/inbound'
import { normalizeSmsPhone } from '@/lib/comms/sms-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Incoming SMS replies (Hubtel 2-way SMS / any provider).
 *
 * Configure at the provider: https://<site>/api/sms/inbound?secret=<SMS_INBOUND_SECRET>
 * (GET with query params, or POST JSON / form). `Authorization: Bearer <secret>` also works.
 * Without SMS_INBOUND_SECRET the endpoint refuses everything in production.
 */
function isProduction(): boolean {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
}

function authorized(req: NextRequest): boolean {
  return inboundSecretOk({
    configured: process.env.SMS_INBOUND_SECRET,
    provided: req.nextUrl.searchParams.get('secret') ?? bearerToken(req.headers.get('authorization')),
    isProduction: isProduction(),
  })
}

async function readPayload(req: NextRequest): Promise<Record<string, unknown>> {
  const query = entriesToRecord(req.nextUrl.searchParams.entries())
  delete query.secret
  if (req.method !== 'POST') return query
  const type = req.headers.get('content-type') ?? ''
  try {
    if (type.includes('application/json')) {
      const body = await req.json()
      return body && typeof body === 'object' && !Array.isArray(body) ? { ...query, ...(body as Record<string, unknown>) } : query
    }
    if (type.includes('form')) {
      const form = await req.formData()
      return { ...query, ...entriesToRecord(form.entries()) }
    }
    const text = await req.text()
    if (text.trim().startsWith('{')) return { ...query, ...(JSON.parse(text) as Record<string, unknown>) }
    return { ...query, ...entriesToRecord(new URLSearchParams(text).entries()) }
  } catch {
    return query
  }
}

async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json({ ok: false, error: 'Database is not configured' }, { status: 503 })
  }

  const sms = parseInboundSms(await readPayload(req))
  // 200 on junk so the provider doesn't retry forever.
  if (!sms) return NextResponse.json({ ok: false, error: 'No sender or message' }, { status: 200 })

  try {
    const result = await asSystem(async () => {
      const { matchSmsSenderFromConvex, recordInboundSmsInConvex } = await import('@/lib/convex/inbox-bridge')
      const phone = normalizeSmsPhone(sms.from) || sms.from
      const match = await matchSmsSenderFromConvex(phone)
      const action = inboundAction(sms.body, { isCampRegistrant: Boolean(match.camp_registration_id) })
      return recordInboundSmsInConvex({
        from: sms.from,
        phone,
        to: sms.to,
        body: sms.body,
        provider_message_id: sms.provider_message_id,
        keyword: action.keyword ?? undefined,
        tags: action.tags,
        opt_out: action.optOut,
      })
    })
    return NextResponse.json({ ok: true, duplicate: result.duplicate })
  } catch (error) {
    console.error('[sms/inbound] failed', error)
    // 500 lets the provider retry; provider_message_id dedupes the retry.
    return NextResponse.json({ ok: false, error: 'Could not store message' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
