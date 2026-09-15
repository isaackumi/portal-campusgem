/**
 * Birthday SMS templates (Hubtel) with {{name}} personalization.
 */

export type BirthdaySmsVars = {
  name?: string | null
  firstName?: string | null
  ageTurning?: number | null
}

export const DEFAULT_BIRTHDAY_SMS_TEMPLATE =
  'Happy Birthday {{firstName}}! May God bless you with joy, health, and another year of grace. Warm wishes from Campus Gem Ministries.'

export function getBirthdaySmsTemplate(): string {
  return process.env.BIRTHDAY_SMS_TEMPLATE?.trim() || DEFAULT_BIRTHDAY_SMS_TEMPLATE
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
