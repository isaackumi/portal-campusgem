'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  type BirthdayEntry,
  type BirthdayTimeFilter,
  MONTH_NAMES,
  birthdaysToCsv,
  countBirthdaysInMonth,
  downloadBirthdaysCsv,
  filterBirthdaysByBirthMonth,
  filterBirthdaysByTime,
  formatBirthdayLabel,
  formatDaysUntilLabel,
  sortBirthdaysByCalendarDay,
  sortBirthdaysByUpcoming,
} from '@/lib/birthdays/upcoming-birthdays'
import { sendBirthdaySmsAction } from '@/lib/actions/birthdays'
import type { CommsModule } from '@/lib/comms/types'
import { isValidSmsPhone } from '@/lib/comms/sms-client'
import { useAuth } from '@/components/providers'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { PersonAvatar } from '@/components/ui/person'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Tabs, ScrollableTabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { Cake, Download, Mail, MessageSquare, Search } from 'lucide-react'

type UpcomingBirthdaysViewProps = {
  title: string
  subtitle: string
  entries: BirthdayEntry[]
  accentClass?: string
  /** Hubtel module for birthday SMS logging */
  smsModule?: CommsModule
}

export function UpcomingBirthdaysView({
  title,
  subtitle,
  entries,
  accentClass = 'text-brand-600 dark:text-brand-300',
  smsModule = 'church',
}: UpcomingBirthdaysViewProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [timeFilter, setTimeFilter] = useState<BirthdayTimeFilter>('next30')
  const [browseMonth, setBrowseMonth] = useState(() => new Date().getMonth() + 1)
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [sending, setSending] = useState(false)

  const stats = useMemo(() => {
    const today = filterBirthdaysByTime(entries, 'today').length
    const week = filterBirthdaysByTime(entries, 'week').length
    const next30 = filterBirthdaysByTime(entries, 'next30').length
    const currentMonth = countBirthdaysInMonth(entries, new Date().getMonth() + 1)
    return { today, week, next30, currentMonth, total: entries.length }
  }, [entries])

  const todayEntries = useMemo(() => filterBirthdaysByTime(entries, 'today'), [entries])
  const todaySmsReady = useMemo(
    () => todayEntries.filter((e) => isValidSmsPhone(e.phone)),
    [todayEntries]
  )

  const visibleEntries = useMemo(() => {
    let rows = entries
    if (timeFilter === 'browse_month') {
      rows = filterBirthdaysByBirthMonth(entries, browseMonth)
      rows = sortBirthdaysByCalendarDay(rows)
    } else {
      rows = filterBirthdaysByTime(entries, timeFilter)
      rows = sortBirthdaysByUpcoming(rows)
    }

    const needle = query.trim().toLowerCase()
    if (!needle) return rows

    return rows.filter(
      (entry) =>
        entry.name.toLowerCase().includes(needle) ||
        entry.phone?.includes(needle) ||
        entry.email?.toLowerCase().includes(needle) ||
        entry.membershipId?.toLowerCase().includes(needle)
    )
  }, [entries, timeFilter, browseMonth, query])

  const entryKey = (entry: BirthdayEntry) => `${entry.kind}-${entry.id}`

  function toggleSelected(entry: BirthdayEntry, checked: boolean) {
    const key = entryKey(entry)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function selectedEntriesFrom(list: BirthdayEntry[]) {
    return list.filter((e) => selectedIds.has(entryKey(e)))
  }

  async function sendSms(targets: BirthdayEntry[], label: string) {
    if (!user?.id) {
      toast({ variant: 'destructive', title: 'Sign in required' })
      return
    }
    const withPhone = targets.filter((e) => isValidSmsPhone(e.phone))
    if (!withPhone.length) {
      toast({
        variant: 'destructive',
        title: 'No valid phones',
        description: 'Selected people need a Ghana mobile number (024… / 233…).',
      })
      return
    }

    setSending(true)
    const { data, error } = await sendBirthdaySmsAction({
      sender_id: user.id,
      module: smsModule,
      entries: withPhone,
    })
    setSending(false)

    if (error || !data) {
      toast({
        variant: 'destructive',
        title: 'Birthday SMS failed',
        description: error ?? 'Unknown error',
      })
      return
    }

    toast({
      title:
        data.success_count > 0
          ? `Sent ${data.success_count} birthday SMS`
          : 'No messages delivered',
      variant: data.success_count > 0 ? 'default' : 'destructive',
      description: `${label}${data.error_count || data.skipped_count ? ` · ${data.error_count} failed, ${data.skipped_count} skipped` : ''}${
        data.batch_id ? ` · batch ${data.batch_id.slice(0, 8)}` : ''
      }`,
    })
    setSelectedIds(new Set())
  }

  function handleDownloadCsv() {
    const stamp = timeFilter === 'browse_month' ? `month-${browseMonth}` : timeFilter
    const csv = birthdaysToCsv(visibleEntries, `${title} birthdays`)
    downloadBirthdaysCsv(`birthdays-${stamp}.csv`, csv)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="app-page-title flex items-center gap-2">
            <Cake className={cn('h-6 w-6 shrink-0 sm:h-7 sm:w-7', accentClass)} aria-hidden />
            <span className="min-w-0">{title}</span>
          </h1>
          <p className="app-page-description mt-1 max-w-2xl">{subtitle}</p>
        </div>
        <Button
          variant="outline"
          className="h-11 w-full sm:h-10 sm:w-auto"
          onClick={handleDownloadCsv}
          disabled={visibleEntries.length === 0}
        >
          <Download className="mr-2 h-4 w-4" aria-hidden />
          Download CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Today" value={stats.today} tone={stats.today > 0 ? 'success' : 'default'} />
        <StatCard label="This week" value={stats.week} />
        <StatCard label="Next 30 days" value={stats.next30} />
        <StatCard label="Born this month" value={stats.currentMonth} />
        <StatCard label="Birthday on file" value={stats.total} className="col-span-2 lg:col-span-1" />
      </div>

      <section className="dashboard-panel p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10 dark:bg-brand-400/10 dark:text-brand-300 dark:ring-brand-400/20">
            <MessageSquare className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="app-section-title">Birthday SMS</h2>
            <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
              Sent automatically every day at 07:00 Ghana time. You can also send today&apos;s list or
              selected people now. Messages use {`{{firstName}}`} personalisation.
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Button
            type="button"
            className="h-11 sm:h-10"
            disabled={sending || todaySmsReady.length === 0}
            onClick={() => void sendSms(todaySmsReady, 'Today')}
            aria-label={`Send birthday SMS to ${todaySmsReady.length} people with birthdays today`}
          >
            <MessageSquare className="mr-2 h-4 w-4" aria-hidden />
            {sending ? 'Sending…' : `Today (${todaySmsReady.length})`}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 sm:h-10"
            disabled={sending || selectedIds.size === 0}
            onClick={() =>
              void sendSms(selectedEntriesFrom(visibleEntries), `${selectedIds.size} selected`)
            }
            aria-label="Send birthday SMS to selected people"
          >
            Selected ({selectedIds.size})
          </Button>
          <p className="col-span-2 text-xs text-neutral-500 dark:text-neutral-400 sm:ml-auto">
            {todayEntries.length - todaySmsReady.length > 0
              ? `${todayEntries.length - todaySmsReady.length} of today's birthdays have no valid phone`
              : todayEntries.length === 0
                ? 'No birthdays today'
                : 'All of today’s birthdays have a valid phone'}
          </p>
        </div>
      </section>

      <section className="dashboard-panel space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="app-section-title">Birthdays</h2>
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
            {visibleEntries.length} shown
            {timeFilter === 'browse_month' ? ` · all of ${MONTH_NAMES[browseMonth - 1]}` : ''}
          </p>
        </div>

        <Tabs
          value={timeFilter}
          onValueChange={(value) => setTimeFilter(value as BirthdayTimeFilter)}
          className="space-y-4"
        >
          <ScrollableTabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This week</TabsTrigger>
            <TabsTrigger value="next30">Next 30 days</TabsTrigger>
            <TabsTrigger value="browse_month">By month</TabsTrigger>
          </ScrollableTabsList>

          <TabsContent value="browse_month" className="space-y-4">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
              {MONTH_NAMES.map((label, index) => {
                const month = index + 1
                const count = countBirthdaysInMonth(entries, month)
                const isSelected = browseMonth === month
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setBrowseMonth(month)}
                    aria-pressed={isSelected}
                    className={cn(
                      'min-h-14 rounded-lg border px-2 py-1.5 text-left transition-colors',
                      isSelected
                        ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:border-brand-400 dark:bg-brand-400/10 dark:ring-brand-400'
                        : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-white/10 dark:bg-neutral-800/60 dark:hover:border-white/20'
                    )}
                  >
                    <p className="app-overline">{label.slice(0, 3)}</p>
                    <p className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-white">{count}</p>
                  </button>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>

        <div className="relative sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" aria-hidden />
          <Input
            type="search"
            className="h-11 pl-9 sm:h-10"
            placeholder="Search name, phone or membership ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search birthdays"
          />
        </div>

        {visibleEntries.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            {entries.length === 0
              ? 'No birthdays on file yet. Add a date of birth on member or visitor profiles.'
              : 'No matches for this filter.'}
          </p>
        ) : (
          <ul className="-mx-4 divide-y divide-neutral-100 border-t border-neutral-100 dark:divide-white/[0.06] dark:border-white/[0.06] sm:-mx-5">
            {visibleEntries.map((entry) => (
              <BirthdayRow
                key={entryKey(entry)}
                entry={entry}
                showUpcoming={timeFilter !== 'browse_month'}
                selected={selectedIds.has(entryKey(entry))}
                onSelectedChange={(checked) => toggleSelected(entry, checked)}
                smsReady={isValidSmsPhone(entry.phone)}
                sending={sending}
                onSendOne={() => void sendSms([entry], entry.name)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function BirthdayRow({
  entry,
  showUpcoming,
  selected,
  onSelectedChange,
  smsReady,
  sending,
  onSendOne,
}: {
  entry: BirthdayEntry
  showUpcoming: boolean
  selected: boolean
  onSelectedChange: (checked: boolean) => void
  smsReady: boolean
  sending: boolean
  onSendOne: () => void
}) {
  const isToday = entry.daysUntil === 0
  const checkboxId = `bday-${entry.kind}-${entry.id}`

  return (
    <li
      className={cn(
        'flex items-start gap-3 px-4 py-3 sm:items-center sm:px-5',
        isToday && showUpcoming && 'bg-emerald-50/60 dark:bg-emerald-400/[0.06]'
      )}
    >
      <label htmlFor={checkboxId} className="-m-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center sm:m-0 sm:h-auto sm:w-auto">
        <Checkbox
          id={checkboxId}
          checked={selected}
          disabled={!smsReady}
          onCheckedChange={(v) => onSelectedChange(v === true)}
          aria-label={`Select ${entry.name} for birthday SMS`}
        />
      </label>
      <PersonAvatar name={entry.name} seed={`${entry.kind}-${entry.id}`} className="hidden sm:inline-flex" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {entry.href ? (
            <Link
              href={entry.href}
              className="min-w-0 truncate text-sm font-medium text-neutral-900 hover:text-brand-600 dark:text-neutral-100 dark:hover:text-brand-300"
            >
              {entry.name}
            </Link>
          ) : (
            <p className="min-w-0 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{entry.name}</p>
          )}
          {isToday && showUpcoming ? (
            <Badge variant="success">
              <Cake className="h-3 w-3" aria-hidden />
              Today
            </Badge>
          ) : null}
          {entry.kind === 'visitor' ? <Badge variant="outline">Visitor</Badge> : null}
          {entry.congregation === 'both' ? <Badge variant="secondary">Campus Gem + RLC</Badge> : null}
          {!smsReady ? <Badge variant="warning">No SMS phone</Badge> : null}
        </div>
        <p className="mt-0.5 text-[13px] text-neutral-600 dark:text-neutral-400">
          {formatBirthdayLabel(entry)}
          {entry.ageTurning != null ? ` · turning ${entry.ageTurning}` : ''}
          {showUpcoming ? ` · ${formatDaysUntilLabel(entry.daysUntil)}` : ''}
          {entry.subtitle ? <span className="hidden sm:inline"> · {entry.subtitle}</span> : null}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
          {entry.phone ? <PhoneLink phone={entry.phone} name={entry.name} /> : null}
          {entry.membershipId ? <span className="font-mono">{entry.membershipId}</span> : null}
          {entry.email ? (
            <span className="hidden min-w-0 items-center gap-1 md:inline-flex">
              <Mail className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{entry.email}</span>
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 min-[400px]:flex-row min-[400px]:items-center">
        <QuickContactButtons phone={entry.phone} name={entry.name} />
        <button
          type="button"
          disabled={!smsReady || sending}
          onClick={onSendOne}
          aria-label={`Send birthday SMS to ${entry.name}`}
          title="Send birthday SMS"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700 transition-colors hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-sky-400/10 dark:text-sky-300 dark:hover:bg-sky-400/20 sm:h-9 sm:w-9"
        >
          <MessageSquare className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </li>
  )
}
