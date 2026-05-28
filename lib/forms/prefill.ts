import type { AppUser, CampRegistration, ChurchFormField } from '@/lib/types'

export type FormPrefillKey =
  | 'first_name'
  | 'last_name'
  | 'full_name'
  | 'email'
  | 'phone'
  | 'facebook_username'
  | 'sex'
  | 'date_of_birth'
  | 'age_bracket'
  | 'residence'
  | 'address_school_work'
  | 'education_level'
  | 'highest_qualification'
  | 'times_attended'
  | 'parent_name'
  | 'parent_contact'
  | 'has_nhis_card'
  | 'nhis_card_expiry_date'
  | 'has_health_challenge'
  | 'health_challenges'
  | 'role'
  | 'is_new_registrant'

export const FORM_PREFILL_KEY_GROUPS: Array<{
  label: string
  keys: Array<{ value: FormPrefillKey | 'none'; label: string; hint?: string }>
}> = [
  {
    label: 'Basic',
    keys: [
      { value: 'none', label: 'No prefill' },
      { value: 'first_name', label: 'First name' },
      { value: 'last_name', label: 'Last name' },
      { value: 'full_name', label: 'Full name' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'facebook_username', label: 'Facebook username' },
      { value: 'sex', label: 'Sex (Male/Female)' },
    ],
  },
  {
    label: 'Location & education',
    keys: [
      { value: 'residence', label: 'Residence' },
      { value: 'address_school_work', label: 'Address / school / work' },
      { value: 'education_level', label: 'Education level' },
      { value: 'highest_qualification', label: 'Highest qualification' },
      { value: 'age_bracket', label: 'Age bracket' },
    ],
  },
  {
    label: 'Camp history',
    keys: [
      { value: 'times_attended', label: 'Times attended (number)' },
      { value: 'is_new_registrant', label: 'Is new registrant (yes/no)' },
      { value: 'role', label: 'Role' },
    ],
  },
  {
    label: 'Health & guardian',
    keys: [
      { value: 'date_of_birth', label: 'Date of birth' },
      { value: 'parent_name', label: 'Parent / guardian name' },
      { value: 'parent_contact', label: 'Parent / guardian phone' },
      { value: 'has_nhis_card', label: 'Has NHIS card (yes/no)' },
      { value: 'nhis_card_expiry_date', label: 'NHIS expiry date' },
      { value: 'has_health_challenge', label: 'Has health challenge (yes/no)' },
      {
        value: 'health_challenges',
        label: 'Health challenges (list)',
        hint: 'Best for checkbox fields with matching option labels',
      },
    ],
  },
]

export const FORM_PREFILL_KEYS = FORM_PREFILL_KEY_GROUPS.flatMap((group) => group.keys)

function isEmpty(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

/** Normalized profile shape for camp + directory prefill. */
export type FormPrefillProfile = {
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
  phone?: string
  facebook_username?: string
  sex?: string
  date_of_birth?: string
  age_bracket?: string
  residence?: string
  address_school_work?: string
  education_level?: string
  highest_qualification?: string
  times_attended?: number
  parent_name?: string
  parent_contact?: string
  has_nhis_card?: boolean
  nhis_card_expiry_date?: string
  has_health_challenge?: boolean
  health_challenges?: string[]
  role?: string
  is_new_registrant?: boolean
}

export function campRegistrationToPrefillProfile(reg: CampRegistration): FormPrefillProfile {
  return {
    first_name: reg.first_name,
    last_name: reg.last_name,
    full_name: reg.full_name,
    email: reg.email,
    phone: reg.phone,
    facebook_username: reg.facebook_username,
    sex: reg.sex,
    date_of_birth: reg.date_of_birth,
    age_bracket: reg.age_bracket,
    residence: reg.residence,
    address_school_work: reg.address_school_work,
    education_level: reg.education_level,
    highest_qualification: reg.highest_qualification,
    times_attended: reg.times_attended,
    parent_name: reg.parent_name,
    parent_contact: reg.parent_contact,
    has_nhis_card: reg.has_nhis_card,
    nhis_card_expiry_date: reg.nhis_card_expiry_date,
    has_health_challenge: reg.has_health_challenge,
    health_challenges: reg.health_challenges,
    role: reg.role,
    is_new_registrant: reg.is_new_registrant,
  }
}

export function appUserToPrefillProfile(user: AppUser): FormPrefillProfile {
  const parts = user.full_name?.trim().split(/\s+/).filter(Boolean) ?? []
  return {
    first_name: user.first_name ?? parts[0],
    last_name: user.last_name ?? (parts.length > 1 ? parts.slice(1).join(' ') : undefined),
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  }
}

export function getProfilePrefillRaw(profile: FormPrefillProfile, key: FormPrefillKey): unknown {
  switch (key) {
    case 'first_name':
      return profile.first_name ?? profile.full_name?.split(' ')[0]
    case 'last_name':
      return profile.last_name ?? profile.full_name?.split(' ').slice(1).join(' ')
    case 'full_name':
      return profile.full_name
    case 'email':
      return profile.email
    case 'phone':
      return profile.phone
    case 'facebook_username':
      return profile.facebook_username
    case 'sex':
      return profile.sex
    case 'date_of_birth':
      return profile.date_of_birth
    case 'age_bracket':
      return profile.age_bracket
    case 'residence':
      return profile.residence
    case 'address_school_work':
      return profile.address_school_work
    case 'education_level':
      return profile.education_level
    case 'highest_qualification':
      return profile.highest_qualification
    case 'times_attended':
      return profile.times_attended
    case 'parent_name':
      return profile.parent_name
    case 'parent_contact':
      return profile.parent_contact
    case 'has_nhis_card':
      return profile.has_nhis_card
    case 'nhis_card_expiry_date':
      return profile.nhis_card_expiry_date
    case 'has_health_challenge':
      return profile.has_health_challenge
    case 'health_challenges':
      return profile.health_challenges
    case 'role':
      return profile.role
    case 'is_new_registrant':
      return profile.is_new_registrant
    default:
      return undefined
  }
}

export function getCampProfilePrefillRaw(profile: CampRegistration, key: FormPrefillKey): unknown {
  return getProfilePrefillRaw(campRegistrationToPrefillProfile(profile), key)
}

function normalizeYesNo(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  const text = String(value).trim().toLowerCase()
  if (text === 'true' || text === 'yes' || text === '1') return true
  if (text === 'false' || text === 'no' || text === '0') return false
  return undefined
}

function matchCheckboxOptions(options: string[], raw: unknown): string[] {
  if (Array.isArray(raw)) {
    const normalized = raw.map((item) => String(item).trim()).filter(Boolean)
    return options.filter((option) =>
      normalized.some((item) => item.toLowerCase() === option.toLowerCase())
    )
  }
  const yesNo = normalizeYesNo(raw)
  if (yesNo === true && options.length > 0) return [options[0]]
  if (yesNo === false) return []
  const text = String(raw).trim()
  if (!text) return []
  const direct = options.filter((option) => option.toLowerCase() === text.toLowerCase())
  return direct
}

/** Map a profile value into the shape expected by a form field type. */
export function applyPrefillToFormField(
  field: ChurchFormField,
  profile: FormPrefillProfile,
  prefillKey: string | undefined
): unknown | undefined {
  if (!prefillKey || prefillKey === 'none') return undefined
  const raw = getProfilePrefillRaw(profile, prefillKey as FormPrefillKey)
  if (isEmpty(raw)) return undefined

  switch (field.field_type) {
    case 'checkbox': {
      if (field.options && field.options.length > 0) {
        const selected = matchCheckboxOptions(field.options, raw)
        return selected.length > 0 ? selected : undefined
      }
      const yesNo = normalizeYesNo(raw)
      return yesNo ?? undefined
    }
    case 'dropdown':
    case 'radio':
    case 'short_text':
    case 'email':
    case 'phone':
    case 'long_text':
    case 'file':
      if (Array.isArray(raw)) return raw.join(', ')
      if (typeof raw === 'boolean') return raw ? 'Yes' : 'No'
      return String(raw)
    case 'number':
      if (typeof raw === 'number') return String(raw)
      if (typeof raw === 'boolean') return raw ? '1' : '0'
      return String(raw)
    case 'date': {
      if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
      return String(raw)
    }
    default:
      return raw
  }
}

export function applyProfilePrefill(
  fields: ChurchFormField[],
  profile: FormPrefillProfile,
  currentValues: Record<string, unknown>,
  options?: { overwrite?: boolean }
): { values: Record<string, unknown>; filledCount: number } {
  const nextValues = { ...currentValues }
  let filledCount = 0
  const overwrite = options?.overwrite ?? false

  for (const field of fields) {
    if (!field.prefill_key) continue
    if (!overwrite && !isEmpty(nextValues[field.id])) continue
    const value = applyPrefillToFormField(field, profile, field.prefill_key)
    if (value === undefined) continue
    nextValues[field.id] = value
    filledCount += 1
  }

  return { values: nextValues, filledCount }
}

export function applyCampProfilePrefill(
  fields: ChurchFormField[],
  profile: CampRegistration,
  currentValues: Record<string, unknown>
): { values: Record<string, unknown>; filledCount: number } {
  return applyProfilePrefill(fields, campRegistrationToPrefillProfile(profile), currentValues)
}
