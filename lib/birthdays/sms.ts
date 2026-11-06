/**
 * Birthday SMS templates (Hubtel) with {{name}} personalization.
 */

export type BirthdaySmsVars = {
  name?: string | null
  firstName?: string | null
  ageTurning?: number | null
  /** "Thursday 13 November" */
  birthdayDate?: string | null
}

export const DEFAULT_BIRTHDAY_SMS_TEMPLATE =
  'Happy Birthday {{firstName}}! May God bless you with joy, health, and another year of grace. Warm wishes from Campus Gem Ministries.'

/** Used when the birthday is still to come, so nobody gets "Happy Birthday" on the wrong day. */
export const DEFAULT_BIRTHDAY_ADVANCE_SMS_TEMPLATE =
  'Happy birthday in advance, {{firstName}}! We are celebrating you ahead of {{birthdayDate}}. May God bless you with joy, health, and another year of grace. Warm wishes from Campus Gem Ministries.'

export function getBirthdaySmsTemplate(): string {
  return process.env.BIRTHDAY_SMS_TEMPLATE?.trim() || DEFAULT_BIRTHDAY_SMS_TEMPLATE
}

export function getBirthdayAdvanceSmsTemplate(): string {
  return process.env.BIRTHDAY_SMS_ADVANCE_TEMPLATE?.trim() || DEFAULT_BIRTHDAY_ADVANCE_SMS_TEMPLATE
}

export function personalizeBirthdaySms(template: string, vars: BirthdaySmsVars): string {
  const fullName = vars.name?.trim() || 'Friend'
  const firstName = vars.firstName?.trim() || fullName.split(/\s+/)[0] || 'Friend'
  const age =
    vars.ageTurning != null && Number.isFinite(vars.ageTurning)
      ? String(vars.ageTurning)
      : ''

  return template
    .replace(/\{\{\s*name\s*\}\}/gi, fullName)
    .replace(/\{\{\s*fullName\s*\}\}/gi, fullName)
    .replace(/\{\{\s*firstName\s*\}\}/gi, firstName)
    .replace(/\{\{\s*first_name\s*\}\}/gi, firstName)
    .replace(/\{\{\s*ageTurning\s*\}\}/gi, age)
    .replace(/\{\{\s*age\s*\}\}/gi, age)
    .replace(/\{\{\s*birthday_?[dD]ate\s*\}\}/g, vars.birthdayDate?.trim() || 'your birthday')
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

/**
 * The next birthday on or after `today` (Ghana calendar days, no time zones involved).
 * 29 February is kept on 28 February in other years.
 */
export function nextBirthdayOn(
  birth: { month: number; day: number },
  today: { year: number; month: number; day: number }
): { year: number; month: number; day: number; daysUntil: number } {
  const dayIn = (y: number) => (birth.month === 2 && birth.day === 29 && !isLeap(y) ? 28 : birth.day)
  const todayMs = Date.UTC(today.year, today.month - 1, today.day)
  let year = today.year
  let ms = Date.UTC(year, birth.month - 1, dayIn(year))
  if (ms < todayMs) {
    year += 1
    ms = Date.UTC(year, birth.month - 1, dayIn(year))
  }
  return { year, month: birth.month, day: dayIn(year), daysUntil: Math.round((ms - todayMs) / 86_400_000) }
}

export function formatBirthdayDay(d: { year: number; month: number; day: number }): string {
  const weekday = WEEKDAY_NAMES[new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay()]
  return `${weekday} ${d.day} ${MONTHS[d.month - 1]}`
}

export type BirthdayMessage = {
  body: string
  /** 0 = today. */
  daysUntil: number
  kind: 'today' | 'advance'
  /** "Thursday 13 November" */
  birthdayDate: string
}

/**
 * The text a person gets. On the day: the birthday template. Before it: the "in advance"
 * template, so a text sent early never says "Happy Birthday" as if it were today. A custom
 * message typed by staff is used as written (they see it in the preview first).
 */
export function birthdayMessageFor(
  person: { name: string; birthMonth: number; birthDay: number; ageTurning?: number | null },
  options: {
    today: { year: number; month: number; day: number }
    template: string
    advanceTemplate: string
    customTemplate?: string | null
  }
): BirthdayMessage {
  const next = nextBirthdayOn({ month: person.birthMonth, day: person.birthDay }, options.today)
  const kind = next.daysUntil === 0 ? 'today' : 'advance'
  const birthdayDate = formatBirthdayDay(next)
  const custom = options.customTemplate?.trim()
  const template = custom || (kind === 'today' ? options.template : options.advanceTemplate)
  const firstName = person.name.trim().split(/\s+/)[0] || person.name
  return {
    body: personalizeBirthdaySms(template, { name: person.name, firstName, ageTurning: person.ageTurning, birthdayDate }),
    daysUntil: next.daysUntil,
    kind,
    birthdayDate,
  }
}

/** Calendar date in Africa/Accra (Ghana) — birthdays use local church day. */
export function ghanaCalendarDate(ref: Date = new Date()): {
  year: number
  month: number
  day: number
  iso: string
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Accra',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ref)

  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value)
  const day = Number(parts.find((p) => p.type === 'day')?.value)
  return {
    year,
    month,
    day,
    iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  }
}

export function isBirthdaySmsAutoEnabled(): boolean {
  const flag = process.env.BIRTHDAY_SMS_AUTO_ENABLED?.trim().toLowerCase()
  if (flag === 'false' || flag === '0' || flag === 'no') return false
  // Default on when Hubtel is expected in production; cron still no-ops if SMS unset
  if (flag === 'true' || flag === '1' || flag === 'yes') return true
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
}
