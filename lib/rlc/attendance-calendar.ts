import { RLC_SERVICES } from '@/lib/constants/rlc'
import type { Attendance, RlcCustomService } from '@/lib/types'
import {
  attendanceServiceLabel,
  type RlcServiceSelection,
  type StandardServiceType,
} from '@/lib/rlc/service-selection'

/** Tailwind classes for calendar dots and day chips */
export const RLC_SERVICE_CALENDAR_STYLES: Record<
  StandardServiceType | 'other',
  { dot: string; chip: string; label: string }
> = {
  sunday_service: {
    dot: 'bg-rose-600',
    chip: 'bg-rose-100 text-rose-900 border-rose-200',
    label: 'Sun',
  },
  midweek_service: {
    dot: 'bg-blue-600',
    chip: 'bg-blue-100 text-blue-900 border-blue-200',
    label: 'Mid',
  },
  prayer_meeting: {
    dot: 'bg-violet-600',
    chip: 'bg-violet-100 text-violet-900 border-violet-200',
    label: 'Pray',
  },
  youth_service: {
    dot: 'bg-orange-500',
    chip: 'bg-orange-100 text-orange-900 border-orange-200',
    label: 'Youth',
  },
  children_service: {
    dot: 'bg-teal-600',
    chip: 'bg-teal-100 text-teal-900 border-teal-200',
    label: 'Kids',
  },
  special_event: {
    dot: 'bg-amber-500',
    chip: 'bg-amber-100 text-amber-900 border-amber-200',
    label: 'Event',
  },
  other: {
    dot: 'bg-indigo-600',
    chip: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    label: 'Other',
  },
}

export type RlcCalendarSessionSummary = {
  sessionKey: string
  serviceDate: string
  label: string
  shortLabel: string
  dotClass: string
  chipClass: string
  present: number
  absentNoted: number
  late: number
  total: number
  selection: RlcServiceSelection
}

export type RlcCalendarDayCell = {
  date: string | null
  isCurrentMonth: boolean
  isToday: boolean
  sessions: RlcCalendarSessionSummary[]
}

export function attendanceSessionKey(row: Attendance): string {
  const meta = row.metadata as { custom_service_id?: string } | undefined
  const customId = row.service_type === 'other' ? meta?.custom_service_id ?? 'other' : ''
  return `${row.service_date}|${row.service_type ?? 'unknown'}|${customId}`
}

export function attendanceToServiceSelection(
  row: Attendance,
  customServices: RlcCustomService[]
): RlcServiceSelection {
  if (row.service_type === 'other') {
    const meta = row.metadata as { custom_service_id?: string; custom_service_name?: string } | undefined
    const id = meta?.custom_service_id ?? 'unknown'
    const label =
      meta?.custom_service_name ??
      customServices.find((service) => service.id === id)?.name ??
      'Other service'
    return { kind: 'custom', customServiceId: id, label }
  }
  const serviceType = (row.service_type ?? 'sunday_service') as StandardServiceType
  return { kind: 'standard', serviceType }
}

export function calendarStylesForRow(row: Attendance): { dot: string; chip: string; shortLabel: string } {
  const type = row.service_type ?? 'sunday_service'
  if (type === 'other') {
    const customName = (row.metadata as { custom_service_name?: string })?.custom_service_name
    return {
      ...RLC_SERVICE_CALENDAR_STYLES.other,
      shortLabel: customName ? customName.slice(0, 4) : 'Oth',
    }
  }
  const styles = RLC_SERVICE_CALENDAR_STYLES[type as StandardServiceType]
  if (!styles) {
    const fallback = RLC_SERVICE_CALENDAR_STYLES.special_event
    return { dot: fallback.dot, chip: fallback.chip, shortLabel: fallback.label }
  }
  return { dot: styles.dot, chip: styles.chip, shortLabel: styles.label }
}

export function summarizeAttendanceSessions(
  rows: Attendance[],
  customServices: RlcCustomService[]
): RlcCalendarSessionSummary[] {
  const bySession = new Map<string, { sample: Attendance; rows: Attendance[] }>()

  for (const row of rows) {
    const key = attendanceSessionKey(row)
    const bucket = bySession.get(key)
    if (bucket) {
      bucket.rows.push(row)
    } else {
      bySession.set(key, { sample: row, rows: [row] })
    }
  }

  return Array.from(bySession.values())
    .map(({ sample, rows: sessionRows }) => {
      const styles = calendarStylesForRow(sample)
      let present = 0
      let absentNoted = 0
      let late = 0
      for (const row of sessionRows) {
        if (row.status === 'absent') absentNoted++
        else if (row.status === 'late') late++
        else present++
      }
      return {
        sessionKey: attendanceSessionKey(sample),
        serviceDate: sample.service_date,
        label: attendanceServiceLabel(sample),
        shortLabel: styles.shortLabel,
        dotClass: styles.dot,
        chipClass: styles.chip,
        present,
        absentNoted,
        late,
        total: sessionRows.length,
        selection: attendanceToServiceSelection(sample, customServices),
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function groupSessionsByDate(
  sessions: RlcCalendarSessionSummary[]
): Map<string, RlcCalendarSessionSummary[]> {
  const map = new Map<string, RlcCalendarSessionSummary[]>()
  for (const session of sessions) {
    const list = map.get(session.serviceDate) ?? []
    list.push(session)
    map.set(session.serviceDate, list)
  }
  return map
}

export function monthDateBounds(year: number, monthIndex: number): { from: string; to: string } {
  const from = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  const to = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

export function buildCalendarMonthGrid(
  year: number,
  monthIndex: number,
  sessionsByDate: Map<string, RlcCalendarSessionSummary[]>,
  todayIso = new Date().toISOString().split('T')[0]
): RlcCalendarDayCell[][] {
  const firstOfMonth = new Date(year, monthIndex, 1)
  const startOffset = firstOfMonth.getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells: RlcCalendarDayCell[] = []

  for (let i = 0; i < startOffset; i++) {
    cells.push({ date: null, isCurrentMonth: false, isToday: false, sessions: [] })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({
      date,
      isCurrentMonth: true,
      isToday: date === todayIso,
      sessions: sessionsByDate.get(date) ?? [],
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null, isCurrentMonth: false, isToday: false, sessions: [] })
  }

  const weeks: RlcCalendarDayCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}

export function calendarLegendItems(customServices: RlcCustomService[]): Array<{
  key: string
  label: string
  dotClass: string
}> {
  const items: Array<{ key: string; label: string; dotClass: string }> = RLC_SERVICES.map((service) => ({
    key: service.value,
    label: service.label,
    dotClass: RLC_SERVICE_CALENDAR_STYLES[service.value].dot,
  }))
  if (customServices.length > 0) {
    items.push({
      key: 'other',
      label: 'Custom / other services',
      dotClass: RLC_SERVICE_CALENDAR_STYLES.other.dot,
    })
  }
  return items
}
