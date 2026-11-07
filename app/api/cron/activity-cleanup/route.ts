import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Keep this many days of activity; older entries are removed (ACTIVITY_RETENTION_DAYS, default 365). */
const DEFAULT_RETENTION_DAYS = 365

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return process.env.VERCEL_ENV !== 'production' && process.env.NODE_ENV !== 'production'
  const auth = req.headers.get('authorization') || ''
  return auth === `Bearer ${secret}` || req.nextUrl.searchParams.get('secret') === secret
}

/**
 * Monthly: remove activity older than the retention period, in batches until done or near the time
 * limit (the next run carries on). Vercel Cron: GET with Authorization: Bearer CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const secret = process.env.CAMP_CONVEX_SERVER_SECRET
  if (!secret || !process.env.NEXT_PUBLIC_CONVEX_URL) return NextResponse.json({ ok: false, error: 'Convex is not configured' }, { status: 503 })
  const days = Number(process.env.ACTIVITY_RETENTION_DAYS) > 0 ? Number(process.env.ACTIVITY_RETENTION_DAYS) : DEFAULT_RETENTION_DAYS
  const cutoff = Date.now() - days * 86_400_000
  const { getConvexHttpClient } = await import('@/lib/convex/http-client')
  const { api } = await import('@/convex/_generated/api')
  const client = getConvexHttpClient()
  const started = Date.now()
  let deleted = 0
  let more = true
  while (more && Date.now() - started < 45_000) {
    const res = await client.mutation(api.activity.pruneBeforeWithSecret, { secret, cutoff, limit: 400 })
    deleted += res.deleted
    more = res.more
  }
  return NextResponse.json({ ok: true, retention_days: days, deleted, more })
}
