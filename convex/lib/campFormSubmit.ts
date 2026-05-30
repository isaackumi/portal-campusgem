import type { Doc, Id } from '../_generated/dataModel'
import type { CampRegistrationPublicInput } from './campRegistrationInsert'

const AGE_BRACKETS = new Set(['1-12', '13-19', '20-29', '30-39', '40-49', '50+'])
const SEX_VALUES = new Set(['Male', 'Female'])

function splitFullName(fullName: string): { first_name: string; last_name: string } {
  const trimmed = fullName.trim()
  if (!trimmed) return { first_name: 'Unknown', last_name: '.' }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { first_name: parts[0], last_name: '.' }
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') }
}

function inferHighestQualification(educationLevel: string): 'JHS' | 'SHS' | 'University' {
  const level = educationLevel.toUpperCase()
  if (/JHS/.test(level)) return 'JHS'
  if (/SHS|COMPLETED SHS/.test(level)) return 'SHS'
  if (/LEVEL|GRADUATED|POSTGRADUATE|UNIVERSITY/.test(level)) return 'University'
  return 'SHS'
}

function parseBooleanAnswer(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  const text = String(value ?? '').trim().toLowerCase()
  if (text === 'yes' || text === 'true') return true
  if (text === 'no' || text === 'false') return false
  return false
}

function stringValue(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.join(', ')
  return String(value).trim()
}

function buildPrefillMap(
  fields: Doc<'form_fields'>[],
  values: Record<string, unknown>
): Map<string, unknown> {
  const map = new Map<string, unknown>()
  for (const field of fields) {
    const key = field.prefill_key?.trim()
    if (!key) continue
    const raw = values[String(field._id)]
    if (raw == null || raw === '') continue
    map.set(key, raw)
  }
  return map
}

export function mapFormValuesToCampRegistrationInput(
  fields: Doc<'form_fields'>[],
  values: Record<string, unknown>,
  campYearId: Id<'camp_years'>,
  timesAttended: number
): CampRegistrationPublicInput {
  const prefill = buildPrefillMap(fields, values)

  const fullName = stringValue(prefill.get('full_name'))
  const firstFromPrefill = stringValue(prefill.get('first_name'))
  const lastFromPrefill = stringValue(prefill.get('last_name'))
  const names =
    firstFromPrefill || lastFromPrefill
      ? {
          first_name: firstFromPrefill || splitFullName(fullName).first_name,
          last_name: lastFromPrefill || splitFullName(fullName).last_name,
        }
      : splitFullName(fullName)

  const phone = stringValue(prefill.get('phone'))
  const sexRaw = stringValue(prefill.get('sex'))
  const sex: 'Male' | 'Female' = SEX_VALUES.has(sexRaw) ? (sexRaw as 'Male' | 'Female') : 'Male'

  const ageRaw = stringValue(prefill.get('age_bracket'))
  const age_bracket = AGE_BRACKETS.has(ageRaw) ? ageRaw : '13-19'

  const education_level = stringValue(prefill.get('education_level')) || 'JHS 1'
  const highestRaw = stringValue(prefill.get('highest_qualification'))
  const highest_qualification = highestRaw || inferHighestQualification(education_level)

  const timesRaw = prefill.get('times_attended')
  const parsedTimes =
    typeof timesRaw === 'number'
      ? timesRaw
      : Number.parseInt(String(timesRaw ?? ''), 10)
  const times_attended = Number.isFinite(parsedTimes) ? parsedTimes : timesAttended

  const parentName = stringValue(prefill.get('parent_name'))
  const parentContact = stringValue(prefill.get('parent_contact'))

  return {
    camp_year_id: campYearId,
    first_name: names.first_name,
    last_name: names.last_name,
    full_name: fullName || undefined,
    email: stringValue(prefill.get('email')) || undefined,
    phone,
    facebook_username: stringValue(prefill.get('facebook_username')) || undefined,
    sex,
    date_of_birth: stringValue(prefill.get('date_of_birth')) || undefined,
    age_bracket,
    address_school_work: stringValue(prefill.get('address_school_work')) || ' ',
    education_level,
    highest_qualification,
    residence: stringValue(prefill.get('residence')) || ' ',
    times_attended,
    has_nhis_card: parseBooleanAnswer(prefill.get('has_nhis_card')),
    nhis_card_expiry_date: stringValue(prefill.get('nhis_card_expiry_date')) || undefined,
    has_health_challenge: parseBooleanAnswer(prefill.get('has_health_challenge')),
    health_challenges: Array.isArray(prefill.get('health_challenges'))
      ? (prefill.get('health_challenges') as string[])
      : undefined,
    other_health_challenge: stringValue(prefill.get('other_health_challenge')) || undefined,
    parent_name: parentName || 'N/A',
    parent_contact: parentContact || 'N/A',
    role: stringValue(prefill.get('role')) || undefined,
  }
}
