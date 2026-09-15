/**
 * Camp SMS / email message templates with {{variable}} personalization.
 */

export type CampMessageTemplateId =
  | 'registration_confirmation'
  | 'payment_reminder'
  | 'check_in_info'
  | 'welcome_general'

export type CampTemplateVars = {
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  fullName?: string | null
  role?: string | null
  campYear?: number | string | null
  phone?: string | null
  email?: string | null
  checkInCode?: string | null
  qrCode?: string | null
  theme?: string | null
  venue?: string | null
  startDate?: string | null
  endDate?: string | null
}

export type CampMessageTemplate = {
  id: CampMessageTemplateId
  label: string
  description: string
  channel: 'sms' | 'email' | 'both'
  subject?: string
  body: string
}

/** Default templates for compose UI + registration auto-SMS. */
export const CAMP_MESSAGE_TEMPLATES: CampMessageTemplate[] = [
  {
    id: 'registration_confirmation',
    label: 'Registration confirmation',
    description: 'Sent after someone registers (name + check-in code).',
    channel: 'sms',
    body: `Hi {{firstName}}! You're registered for Campus Gem Camp Meeting {{campYear}}{{themePart}}. Your check-in code is {{checkInCode}}. Keep this SMS. See you there!`,
  },
  {
    id: 'payment_reminder',
    label: 'Payment reminder',
    description: 'Remind campers about outstanding camp fees.',
    channel: 'both',
    subject: 'Camp Meeting {{campYear}} — payment reminder',
    body: `Hi {{name}}, this is a reminder to complete your Camp Meeting {{campYear}} payment. Reply or contact the camp team if you need help. Thank you!`,
  },
  {
    id: 'check_in_info',
    label: 'Check-in info',
    description: 'Share code and arrival details before camp.',
    channel: 'sms',
    body: `Hi {{firstName}}, Camp Meeting {{campYear}} check-in uses code {{checkInCode}}. Venue: {{venue}}. Bring this code when you arrive.`,
  },
  {
    id: 'welcome_general',
    label: 'Welcome / general',
    description: 'Short welcome or announcement with name inject.',
    channel: 'both',
    subject: 'Campus Gem Camp Meeting {{campYear}}',
    body: `Hi {{name}}, greetings from Campus Gem Camp Meeting {{campYear}}! {{theme}}`,
  },
]

export function getCampMessageTemplate(id: CampMessageTemplateId): CampMessageTemplate | undefined {
  return CAMP_MESSAGE_TEMPLATES.find((t) => t.id === id)
}

export const CAMP_TEMPLATE_VARIABLE_HINT =
  '{{name}}, {{firstName}}, {{lastName}}, {{role}}, {{campYear}}, {{checkInCode}}, {{phone}}, {{email}}, {{venue}}, {{theme}}'

/** Chips for the compose UI — insert {{key}} into the message body. */
export const CAMP_TEMPLATE_VARIABLE_CHIPS: Array<{ key: string; label: string }> = [
  { key: 'firstName', label: 'First name' },
  { key: 'name', label: 'Full name' },
  { key: 'checkInCode', label: 'Check-in code' },
  { key: 'campYear', label: 'Camp year' },
  { key: 'role', label: 'Role' },
  { key: 'venue', label: 'Venue' },
  { key: 'theme', label: 'Theme' },
  { key: 'phone', label: 'Phone' },
]

function themePart(theme?: string | null): string {
  const t = theme?.trim()
  return t ? ` (${t})` : ''
}

/** Replace {{placeholders}} for camp SMS/email. Unknown keys stay as-is. */
export function personalizeCampMessage(template: string, vars: CampTemplateVars): string {
  const fullName =
    vars.fullName?.trim() ||
    vars.name?.trim() ||
    `${vars.firstName ?? ''} ${vars.lastName ?? ''}`.trim() ||
    'Camper'
  const firstName = vars.firstName?.trim() || fullName.split(/\s+/)[0] || 'Camper'
  const lastName = vars.lastName?.trim() || ''
  const checkIn = vars.checkInCode?.trim() || vars.qrCode?.trim() || ''
  const campYear =
    vars.campYear != null && String(vars.campYear).trim() !== ''
      ? String(vars.campYear)
      : String(new Date().getFullYear())

  const map: Record<string, string> = {
    name: fullName,
    full_name: fullName,
    fullName,
    firstName,
    first_name: firstName,
    lastName,
    last_name: lastName,
    role: vars.role?.trim() || 'Participant',
    campYear,
    camp_year: campYear,
    phone: vars.phone?.trim() || '',
    email: vars.email?.trim() || '',
    checkInCode: checkIn,
    check_in_code: checkIn,
    qrCode: checkIn,
    qr_code: checkIn,
    theme: vars.theme?.trim() || '',
    venue: vars.venue?.trim() || 'TBA',
    startDate: vars.startDate?.trim() || '',
    endDate: vars.endDate?.trim() || '',
    themePart: themePart(vars.theme),
  }

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(map, key)) return map[key]
    return match
  })
}

/** Resolve registration confirmation body (env override or default template). */
export function getRegistrationConfirmationSmsTemplate(): string {
  const fromEnv = process.env.CAMP_REGISTRATION_SMS_TEMPLATE?.trim()
  if (fromEnv) return fromEnv
  return getCampMessageTemplate('registration_confirmation')!.body
}

/** Auto-SMS on register when year is 2026+ (or CAMP_REGISTRATION_SMS_ENABLED=true). */
export function shouldSendRegistrationConfirmationSms(campYear: number): boolean {
  const flag = process.env.CAMP_REGISTRATION_SMS_ENABLED?.trim().toLowerCase()
  if (flag === 'false' || flag === '0' || flag === 'no') return false
  if (flag === 'true' || flag === '1' || flag === 'yes') return true
  return campYear >= 2026
}
