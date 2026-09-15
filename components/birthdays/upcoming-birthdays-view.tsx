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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Tabs, ScrollableTabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { Cake, Download, Mail, MessageSquare, Phone, Search } from 'lucide-react'

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
  accentClass = 'text-primary',
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
      <div>
        <h1 className="app-page-title flex items-center gap-2">
          <Cake className={cn('h-7 w-7', accentClass)} aria-hidden />
          {title}
        </h1>
        <p className="app-page-description mt-1">{subtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-pink-600">{stats.today}</p>
            <p className="text-sm text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-rose-600">{stats.week}</p>
            <p className="text-sm text-muted-foreground">This week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-violet-600">{stats.next30}</p>
            <p className="text-sm text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-blue-600">{stats.currentMonth}</p>
            <p className="text-sm text-muted-foreground">Born this calendar month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
            <p className="text-sm text-muted-foreground">With birthday on file</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-pink-200/80 bg-gradient-to-br from-pink-50/80 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-pink-700" aria-hidden />
            Birthday SMS (Hubtel)
          </CardTitle>
          <CardDescription>
            Auto-sends daily at 07:00 Ghana time via cron. You can also send today&apos;s list or
            selected rows manually. Uses {`{{firstName}}`} personalization.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            className="min-h-11 cursor-pointer"
            disabled={sending || todaySmsReady.length === 0}
            onClick={() => void sendSms(todaySmsReady, 'Today')}
            aria-label={`Send birthday SMS to ${todaySmsReady.length} people with birthdays today`}
          >
            <MessageSquare className="mr-2 h-4 w-4" aria-hidden />
            {sending ? 'Sending…' : `SMS today (${todaySmsReady.length})`}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 cursor-pointer"
            disabled={sending || selectedIds.size === 0}
            onClick={() =>
              void sendSms(selectedEntriesFrom(visibleEntries), `${selectedIds.size} selected`)
            }
            aria-label="Send birthday SMS to selected people"
          >
            SMS selected ({selectedIds.size})
          </Button>
          <p className="text-xs text-muted-foreground sm:ml-auto">
            {todayEntries.length - todaySmsReady.length > 0
              ? `${todayEntries.length - todaySmsReady.length} today missing/invalid phone`
              : todayEntries.length === 0
                ? 'No birthdays today'
                : 'All of today’s birthdays have a valid phone'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Birthdays</CardTitle>
            <CardDescription>
              {visibleEntries.length} shown
              {timeFilter === 'browse_month'
                ? ` · all ${MONTH_NAMES[browseMonth - 1]} birthdays`
                : ''}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="min-h-10 cursor-pointer"
            onClick={handleDownloadCsv}
            disabled={visibleEntries.length === 0}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden />
            Download CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={timeFilter}
            onValueChange={(value) => setTimeFilter(value as BirthdayTimeFilter)}
            className="space-y-4"
          >
            <ScrollableTabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This week</TabsTrigger>
              <TabsTrigger value="next30">Next 30 days</TabsTrigger>
              <TabsTrigger value="browse_month">Browse by month</TabsTrigger>
            </ScrollableTabsList>

            <TabsContent value="browse_month" className="space-y-4">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {MONTH_NAMES.map((label, index) => {
                  const month = index + 1
                  const count = countBirthdaysInMonth(entries, month)
                  const isSelected = browseMonth === month
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setBrowseMonth(month)}
                      className={cn(
                        'min-h-14 cursor-pointer rounded-lg border px-2 py-2 text-left transition-colors duration-200',
                        isSelected
                          ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-200'
                          : 'border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50/50'
                      )}
                    >
                      <p className="text-xs font-semibold text-slate-900">{label.slice(0, 3)}</p>
                      <p className="text-lg font-bold text-slate-800">{count}</p>
                    </button>
                  )
                })}
              </div>
            </TabsContent>
          </Tabs>

          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              className="h-11 pl-9"
              placeholder="Search name, phone, membership ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search birthdays"
            />
          </div>

          {visibleEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {entries.length === 0
                ? 'No birthdays on file yet. Add date of birth on member or visitor profiles.'
                : 'No matches for this filter.'}
            </p>
          ) : (
            <div className="space-y-2">
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
            </div>
          )}
        </CardContent>
      </Card>
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

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        isToday && showUpcoming ? 'border-pink-300 bg-pink-50/60' : 'bg-white'
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Checkbox
          checked={selected}
          disabled={!smsReady}
          onCheckedChange={(v) => onSelectedChange(v === true)}
          className="mt-1"
          aria-label={`Select ${entry.name} for birthday SMS`}
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{entry.name}</p>
            {entry.kind === 'visitor' ? <Badge variant="outline">Visitor</Badge> : null}
            {entry.congregation === 'both' ? (
              <Badge variant="secondary">Campus Gem + RLC</Badge>
            ) : null}
            {isToday && showUpcoming ? (
              <Badge className="bg-pink-600 hover:bg-pink-600">Today</Badge>
            ) : null}
            {!smsReady ? (
              <Badge variant="outline" className="text-amber-800">
                No SMS phone
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatBirthdayLabel(entry)}
            {entry.ageTurning != null ? ` · turning ${entry.ageTurning}` : ''}
            {showUpcoming ? ` · ${formatDaysUntilLabel(entry.daysUntil)}` : ''}
            {entry.subtitle ? ` · ${entry.subtitle}` : ''}
          </p>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {entry.membershipId ? <span>{entry.membershipId}</span> : null}
            {entry.phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" aria-hidden />
                {entry.phone}
              </span>
            ) : null}
            {entry.email ? (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" aria-hidden />
                {entry.email}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-10 cursor-pointer"
          disabled={!smsReady || sending}
          onClick={onSendOne}
          aria-label={`Send birthday SMS to ${entry.name}`}
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          SMS
        </Button>
        {entry.href ? (
          <Button size="sm" variant="outline" asChild className="min-h-10 cursor-pointer">
            <Link href={entry.href}>Open profile</Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
