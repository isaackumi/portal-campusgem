import {
  MEMBER_DOB_PLACEHOLDER_YEAR,
  parseIsoDob,
} from '@/lib/camp/birthday'
import type { Congregation, Member, Visitor } from '@/lib/types'

export type BirthdayTimeFilter = 'today' | 'week' | 'next30' | 'browse_month'

export type BirthdayEntry = {
  id: string
  name: string
  dob: string
  birthMonth: number
  birthDay: number
  birthYear?: number
  hasRealBirthYear: boolean
  phone?: string
  email?: string
  membershipId?: string
  kind: 'member' | 'visitor'
  congregation?: Congregation
  nextCelebrationDate: string
  daysUntil: number
  ageTurning?: number
  subtitle?: string
  href?: string
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export function birthdayPartsFromDob(dob?: string | null): {
  month?: number
  day?: number
  year?: number
} {
  if (!dob?.trim()) return {}
  return parseIsoDob(dob.trim())
}

export function hasRealBirthYear(year?: number): boolean {
  return year != null && year > 0 && year !== MEMBER_DOB_PLACEHOLDER_YEAR
}

export function nextBirthdayDate(dob: string, refDate = new Date()): Date {
  const parts = birthdayPartsFromDob(dob)
  if (parts.month == null || parts.day == null) {
    return new Date(refDate)
  }
  const year = refDate.getFullYear()
  let next = new Date(year, parts.month - 1, parts.day)
  const todayStart = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate())
  if (next < todayStart) {
    next = new Date(year + 1, parts.month - 1, parts.day)
  }
  return next
}

export function daysUntilNextBirthday(dob: string, refDate = new Date()): number {
  const next = nextBirthdayDate(dob, refDate)
  const todayStart = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate())
  const diff = next.getTime() - todayStart.getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

export function ageTurningOnNextBirthday(dob: string, refDate = new Date()): number | undefined {
  const parts = birthdayPartsFromDob(dob)
  if (!hasRealBirthYear(parts.year)) return undefined
  const next = nextBirthdayDate(dob, refDate)
  return next.getFullYear() - (parts.year as number)
}

export function memberToBirthdayEntry(
  member: Member,
  options?: { href?: string; subtitle?: string }
): BirthdayEntry | null {
  if (!member.dob?.trim()) return null
  const parts = birthdayPartsFromDob(member.dob)
  if (parts.month == null || parts.day == null) return null

  const next = nextBirthdayDate(member.dob)
  const daysUntil = daysUntilNextBirthday(member.dob)
  const realYear = hasRealBirthYear(parts.year)

  return {
    id: member.id,
    name: member.user?.full_name ?? 'Unknown',
    dob: member.dob,
    birthMonth: parts.month,
    birthDay: parts.day,
    birthYear: parts.year,
    hasRealBirthYear: realYear,
    phone: member.user?.phone,
    email: member.user?.email,
    membershipId: member.user?.membership_id,
    kind: 'member',
    congregation: member.congregation,
    nextCelebrationDate: next.toISOString().split('T')[0],
    daysUntil,
    ageTurning: ageTurningOnNextBirthday(member.dob),
    subtitle: options?.subtitle,
    href: options?.href ?? `/members/${member.id}`,
  }
}

export function visitorToBirthdayEntry(
  visitor: Visitor,
  options?: { href?: string }
): BirthdayEntry | null {
  if (!visitor.date_of_birth?.trim()) return null
  const parts = birthdayPartsFromDob(visitor.date_of_birth)
  if (parts.month == null || parts.day == null) return null

  const name = [visitor.first_name, visitor.middle_name, visitor.last_name].filter(Boolean).join(' ')
  const next = nextBirthdayDate(visitor.date_of_birth)
  const realYear = hasRealBirthYear(parts.year)

  return {
    id: visitor.id,
    name: name || 'Visitor',
    dob: visitor.date_of_birth,
    birthMonth: parts.month,
    birthDay: parts.day,
    birthYear: parts.year,
    hasRealBirthYear: realYear,
    phone: visitor.phone,
    email: visitor.email,
    kind: 'visitor',
    congregation: visitor.congregation,
    nextCelebrationDate: next.toISOString().split('T')[0],
    daysUntil: daysUntilNextBirthday(visitor.date_of_birth),
    ageTurning: ageTurningOnNextBirthday(visitor.date_of_birth),
    subtitle: 'Visitor',
    href: options?.href ?? `/admin/rlc/visitors/${visitor.id}`,
  }
}

export function isCampusGemMember(member: Member): boolean {
  if (member.status !== 'active') return false
  const c = member.congregation
  return !c || c === 'campus_gem' || c === 'both'
}

export function isRlcMember(member: Member): boolean {
  if (member.status !== 'active') return false
  const c = member.congregation
  return c === 'rlc' || c === 'both'
}

export function filterBirthdaysByTime(
  entries: BirthdayEntry[],
  filter: Exclude<BirthdayTimeFilter, 'browse_month'>,
  refDate = new Date()
): BirthdayEntry[] {
  return entries.filter((entry) => {
    const days = daysUntilNextBirthday(entry.dob, refDate)
    if (filter === 'today') return days === 0
    if (filter === 'week') return days >= 0 && days <= 7
    if (filter === 'next30') return days >= 0 && days <= 30
    return true
  })
}

export function filterBirthdaysByBirthMonth(entries: BirthdayEntry[], month: number): BirthdayEntry[] {
  return entries.filter((entry) => entry.birthMonth === month)
}

export function sortBirthdaysByUpcoming(entries: BirthdayEntry[]): BirthdayEntry[] {
  return [...entries].sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil
    return a.name.localeCompare(b.name)
  })
}

export function sortBirthdaysByCalendarDay(entries: BirthdayEntry[]): BirthdayEntry[] {
  return [...entries].sort((a, b) => {
    if (a.birthDay !== b.birthDay) return a.birthDay - b.birthDay
    return a.name.localeCompare(b.name)
  })
}

export function formatBirthdayLabel(entry: BirthdayEntry): string {
  const month = MONTH_NAMES[entry.birthMonth - 1] ?? ''
  const day = entry.birthDay
  if (entry.hasRealBirthYear && entry.birthYear) {
    return `${month} ${day}, ${entry.birthYear}`
  }
  return `${month} ${day}`
}

export function formatDaysUntilLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'Today'
  if (daysUntil === 1) return 'Tomorrow'
  return `In ${daysUntil} days`
}

export function birthdaysToCsv(entries: BirthdayEntry[], title: string): string {
  const header = ['Name', 'Birthday', 'Next celebration', 'Days until', 'Age turning', 'Phone', 'Email', 'Type']
  const rows = entries.map((entry) => [
    entry.name,
    formatBirthdayLabel(entry),
    entry.nextCelebrationDate,
    String(entry.daysUntil),
    entry.ageTurning != null ? String(entry.ageTurning) : '',
    entry.phone ?? '',
    entry.email ?? '',
    entry.kind === 'visitor' ? 'Visitor' : 'Member',
  ])
  return [title, header.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n')
}

export function downloadBirthdaysCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function countBirthdaysInMonth(entries: BirthdayEntry[], month: number): number {
  return entries.filter((entry) => entry.birthMonth === month).length
}
