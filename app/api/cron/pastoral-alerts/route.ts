import { NextRequest, NextResponse } from 'next/server'
import { runPastoralCareJob } from '@/lib/actions/pastoral-care'
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
 * Weekly (Monday) missed-church alerts + leader summary: one text per group leader.
 * Sends nothing until an admin has saved the settings on /admin/pastoral-care.
 * Vercel Cron: GET /api/cron/pastoral-alerts with Authorization: Bearer CRON_SECRET
 * Manual: ?dry_run=1&secret=...
 */
export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = req.nextUrl.searchParams.get('dry_run') === '1'

  try {
    // Authorised by CRON_SECRET above, not a user session.
    const result = await asSystem(() => runPastoralCareJob({ dry_run: dryRun }))
    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error, data: result.data }, { status: 500 })
    }
    const { messages: _messages, ...summary } = result.data ?? ({} as NonNullable<typeof result.data>)
    console.info('[cron/pastoral-alerts]', JSON.stringify(summary))
    return NextResponse.json({ ok: true, data: result.data })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Pastoral alerts cron failed',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
