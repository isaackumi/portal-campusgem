import { NextRequest, NextResponse } from 'next/server'
import { runTodaysBirthdaySmsJob } from '@/lib/actions/birthdays'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Allow bulk Hubtel sends within one cron invocation. */
export const maxDuration = 60

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    // Refuse in production without secret; allow dry-run locally
    return process.env.VERCEL_ENV !== 'production' && process.env.NODE_ENV !== 'production'
  }
  const auth = req.headers.get('authorization') || ''
  if (auth === `Bearer ${secret}`) return true
  const urlSecret = req.nextUrl.searchParams.get('secret')
  return urlSecret === secret
}

/**
 * Daily birthday SMS (Hubtel).
 * Vercel Cron: GET /api/cron/birthday-sms with Authorization: Bearer CRON_SECRET
 * Manual: ?dry_run=1&force=1&secret=...
 */
export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = req.nextUrl.searchParams.get('dry_run') === '1'
  const force = req.nextUrl.searchParams.get('force') === '1'

  try {
    const result = await runTodaysBirthdaySmsJob({ dry_run: dryRun, force })
    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error, data: result.data }, { status: 500 })
    }
    return NextResponse.json({ ok: true, data: result.data })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Birthday SMS cron failed',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
