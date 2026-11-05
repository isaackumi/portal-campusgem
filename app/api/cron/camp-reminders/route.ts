import { NextRequest, NextResponse } from 'next/server'
import { runCampRemindersJob } from '@/lib/actions/camp-reminders'
import { asSystem } from '@/lib/auth/action-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Bulk Hubtel sends within one cron invocation; the job stops itself at ~50s. */
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
 * Daily camp reminders (Hubtel), 7 days and 1 day before the active camp year starts.
 * Vercel Cron: GET /api/cron/camp-reminders with Authorization: Bearer CRON_SECRET
 * Manual: ?dry_run=1&secret=...  (optional &stage=7d|1d to force a stage)
 */
export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = req.nextUrl.searchParams.get('dry_run') === '1'
  const stageParam = req.nextUrl.searchParams.get('stage')
  const stage = stageParam === '7d' || stageParam === '1d' ? stageParam : undefined

  try {
    // Authorised by CRON_SECRET above, not a user session.
    const result = await asSystem(() => runCampRemindersJob({ dry_run: dryRun, stage }))
    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error, data: result.data }, { status: 500 })
    }
    console.info('[cron/camp-reminders]', JSON.stringify(result.data))
    return NextResponse.json({ ok: true, data: result.data })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Camp reminders cron failed',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
