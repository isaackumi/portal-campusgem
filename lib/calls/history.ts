/**
 * Call history: every call made for a camp year, grouped by calling session (calls made outside a
 * session are grouped by day), and the numbers used to see how each caller is doing. Pure.
 */

export type CallKind = 'call' | 'change' | 'link'

export type CallRow = {
  id: string
  registration_id: string
  name: string
  phone: string | null
  /** Null when the person answered through their tap-to-confirm link. */
  caller_id: string | null
  /** call: a call placed; change: a result corrected without a call; link: they answered by link. */
  kind: CallKind
  outcome: string | null
  note: string | null
  at: number
  session_id: string | null
  /** When the caller was given this person (sessions only, from Nov 2026). */
  started_at: number | null
}

export type CallSessionInfo = {
  id: string
  title: string
  started_at: number
  ended_at: number | null
  status: string
  /** User ids of everyone who joined. */
  people: string[]
}

export const REACHED = new Set(['confirmed', 'maybe', 'declined'])

/** Grace either side of a session, for calls saved just before it started or after it ended. */
const SESSION_SLACK = 10 * 60_000

/**
 * The session a call belongs to: the one it was saved in, else (older calls) a session that was
 * running at the time and that the caller had joined.
 */
export function sessionOf(row: CallRow, sessions: readonly CallSessionInfo[], now = Date.now()): string | null {
  if (row.session_id && sessions.some((s) => s.id === row.session_id)) return row.session_id
  if (!row.caller_id) return null
  const hit = sessions.find(
    (s) =>
      row.at >= s.started_at - SESSION_SLACK &&
      row.at <= (s.ended_at ?? now) + SESSION_SLACK &&
      s.people.includes(row.caller_id!)
  )
  return hit?.id ?? null
}

/** Seconds from being given the person to saving what they said; null when unknown or implausible. */
export function callSeconds(row: Pick<CallRow, 'at' | 'started_at'>): number | null {
  if (!row.started_at) return null
  const s = Math.round((row.at - row.started_at) / 1000)
  return s > 0 && s <= 30 * 60 ? s : null
}

export type OutcomeCounts = { confirmed: number; maybe: number; declined: number; unreachable: number; other: number }

function emptyCounts(): OutcomeCounts {
  return { confirmed: 0, maybe: 0, declined: 0, unreachable: 0, other: 0 }
}

function count(counts: OutcomeCounts, outcome: string | null) {
  if (outcome === 'confirmed' || outcome === 'maybe' || outcome === 'declined' || outcome === 'unreachable') counts[outcome]++
  else counts.other++
}

export type CallGroup = {
  key: string
  kind: 'session' | 'day'
  title: string
  start: number
  end: number
  live: boolean
  callerIds: string[]
  counts: OutcomeCounts
  /** Newest first. */
  rows: CallRow[]
}

function dayKey(at: number): string {
  const d = new Date(at)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Sessions (with their calls) and, for calls outside any session, one group per day. Newest first. */
export function groupCalls(rows: readonly CallRow[], sessions: readonly CallSessionInfo[], now = Date.now()): CallGroup[] {
  const groups = new Map<string, CallGroup>()
  for (const row of rows) {
    const sid = sessionOf(row, sessions, now)
    const key = sid ? `s:${sid}` : `d:${dayKey(row.at)}`
    let g = groups.get(key)
    if (!g) {
      const s = sid ? sessions.find((x) => x.id === sid)! : null
      g = {
        key,
        kind: s ? 'session' : 'day',
        title: s ? s.title : 'Calls outside a session',
        start: s ? s.started_at : row.at,
        end: s ? s.ended_at ?? now : row.at,
        live: s ? s.status === 'live' : false,
        callerIds: [],
        counts: emptyCounts(),
        rows: [],
      }
      groups.set(key, g)
    }
    g.rows.push(row)
    if (g.kind === 'day') {
      g.start = Math.min(g.start, row.at)
      g.end = Math.max(g.end, row.at)
    }
    if (row.caller_id && !g.callerIds.includes(row.caller_id)) g.callerIds.push(row.caller_id)
    count(g.counts, row.outcome)
  }
  const list = Array.from(groups.values())
  for (const g of list) g.rows.sort((a, b) => b.at - a.at)
  return list.sort((a, b) => b.start - a.start)
}

export type CallerStats = {
  caller_id: string
  /** Calls placed (not corrections). */
  calls: number
  /** Different people they called. */
  people: number
  /** Calls where someone answered and gave an answer (coming, not sure, not coming). */
  reached: number
  counts: OutcomeCounts
  /** reached / calls, 0–1. */
  reachRate: number
  /** Average seconds per person, where known. */
  avgSeconds: number | null
  /** Typical minutes between one call and the next while working (median of gaps under 30 min). */
  paceMinutes: number | null
  sessions: number
  first: number
  last: number
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const v = [...values].sort((a, b) => a - b)
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid]! : (v[mid - 1]! + v[mid]!) / 2
}

/** One line per caller, most calls first. Answers by link are nobody's call and are left out. */
export function callerStats(rows: readonly CallRow[], sessions: readonly CallSessionInfo[], now = Date.now()): CallerStats[] {
  const by = new Map<string, CallRow[]>()
  for (const row of rows) {
    if (!row.caller_id || row.kind === 'link') continue
    by.set(row.caller_id, [...(by.get(row.caller_id) ?? []), row])
  }
  const out: CallerStats[] = []
  for (const [caller_id, list] of Array.from(by.entries())) {
    const calls = list.filter((r) => r.kind === 'call').sort((a, b) => a.at - b.at)
    const counts = emptyCounts()
    for (const r of calls) count(counts, r.outcome)
    const reached = calls.filter((r) => r.outcome && REACHED.has(r.outcome)).length
    const secs = calls.map(callSeconds).filter((s): s is number => s !== null)
    const gaps: number[] = []
    for (let i = 1; i < calls.length; i++) {
      const gap = (calls[i]!.at - calls[i - 1]!.at) / 60_000
      if (gap > 0 && gap < 30) gaps.push(gap)
    }
    const sessionIds = new Set(list.map((r) => sessionOf(r, sessions, now)).filter(Boolean))
    const all = list.map((r) => r.at)
    out.push({
      caller_id,
      calls: calls.length,
      people: new Set(calls.map((r) => r.registration_id)).size,
      reached,
      counts,
      reachRate: calls.length ? reached / calls.length : 0,
      avgSeconds: secs.length ? Math.round(secs.reduce((a, b) => a + b, 0) / secs.length) : null,
      paceMinutes: median(gaps),
      sessions: sessionIds.size,
      first: Math.min(...all),
      last: Math.max(...all),
    })
  }
  return out.sort((a, b) => b.calls - a.calls || b.reached - a.reached)
}

/** "4m 05s", "45s". */
export function formatSeconds(s: number | null): string {
  if (s === null) return '—'
  const m = Math.floor(s / 60)
  const r = s % 60
  return m ? `${m}m ${String(r).padStart(2, '0')}s` : `${r}s`
}

const OUTCOME_TEXT: Record<string, string> = {
  confirmed: 'Coming',
  maybe: 'Not sure',
  declined: 'Not coming',
  unreachable: 'No answer',
  unconfirmed: 'Reset',
}

export function outcomeText(outcome: string | null): string {
  return (outcome && OUTCOME_TEXT[outcome]) || 'Note'
}

/** CSV of the calls, oldest first. */
export function callsCsv(rows: readonly CallRow[], callerName: (id: string | null) => string, sessionTitle: (row: CallRow) => string): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const head = ['Date', 'Time', 'Caller', 'Person', 'Phone', 'Result', 'Note', 'Seconds', 'Session', 'Kind']
  const lines = [...rows]
    .sort((a, b) => a.at - b.at)
    .map((r) => {
      const d = new Date(r.at)
      return [
        d.toISOString().slice(0, 10),
        d.toTimeString().slice(0, 5),
        callerName(r.caller_id),
        r.name,
        r.phone ?? '',
        outcomeText(r.outcome),
        r.note ?? '',
        String(callSeconds(r) ?? ''),
        sessionTitle(r),
        r.kind === 'link' ? 'Answered by link' : r.kind === 'change' ? 'Corrected' : 'Call',
      ]
        .map(esc)
        .join(',')
    })
  return [head.join(','), ...lines].join('\n')
}
