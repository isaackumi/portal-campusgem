import type { BadgeProps } from '@/components/ui/badge'

/**
 * Badge tones for the app's recurring labels, so a role or status looks the same on
 * every page. Colour is reserved for what needs attention; everything else is neutral.
 */
export type ChipTone = NonNullable<BadgeProps['variant']>

export function roleTone(role: string | null | undefined): ChipTone {
  switch (role) {
    case 'admin':
      return 'brand'
    case 'pastor':
    case 'elder':
    case 'finance_officer':
      return 'secondary'
    default:
      return 'outline'
  }
}

export function memberStatusTone(status: string | null | undefined): ChipTone {
  switch (status) {
    case 'active':
      return 'success'
    case 'transferred':
      return 'warning'
    case 'inactive':
      return 'secondary'
    default:
      return 'outline'
  }
}

/** Role inside a group (leader, co-leader…). */
export function groupRoleTone(role: string | null | undefined): ChipTone {
  switch (role) {
    case 'leader':
      return 'brand'
    case 'co_leader':
    case 'executive':
      return 'secondary'
    default:
      return 'outline'
  }
}

/** "finance_officer" → "finance officer"; pair with `capitalize`. */
export function chipLabel(value: string | null | undefined, fallback = ''): string {
  return (value || fallback).replace(/_/g, ' ')
}
