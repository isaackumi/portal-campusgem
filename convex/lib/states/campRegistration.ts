/**
 * Camp registration: the explicit state machines. Pure, shared by Convex mutations (which enforce
 * them) and the app (which reads them to decide what to show). Change a registration's state only
 * through these rules; see AGENTS.md "State machines".
 *
 *   status:                 registered ──check in──▶ checked_in
 *                               │  ▲                    │
 *                        cancel │  │ reinstate          │ undo check-in
 *                               ▼  │                    ▼
 *                            cancelled              registered
 *
 *   A cancelled registration must be reinstated before it can be checked in (the desk sees why).
 *
 *   attendance_confirmation (the "are you still coming?" answer) can move between any answers,
 *   but only while the registration is `registered`: not once cancelled or already at camp.
 */

export type RegistrationStatus = 'registered' | 'checked_in' | 'cancelled'
export type AttendanceConfirmation = 'unconfirmed' | 'confirmed' | 'maybe' | 'declined' | 'unreachable'
export type FollowUpStatus = 'pending' | 'in_progress' | 'completed'
export type PaymentStatus = 'pending' | 'paid' | 'confirmed' | 'refunded'

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  registered: 'Registered',
  checked_in: 'Checked in',
  cancelled: 'Cancelled',
}

const REGISTRATION_TRANSITIONS: Record<RegistrationStatus, readonly RegistrationStatus[]> = {
  registered: ['checked_in', 'cancelled'],
  checked_in: ['registered', 'cancelled'],
  cancelled: ['registered'],
}

/** Why a status change is refused, in words for the person at the desk; null when it is allowed. */
export function registrationStatusChangeError(from: RegistrationStatus, to: RegistrationStatus): string | null {
  if (from === to) return null
  if (REGISTRATION_TRANSITIONS[from]?.includes(to)) return null
  if (from === 'cancelled' && to === 'checked_in') {
    return 'This registration was cancelled. Reinstate it (set it back to Registered) before checking them in.'
  }
  return `A registration can’t go from ${REGISTRATION_STATUS_LABELS[from]} to ${REGISTRATION_STATUS_LABELS[to]}.`
}

export function canChangeRegistrationStatus(from: RegistrationStatus, to: RegistrationStatus): boolean {
  return registrationStatusChangeError(from, to) === null
}

/** Session check-in: only people who haven't cancelled. */
export function checkInError(status: RegistrationStatus): string | null {
  return status === 'cancelled'
    ? 'This registration was cancelled. Reinstate it (set it back to Registered) before checking them in.'
    : null
}

/** Recording what someone said on a call (or by their confirm link): only while they are still registered. */
export function callOutcomeError(status: RegistrationStatus): string | null {
  if (status === 'cancelled') return 'This registration was cancelled, so there is nothing to confirm.'
  if (status === 'checked_in') return 'They are already checked in at camp.'
  return null
}

/** An answer that settles the call (no more calling needed). */
export function isSettledConfirmation(outcome: AttendanceConfirmation | undefined): boolean {
  return outcome === 'confirmed' || outcome === 'declined'
}

/** Follow-up as the app reads it: unset means pending, everywhere. */
export function followUpStatusOf(reg: { follow_up_status?: FollowUpStatus | null }): FollowUpStatus {
  return reg.follow_up_status ?? 'pending'
}

/** Paid, as every count in the app means it: paid, or paid and confirmed by finance. */
export function isPaid(status: PaymentStatus | null | undefined): boolean {
  return status === 'paid' || status === 'confirmed'
}
