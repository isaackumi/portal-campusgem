/**
 * Camp SMS / email message templates with {{variable}} personalization.
 */

export type CampMessageTemplateId =
  | 'registration_confirmation'
  | 'payment_reminder'
  | 'check_in_info'
  | 'welcome_general'
  | 'room_allocation'
  | 'registration_invite'

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
  roomName?: string | null
  building?: string | null
  roomLeader?: string | null
  roommates?: string | null
  registrationLink?: string | null
  /** Personal tap-to-confirm attendance link (`/c/<token>`). */
  confirmLink?: string | null
}

/** Templates containing this placeholder get a personal tap-to-confirm link per registrant. */
export const CONFIRM_LINK_PLACEHOLDER = /\{\{\s*confirm(?:Link|_link)\s*\}\}/

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
    description: 'Sent after someone registers for Eagles Camp Meeting.',
    channel: 'sms',
    body: `Hi {{firstName}}! You're officially registered for Eagles Camp Meeting {{campYear}}! We can't wait to share this special time of prayer, worship, fellowship, and God's presence with you.

See you at camp!`,
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
  {
    id: 'room_allocation',
    label: 'Room allocation',
    description: 'Tell campers their room name, building, and check-in code.',
    channel: 'sms',
    body: `Hi {{firstName}}! Your Camp Meeting {{campYear}} room is {{roomName}}{{buildingPart}}. Check-in code: {{checkInCode}}.{{leaderPart}} See you at camp!`,
  },
  {
    id: 'registration_invite',
    label: 'Invite to register',
    description: 'Encourage members who have not registered yet to join camp.',
    channel: 'sms',
    body: `Hi {{firstName}}! Join us for Eagles Camp Meeting {{campYear}}, a special time of prayer, worship, fellowship, and growing deeper in God's presence. We'd love to have you with us!

Register: {{registrationLink}}`,
  },
]

export function getCampMessageTemplate(id: CampMessageTemplateId): CampMessageTemplate | undefined {
  return CAMP_MESSAGE_TEMPLATES.find((t) => t.id === id)
}

export const CAMP_TEMPLATE_VARIABLE_HINT =
  '{{name}}, {{firstName}}, {{checkInCode}}, {{campYear}}, {{roomName}}, {{building}}, {{roomLeader}}, {{roommates}}, {{venue}}, {{theme}}, {{registrationLink}}'

/** Chips for the compose UI — insert {{key}} into the message body. */
export const CAMP_TEMPLATE_VARIABLE_CHIPS: Array<{ key: string; label: string }> = [
  { key: 'firstName', label: 'First name' },
  { key: 'name', label: 'Full name' },
  { key: 'checkInCode', label: 'Check-in code' },
  { key: 'roomName', label: 'Room' },
  { key: 'building', label: 'Building' },
  { key: 'roomLeader', label: 'Room leader' },
  { key: 'roommates', label: 'Roommates' },
  { key: 'campYear', label: 'Camp year' },
  { key: 'venue', label: 'Venue' },
  { key: 'theme', label: 'Theme' },
  { key: 'phone', label: 'Phone' },
  { key: 'registrationLink', label: 'Register link' },
]

function themePart(theme?: string | null): string {
  const t = theme?.trim()
  return t ? ` (${t})` : ''
}

function buildingPart(building?: string | null): string {
  const b = building?.trim()
  return b ? ` (${b})` : ''
}

function leaderPart(leader?: string | null): string {
  const l = leader?.trim()
  return l ? ` Room leader: ${l}.` : ''
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
  const roomName = vars.roomName?.trim() || 'TBA'
  const building = vars.building?.trim() || ''
  const roomLeader = vars.roomLeader?.trim() || ''
  const roommates = vars.roommates?.trim() || ''

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
    roomName,
    room_name: roomName,
    building,
    buildingPart: buildingPart(building),
    roomLeader,
    room_leader: roomLeader,
    leaderPart: leaderPart(roomLeader),
    roommates,
    registrationLink: vars.registrationLink?.trim() || '',
    registration_link: vars.registrationLink?.trim() || '',
    confirmLink: vars.confirmLink?.trim() || '',
    confirm_link: vars.confirmLink?.trim() || '',
  }

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(map, key)) return map[key]
    return match
  })
}

export function getRoomAllocationSmsTemplate(): string {
  const fromEnv = process.env.CAMP_ROOM_SMS_TEMPLATE?.trim()
  if (fromEnv) return fromEnv
  return getCampMessageTemplate('room_allocation')!.body
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

/** The recipient fields camp sends personalise from (as passed to the camp SMS actions). */
export type CampSmsPreviewRecipient = {
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  email?: string | null
  role?: string | null
  qr_code?: string | null
  check_in_code?: string | null
  room_name?: string | null
  building?: string | null
  room_leader?: string | null
  roommates?: string | null
  invite_only?: boolean
  source?: 'member' | 'past_camper' | 'registration'
}

/**
 * One person's camp SMS for the "check before sending" preview, filled in the way the
 * camp SMS actions do. Values only the server knows stay as placeholders: the personal
 * {{confirmLink}} (blank for invite-only rows, as on the server), and theme / venue when
 * not given (the server reads them from the camp year).
 */
export function previewCampSms(
  template: string,
  r: CampSmsPreviewRecipient,
  campYear?: number | string | null,
  extras?: { theme?: string | null; venue?: string | null; registrationLink?: string | null }
): string {
  const getsConfirmLink = !r.invite_only && r.source !== 'member' && r.source !== 'past_camper'
  return personalizeCampMessage(template, {
    fullName: r.full_name,
    firstName: r.first_name,
    lastName: r.last_name,
    role: r.role,
    campYear,
    phone: r.phone,
    email: r.email,
    checkInCode: r.check_in_code,
    qrCode: r.qr_code,
    theme: extras?.theme ?? '{{theme}}',
    venue: extras?.venue ?? '{{venue}}',
    roomName: r.room_name,
    building: r.building,
    roomLeader: r.room_leader,
    roommates: r.roommates,
    registrationLink: extras?.registrationLink ?? '',
    confirmLink: getsConfirmLink ? '{{confirmLink}}' : '',
  })
}
