/** Camp registration / ministry roles assignable by admins after signup. */
export const CAMP_REGISTRATION_ROLES = [
  'Participant',
  'Protocol',
  'Music',
  'Cook',
  'Usher',
  'Security',
  'Media',
  'Medical',
  'Transport',
  'Worker',
  'Volunteer',
  'Staff',
] as const

export type CampRegistrationRole = (typeof CAMP_REGISTRATION_ROLES)[number]

export function isKnownCampRegistrationRole(value: string): value is CampRegistrationRole {
  return (CAMP_REGISTRATION_ROLES as readonly string[]).includes(value)
}

/** Options for selects — includes current custom role if not in the list. */
export function campRegistrationRoleOptions(current?: string | null): string[] {
  const roles = [...CAMP_REGISTRATION_ROLES] as string[]
  const trimmed = current?.trim()
  if (trimmed && !roles.includes(trimmed)) {
    roles.unshift(trimmed)
  }
  return roles
}
