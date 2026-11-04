'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { loadRlcAttendanceAction, loadRlcCustomServicesAction } from '@/lib/actions/rlc'
import {
  buildCalendarMonthGrid,
  calendarLegendItems,
  groupSessionsByDate,
  monthDateBounds,
  summarizeAttendanceSessions,
  type RlcCalendarSessionSummary,
} from '@/lib/rlc/attendance-calendar'
import { printQueryFromSelection, rlcServiceSelectionLabel } from '@/lib/rlc/service-selection'
import type { Attendance, RlcCustomService } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, CalendarDays, Printer } from 'lucide-react'
import type { RlcServiceSelection } from '@/lib/rlc/service-selection'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type RlcAttendanceCalendarViewProps = {
  onOpenSession: (serviceDate: string, selection: RlcServiceSelection) => void
}

export function RlcAttendanceCalendarView({ onOpenSession }: RlcAttendanceCalendarViewProps) {
  const today = new Date()
  const [monthCursor, setMonthCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }))
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [customServices, setCustomServices] = useState<RlcCustomService[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const bounds = useMemo(
    () => monthDateBounds(monthCursor.year, monthCursor.month),
    [monthCursor]
  )

  const reload = useCallback(async () => {
    setLoading(true)
    const [attendanceResult, customResult] = await Promise.all([
      loadRlcAttendanceAction({ fromDate: bounds.from, toDate: bounds.to, limit: 1500 }),
      loadRlcCustomServicesAction(),
    ])
    setAttendance(attendanceResult.data ?? [])
    setCustomServices(customResult.data ?? [])
    setLoading(false)
  }, [bounds.from, bounds.to])

  useEffect(() => {
    void reload()
  }, [reload])

  const sessions = useMemo(
    () => summarizeAttendanceSessions(attendance, customServices),
    [attendance, customServices]
  )

  const sessionsByDate = useMemo(() => groupSessionsByDate(sessions), [sessions])

  const weeks = useMemo(
    () => buildCalendarMonthGrid(monthCursor.year, monthCursor.month, sessionsByDate),
    [monthCursor, sessionsByDate]
  )

  const monthLabel = useMemo(
    () =>
      new Date(monthCursor.year, monthCursor.month, 1).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
    [monthCursor]
  )

  const selectedSessions = selectedDate ? sessionsByDate.get(selectedDate) ?? [] : []

  const monthStats = useMemo(() => {
    let meetingDays = 0
    let present = 0
    let absent = 0
    for (const daySessions of Array.from(sessionsByDate.values())) {
      if (daySessions.length === 0) continue
      meetingDays++
      for (const session of daySessions) {
        present += session.present + session.late
        absent += session.absentNoted
      }
    }
    return { meetingDays, present, absent, sessions: sessions.length }
  }, [sessions, sessionsByDate])

  function shiftMonth(delta: number) {
    setSelectedDate(null)
    setMonthCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  function printHref(session: RlcCalendarSessionSummary) {
    const params = printQueryFromSelection(session.selection)
    params.set('date', session.serviceDate)
    return `/admin/rlc/attendance/print?${params.toString()}`
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">{monthStats.meetingDays}</p>
            <p className="text-sm text-muted-foreground">Meeting days this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{monthStats.sessions}</p>
            <p className="text-sm text-muted-foreground">Service sessions recorded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-300">{monthStats.present}</p>
            <p className="text-sm text-muted-foreground">Present / late check-ins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{monthStats.absent}</p>
            <p className="text-sm text-muted-foreground">Absent with note</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-brand-100/80 dark:border-brand-400/20">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-brand-700 dark:text-brand-300" />
              {monthLabel}
            </CardTitle>
            <CardDescription>
              Colored markers show which services had attendance recorded. Click a day for details.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-11 w-11 sm:h-10 sm:w-10" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-11 sm:h-8"
              onClick={() => {
                setMonthCursor({ year: today.getFullYear(), month: today.getMonth() })
                setSelectedDate(today.toISOString().split('T')[0])
              }}
            >
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-11 w-11 sm:h-10 sm:w-10" onClick={() => shiftMonth(1)} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-2 sm:px-6">
          <div className="grid grid-cols-7 gap-0.5 text-center app-overline sm:gap-1">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="py-1">
                {label}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {week.map((cell, cellIndex) => {
                  if (!cell.date) {
                    return <div key={`pad-${weekIndex}-${cellIndex}`} className="min-h-12 rounded-lg bg-neutral-50/50 dark:bg-white/[0.04] sm:min-h-[5.5rem]" />
                  }

                  const isSelected = selectedDate === cell.date
                  const hasSessions = cell.sessions.length > 0

                  return (
                    <button
                      key={cell.date}
                      type="button"
                      onClick={() => setSelectedDate(cell.date)}
                      className={cn(
                        'min-h-12 min-w-0 rounded-lg border p-1 text-left transition-colors sm:min-h-[5.5rem] sm:p-1.5',
                        isSelected
                          ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-300/40 dark:bg-brand-400/10'
                          : hasSessions
                            ? 'border-neutral-200 bg-white hover:border-brand-200 hover:bg-brand-50/40 dark:border-white/10 dark:bg-neutral-800/60 dark:hover:bg-brand-400/10'
                            : 'border-neutral-100 bg-neutral-50/80 hover:bg-white dark:border-white/10 dark:bg-white/[0.04]'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                            cell.isToday ? 'bg-brand-700 text-white' : 'text-neutral-800 dark:text-neutral-100'
                          )}
                        >
                          {Number(cell.date.slice(-2))}
                        </span>
                        {hasSessions ? (
                          <span className="hidden text-[10px] font-medium text-muted-foreground sm:inline">
                            {cell.sessions.length}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-0.5 sm:mt-2 sm:gap-1">
                        {cell.sessions.slice(0, 4).map((session) => (
                          <span
                            key={session.sessionKey}
                            className={cn('h-2 w-2 rounded-full', session.dotClass)}
                            title={`${session.label}: ${session.present} present, ${session.absentNoted} absent`}
                          />
                        ))}
                      </div>
                      <div className="mt-1.5 hidden space-y-0.5 sm:block">
                        {cell.sessions.slice(0, 2).map((session) => (
                          <span
                            key={`chip-${session.sessionKey}`}
                            className={cn(
                              'block truncate rounded border px-1 py-0.5 text-[10px] font-medium leading-tight',
                              session.chipClass
                            )}
                          >
                            {session.shortLabel} · {session.present}
                            {session.absentNoted > 0 ? `/${session.absentNoted}` : ''}
                          </span>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 border-t pt-4">
            {calendarLegendItems(customServices).map((item) => (
              <div key={item.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn('h-2.5 w-2.5 rounded-full', item.dotClass)} />
                {item.label}
              </div>
            ))}
            <span className="text-xs text-muted-foreground">· Chip shows present / absent noted</span>
          </div>
        </CardContent>
      </Card>

      {selectedDate ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </CardTitle>
            <CardDescription>
              {selectedSessions.length === 0
                ? 'No attendance recorded for this day.'
                : `${selectedSessions.length} service session(s) on this day`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Switch to Register to take attendance, or pick another day on the calendar.
              </p>
            ) : (
              selectedSessions.map((session) => (
                <div
                  key={session.sessionKey}
                  className="flex flex-col gap-3 rounded-lg border px-3 py-3 sm:flex-row sm:px-4 sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('h-2.5 w-2.5 rounded-full', session.dotClass)} />
                      <p className="font-medium">{session.label}</p>
                      <Badge variant="outline">{rlcServiceSelectionLabel(session.selection)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {session.present} present
                      {session.late > 0 ? ` · ${session.late} late` : ''}
                      {session.absentNoted > 0 ? ` · ${session.absentNoted} absent (noted)` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-10 flex-1 sm:h-8 sm:flex-none"
                      onClick={() => onOpenSession(session.serviceDate, session.selection)}
                    >
                      Open register
                    </Button>
                    <Button size="sm" variant="outline" className="h-10 flex-1 sm:h-8 sm:flex-none" asChild>
                      <Link href={printHref(session)} target="_blank">
                        <Printer className="mr-2 h-3.5 w-3.5" />
                        Print
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
