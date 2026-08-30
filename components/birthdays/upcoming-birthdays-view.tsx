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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, ScrollableTabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { Cake, Download, Mail, Phone, Search } from 'lucide-react'

type UpcomingBirthdaysViewProps = {
  title: string
  subtitle: string
  entries: BirthdayEntry[]
  accentClass?: string
}

export function UpcomingBirthdaysView({
  title,
  subtitle,
  entries,
  accentClass = 'text-primary',
}: UpcomingBirthdaysViewProps) {
  const [timeFilter, setTimeFilter] = useState<BirthdayTimeFilter>('next30')
  const [browseMonth, setBrowseMonth] = useState(() => new Date().getMonth() + 1)
  const [query, setQuery] = useState('')

  const stats = useMemo(() => {
    const today = filterBirthdaysByTime(entries, 'today').length
    const week = filterBirthdaysByTime(entries, 'week').length
    const next30 = filterBirthdaysByTime(entries, 'next30').length
    const currentMonth = countBirthdaysInMonth(entries, new Date().getMonth() + 1)
    return { today, week, next30, currentMonth, total: entries.length }
  }, [entries])

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

  function handleDownloadCsv() {
    const stamp = timeFilter === 'browse_month' ? `month-${browseMonth}` : timeFilter
    const csv = birthdaysToCsv(visibleEntries, `${title} birthdays`)
    downloadBirthdaysCsv(`birthdays-${stamp}.csv`, csv)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="app-page-title flex items-center gap-2">
          <Cake className={cn('h-7 w-7', accentClass)} />
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
          <Button variant="outline" size="sm" onClick={handleDownloadCsv} disabled={visibleEntries.length === 0}>
            <Download className="mr-2 h-4 w-4" />
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
                        'rounded-lg border px-2 py-2 text-left transition-colors',
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
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name, phone, membership ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
                <BirthdayRow key={`${entry.kind}-${entry.id}`} entry={entry} showUpcoming={timeFilter !== 'browse_month'} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function BirthdayRow({ entry, showUpcoming }: { entry: BirthdayEntry; showUpcoming: boolean }) {
  const isToday = entry.daysUntil === 0

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        isToday && showUpcoming ? 'border-pink-300 bg-pink-50/60' : 'bg-white'
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{entry.name}</p>
          {entry.kind === 'visitor' ? <Badge variant="outline">Visitor</Badge> : null}
          {entry.congregation === 'both' ? <Badge variant="secondary">Campus Gem + RLC</Badge> : null}
          {isToday && showUpcoming ? (
            <Badge className="bg-pink-600 hover:bg-pink-600">Today</Badge>
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
              <Phone className="h-3 w-3" />
              {entry.phone}
            </span>
          ) : null}
          {entry.email ? (
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {entry.email}
            </span>
          ) : null}
        </div>
      </div>
      {entry.href ? (
        <Button size="sm" variant="outline" asChild className="shrink-0">
          <Link href={entry.href}>Open profile</Link>
        </Button>
      ) : null}
    </div>
  )
}
