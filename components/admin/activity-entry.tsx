'use client'

import Link from 'next/link'
import { AlertTriangle, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { categoryMeta } from '@/lib/activity/describe'
import type { ActivityRow } from '@/lib/actions/activity'

const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const fullTime = (at: number) =>
  new Date(at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })

/** "Signed in" reads as "Kofi signed in"; names inside the sentence stay capitalised. */
function lowerFirst(text: string): string {
  return text && /^[A-Z][a-z]/.test(text) ? text[0]!.toLowerCase() + text.slice(1) : text
}

/** Where an entry's subject lives in the app, when it has a page. */
function targetHref(row: ActivityRow): string | null {
  if (!row.target_id) return null
  if (row.target_type === 'group') return `/groups/${row.target_id}`
  if (row.target_type === 'form') return `/admin/forms/${row.target_id}`
  return null
}

const TARGET_WORDS: Record<string, string> = {
  member: 'Member',
  user: 'Person',
  group: 'Group',
  form: 'Form',
  camp_registration: 'Camp registration',
  message_template: 'Message',
}

type Fact = [string, React.ReactNode]

/** One activity entry: a quiet line, and the full record when opened. */
export function ActivityEntry({ row, open, onToggle, onOnlyThisPerson }: { row: ActivityRow; open: boolean; onToggle: () => void; onOnlyThisPerson?: () => void }) {
  const failed = row.outcome === 'failed'
  const area = categoryMeta(row.category).label
  const href = targetHref(row)
  const facts: Fact[] = [
    ['When', fullTime(row.at)],
    ['Area', area],
    ['Result', failed ? 'Failed' : 'Done'],
    ['Who', row.actor_name ?? 'Nobody signed in'],
  ]
  if (row.target_label || row.target_type) {
    facts.push([
      TARGET_WORDS[row.target_type ?? ''] ?? 'About',
      href ? (
        <Link href={href} className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-300">
          {row.target_label ?? 'Open'}
        </Link>
      ) : (
        row.target_label ?? '—'
      ),
    ])
  }
  if (row.device) facts.push(['Device', row.device])
  if (row.ip) facts.push(['IP address', <span key="ip" className="font-mono text-[13px]">{row.ip}</span>])
  for (const d of row.details ?? []) facts.push([d.key.charAt(0).toUpperCase() + d.key.slice(1), d.value])
  facts.push(['Event', <span key="ev" className="font-mono text-[12px] text-neutral-500 dark:text-neutral-400">{row.action}</span>])

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none dark:hover:bg-white/[0.03] dark:focus-visible:bg-white/[0.03]',
          open && 'bg-neutral-50 dark:bg-white/[0.03]'
        )}
      >
        <span className="w-[4.25rem] shrink-0 pt-px font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{time(row.at)}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-snug text-neutral-800 dark:text-neutral-200 sm:text-sm">
            {row.actor_name ? <span className="font-semibold text-neutral-900 dark:text-neutral-50">{row.actor_name} </span> : null}
            {row.actor_name ? lowerFirst(row.summary) : row.summary}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[13px] text-neutral-500 dark:text-neutral-400">
            {failed ? (
              <>
                <span className="inline-flex items-center gap-1 font-medium text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                  Failed
                </span>
                <span aria-hidden>·</span>
              </>
            ) : null}
            <span>{area}</span>
            {row.device ? <span className="max-sm:hidden">· {row.device}</span> : null}
          </span>
        </span>
        <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-neutral-400 transition-transform dark:text-neutral-500', open && 'rotate-180')} aria-hidden />
      </button>
      {open ? (
        <div className="px-4 pb-4 sm:pl-[6rem]">
          <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-neutral-900 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-x-6 sm:gap-y-2.5">
            {facts.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="pt-px text-[13px] text-neutral-500 dark:text-neutral-400">{label}</dt>
                <dd className="min-w-0 break-words text-neutral-900 dark:text-neutral-100">{value}</dd>
              </div>
            ))}
          </dl>
          {onOnlyThisPerson ? (
            <Button variant="ghost" className="mt-2 h-10 px-2 text-brand-700 dark:text-brand-300" onClick={onOnlyThisPerson}>
              Show only {row.actor_name ? `${row.actor_name.split(/\s+/)[0]}’s` : 'their'} activity
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
