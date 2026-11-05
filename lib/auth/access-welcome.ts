import { ROLE_LABELS, effectivePermissions, isStaffRole } from '@/lib/auth/roles'
import type { UserRole } from '@/lib/types'

/** Permissions the person has after the change that they did not have before. */
export function gainedPermissions(
  before: { role: UserRole; permissions?: readonly unknown[] | null },
  after: { role: UserRole; permissions?: readonly unknown[] | null }
): string[] {
  const had = new Set(effectivePermissions(before.role, before.permissions))
  return effectivePermissions(after.role, after.permissions).filter((p) => !had.has(p))
}

/** Last three digits of a phone number, for "your number ending 482". */
export function phoneTail(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits.length >= 3 ? digits.slice(-3) : null
}

function firstName(fullName: string | null | undefined): string {
  return (fullName ?? '').trim().split(/\s+/)[0] || 'there'
}

/**
 * The text someone gets when they are given access: what they can now do, where
 * to sign in, and which number to sign in with. No secrets: sign-in is by phone.
 */
export function buildAccessWelcomeSms(args: {
  fullName: string | null | undefined
  role: UserRole
  permissions?: readonly unknown[] | null
  phone: string | null | undefined
  siteUrl: string
}): string {
  const name = firstName(args.fullName)
  const signInUrl = `${args.siteUrl.replace(/\/$/, '')}/auth`
  const tail = phoneTail(args.phone)
  const extras = effectivePermissions(null, args.permissions)

  let what: string
  if (args.role === 'admin') what = "you're now an Administrator on Campus Gem"
  else if (isStaffRole(args.role)) what = `you now have ${ROLE_LABELS[args.role]} access on Campus Gem`
  else if (extras.length === 1 && extras[0] === 'camp.calls') what = "you've been added as a camp caller on Campus Gem"
  else what = "you've been given access on Campus Gem"

  const how = tail ? `with your phone number ending ${tail}` : 'with your phone number'
  const after = !isStaffRole(args.role) && extras.includes('camp.calls') ? ' Then open Calls to see your list.' : ''

  return `Hi ${name}, ${what}. Sign in at ${signInUrl} ${how}. No password needed.${after}`
}
