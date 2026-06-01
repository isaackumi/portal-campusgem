import type { CampRegistration, CampRegistrationForm } from '@/lib/types'
import { extractBirthdayParts } from '@/lib/camp/birthday'
import { collectImportContactWarnings } from '@/lib/camp/import-contact'
import { isValidGhanaPhone, sanitizePhoneInput } from '@/lib/camp/phone'

/** Radix Select cannot use an empty string as an item value. */
export const IGNORE_GOOGLE_FORM_IMPORT_FIELD = '__ignore__'

/** Google Form / Sheets export columns shared across camp years. */
export const GOOGLE_FORM_IMPORT_FIELD_MAPPINGS: Record<string, string[]> = {
  first_name: ['first name', 'firstname', 'fname', 'given name'],
  last_name: ['last name', 'lastname', 'lname', 'surname', 'family name'],
  full_name: ['full name', 'fullname', 'participant name', 'your name', 'name of participant'],
  email: ['email', 'e-mail', 'email address'],
  phone: ['contact number', 'phone number', 'phone', 'mobile', 'tel', 'telephone'],
  facebook_username: ['facebook username', 'facebook'],
  sex: ['sex', 'gender'],
  date_of_birth: ['date of birth', 'dob', 'birthdate', 'birth date'],
  age_bracket: ['age bracket', 'age group'],
  role: ['role', 'participant role', 'type'],
  address_school_work: ['address/school/place of work', 'address/school/work', 'address', 'school', 'work'],
  education_level: ['level at school', 'education level', 'education', 'level'],
  highest_qualification: ['course/highest qualification', 'highest qualification', 'qualification'],
  residence: ['where do you reside', 'residence', 'location', 'town'],
  times_attended: [
    'how many times have you been to the camp',
    'times attended',
    'attendance count',
    'previous attendance',
  ],
  has_nhis_card: ['do you have an nhis card', 'nhis card'],
  nhis_card_expiry_date: ['date of expiration of nhis card', 'nhis expiry', 'nhis expiration'],
  has_health_challenge: ['do you have any peculiar health challenge', 'health challenge'],
  health_challenges: ['please indicate the above health challenge', 'health challenges'],
  parent_name: ["parent's name", 'parent name', 'parent/guardian name', 'guardian name'],
  parent_contact: ["parent's contact number", 'parent contact', 'guardian contact', 'parent phone'],
}

function normalizeImportHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, ' ')
}

function scoreHeaderFieldMatch(header: string, variation: string): number {
  const normalizedHeader = normalizeImportHeader(header)
  const normalizedVariation = variation.toLowerCase().trim()
  if (!normalizedVariation) return 0
  if (normalizedHeader === normalizedVariation) return normalizedVariation.length + 1000
  if (normalizedHeader.includes(normalizedVariation)) return normalizedVariation.length
  return 0
}

export function autoDetectGoogleFormColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}

  headers.forEach((header) => {
    const normalizedHeader = normalizeImportHeader(header)
    if (normalizedHeader === 'timestamp' || normalizedHeader === 'submission time') {
      mapping[header] = IGNORE_GOOGLE_FORM_IMPORT_FIELD
      return
    }
    if (normalizedHeader === 'name') {
      mapping[header] = 'full_name'
      return
    }

    let bestField: string | null = null
    let bestScore = 0

    for (const [field, variations] of Object.entries(GOOGLE_FORM_IMPORT_FIELD_MAPPINGS)) {
      for (const variation of variations) {
        const score = scoreHeaderFieldMatch(header, variation)
        if (score > bestScore) {
          bestScore = score
          bestField = field
        }
      }
    }

    if (bestField && bestScore > 0) {
      mapping[header] = bestField
    }
  })

  return mapping
}

type GoogleFormExportColumn = {
  header: string
  getValue: (registration: CampRegistration) => string | number
}

export const GOOGLE_FORM_EXPORT_COLUMNS: GoogleFormExportColumn[] = [
  { header: 'First Name', getValue: (registration) => registration.first_name ?? '' },
  { header: 'Last Name', getValue: (registration) => registration.last_name ?? '' },
  { header: 'Email', getValue: (registration) => registration.email ?? '' },
  { header: 'Contact Number', getValue: (registration) => registration.phone ?? '' },
  { header: 'Facebook Username', getValue: (registration) => registration.facebook_username ?? '' },
  { header: 'Sex', getValue: (registration) => registration.sex ?? '' },
  { header: 'Date of Birth', getValue: (registration) => registration.date_of_birth ?? '' },
  { header: 'Age Bracket', getValue: (registration) => registration.age_bracket ?? '' },
  { header: 'Role', getValue: (registration) => registration.role ?? '' },
  {
    header: 'Address/School/Place of Work',
    getValue: (registration) => registration.address_school_work ?? '',
  },
  { header: 'Level at School', getValue: (registration) => registration.education_level ?? '' },
  {
    header: 'Course/Highest Qualification',
    getValue: (registration) => registration.highest_qualification ?? '',
  },
  { header: 'Where do you reside', getValue: (registration) => registration.residence ?? '' },
  {
    header: 'How many times have you been to the camp',
    getValue: (registration) => registration.times_attended ?? 0,
  },
  {
    header: 'Do you have an NHIS card',
    getValue: (registration) => (registration.has_nhis_card ? 'Yes' : 'No'),
  },
  {
    header: 'Date of expiration of NHIS card',
    getValue: (registration) => registration.nhis_card_expiry_date ?? '',
  },
  {
    header: 'Do you have any peculiar health challenge',
    getValue: (registration) => (registration.has_health_challenge ? 'Yes' : 'No'),
  },
  {
    header: 'Please indicate the above health challenge',
    getValue: (registration) => (registration.health_challenges ?? []).join('; '),
  },
  { header: "Parent's Name", getValue: (registration) => registration.parent_name ?? '' },
  {
    header: "Parent's Contact Number",
    getValue: (registration) => registration.parent_contact ?? '',
  },
]

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const text = value == null ? '' : String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function campRegistrationsToGoogleFormCsv(registrations: CampRegistration[]): string {
  const headers = GOOGLE_FORM_EXPORT_COLUMNS.map((column) => column.header)
  const rows = registrations.map((registration) =>
    GOOGLE_FORM_EXPORT_COLUMNS.map((column) => escapeCsvCell(column.getValue(registration)))
  )

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

export function mapGoogleFormImportRow(
  row: Record<string, unknown>,
  columnMapping: Record<string, string>
): Partial<CampRegistrationForm> {
  const mapped: Record<string, unknown> = {}

  Object.entries(columnMapping).forEach(([excelCol, dbField]) => {
    if (!dbField || dbField === IGNORE_GOOGLE_FORM_IMPORT_FIELD) return
    const value = row[excelCol]
    if (value !== undefined && value !== null && value !== '') {
      mapped[dbField] = value
    }
  })

  if (mapped.phone != null && mapped.phone !== '') {
    mapped.phone = sanitizePhoneInput(mapped.phone)
  }
  if (mapped.parent_contact != null && mapped.parent_contact !== '') {
    mapped.parent_contact = sanitizePhoneInput(mapped.parent_contact)
  }
  if (!mapped.phone && mapped.parent_contact && isValidGhanaPhone(String(mapped.parent_contact))) {
    mapped.phone = mapped.parent_contact
  }

  if (mapped.times_attended !== undefined && mapped.times_attended !== null && mapped.times_attended !== '') {
    const parsedTimes = String(mapped.times_attended).match(/\d+/)
    mapped.times_attended = parsedTimes ? Number(parsedTimes[0]) : 0
  }

  if (typeof mapped.has_nhis_card === 'string') {
    const value = mapped.has_nhis_card.toLowerCase()
    mapped.has_nhis_card = value === 'yes' || value === 'true'
  }
  if (typeof mapped.has_health_challenge === 'string') {
    const value = mapped.has_health_challenge.toLowerCase()
    mapped.has_health_challenge = value === 'yes' || value === 'true'
  }

  if (mapped.full_name && !mapped.first_name && !mapped.last_name) {
    const parts = String(mapped.full_name).trim().split(/\s+/)
    if (parts.length > 0) {
      mapped.first_name = parts[0]
      mapped.last_name = parts.slice(1).join(' ') || undefined
    }
  }

  if (!mapped.full_name && mapped.first_name && mapped.last_name) {
    mapped.full_name = `${mapped.first_name} ${mapped.last_name}`.trim()
  }

  if (mapped.birth_month == null || mapped.birth_day == null) {
    const birthday = extractBirthdayParts(mapped.date_of_birth)
    if (mapped.birth_month == null && birthday.birth_month != null) {
      mapped.birth_month = birthday.birth_month
    }
    if (mapped.birth_day == null && birthday.birth_day != null) {
      mapped.birth_day = birthday.birth_day
    }
  }

  if (!mapped.role) mapped.role = 'Participant'
  if (mapped.times_attended === undefined || mapped.times_attended === null || mapped.times_attended === '') {
    mapped.times_attended = 0
  }

  mapped.is_new_registrant = (Number(mapped.times_attended) || 0) === 0
  mapped.status = 'registered'
  mapped.payment_status = 'pending'

  return mapped as Partial<CampRegistrationForm>
}

export function isBlankGoogleFormImportRow(row: Record<string, unknown>): boolean {
  return Object.entries(row).every(([key, value]) => {
    if (key.startsWith('_')) return true
    return String(value ?? '').trim() === ''
  })
}

export function isIgnorableGoogleFormImportRow(
  row: Record<string, unknown>,
  columnMapping: Record<string, string>
): boolean {
  if (isBlankGoogleFormImportRow(row)) return true

  const mapped = mapGoogleFormImportRow(row, columnMapping)
  const hasName = Boolean(mapped.first_name || mapped.last_name || mapped.full_name)
  const hasPhone = Boolean(mapped.phone) || isValidGhanaPhone(String(mapped.parent_contact ?? ''))
  return !hasName && !hasPhone
}

export type GoogleFormImportValidation = {
  /** Must be fixed before import can proceed. */
  blocking: string[]
  /** Contact issues — row can still be imported. */
  warnings: string[]
}

export function validateGoogleFormImportRow(
  mapped: Partial<CampRegistrationForm>
): GoogleFormImportValidation {
  const blocking: string[] = []
  const warnings: string[] = []

  if (!mapped.first_name && !mapped.full_name && !mapped.last_name) {
    blocking.push('Name is required (first_name, last_name, or full_name)')
  }

  const contactWarnings = collectImportContactWarnings(mapped.phone, mapped.email)
  warnings.push(...contactWarnings)

  return { blocking, warnings }
}
