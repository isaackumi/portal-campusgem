import { NextRequest, NextResponse } from 'next/server'
import { runTodaysBirthdaySmsJob } from '@/lib/actions/birthdays'
import { runBirthdayHeadsUpJob } from '@/lib/actions/birthday-heads-up'
import { asSystem } from '@/lib/auth/action-guard'

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
 * Daily birthday SMS (Hubtel), plus the one-week heads-up to admins.
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
    // Authorised by CRON_SECRET above, not a user session.
    const result = await asSystem(() => runTodaysBirthdaySmsJob({ dry_run: dryRun, force }))
    // Admins: who has a birthday in one week (name, phone, campus / RLC / camper), for flyers.
    // Runs even when today's birthday texts are switched off; its own failure doesn't hide theirs.
    const headsUp = await asSystem(() => runBirthdayHeadsUpJob({ dry_run: dryRun })).catch((e: unknown) => ({
      data: null,
      error: e instanceof Error ? e.message : 'heads-up failed',
    }))
    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error, data: result.data, heads_up: headsUp }, { status: 500 })
    }
    return NextResponse.json({ ok: true, data: result.data, heads_up: headsUp })
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
