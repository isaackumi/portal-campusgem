import type { AppUser, Member } from '@/lib/types'

/**
 * What a member may change about themselves on "My GEM". The phone is their sign-in,
 * so phone, secondary phone, role, permissions and membership ID are never editable here.
 */
export type MyDetailsInput = {
  email?: string
  address?: string
  area_of_residence?: string
  occupation?: string
  place_of_work?: string
  marital_status?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
}

export const MARITAL_STATUSES = ['single', 'married', 'divorced', 'widowed', 'separated'] as const

const MAX_LEN = 200
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value: unknown): string | undefined {
  if (value == null) return undefined
  if (typeof value !== 'string') return undefined
  return value.trim().slice(0, MAX_LEN)
}

export type SanitizedMyDetails = {
  user: Pick<
    Partial<AppUser>,
    | 'email'
    | 'occupation'
    | 'place_of_work'
    | 'marital_status'
    | 'emergency_contact_name'
    | 'emergency_contact_phone'
    | 'emergency_contact_relation'
  >
  member: Pick<Partial<Member>, 'address' | 'area_of_residence'>
}

/**
 * Keep only the allowed fields (any other key, e.g. `phone` or `role`, is dropped) and
 * validate them. Throws a friendly message on bad input.
 */
export function sanitizeMyDetails(input: unknown): SanitizedMyDetails {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const user: SanitizedMyDetails['user'] = {}
  const member: SanitizedMyDetails['member'] = {}

  const email = clean(raw.email)
  if (email !== undefined) {
    if (email && !EMAIL_RE.test(email)) throw new Error('Enter a valid email address.')
    user.email = email
  }

  for (const key of [
    'occupation',
    'place_of_work',
    'emergency_contact_name',
    'emergency_contact_phone',
    'emergency_contact_relation',
  ] as const) {
    const value = clean(raw[key])
    if (value !== undefined) user[key] = value
  }

  if ('marital_status' in raw) {
    const value = clean(raw.marital_status)
    if (value && !(MARITAL_STATUSES as readonly string[]).includes(value)) {
      throw new Error('Choose a marital status from the list.')
    }
    // Present but empty clears it (see updateUserInConvex).
    user.marital_status = (value || undefined) as AppUser['marital_status']
  }

  for (const key of ['address', 'area_of_residence'] as const) {
    const value = clean(raw[key])
    if (value !== undefined) member[key] = value
  }

  return { user, member }
}

/** A plain member or visitor: no staff role and no extra grants. */
export function isPlainMember(user: Pick<AppUser, 'role' | 'permissions'> | null | undefined): boolean {
  if (!user) return false
  if (user.role !== 'member' && user.role !== 'visitor') return false
  return !(user.permissions && user.permissions.length > 0)
}
