/**
 * Calling session: live ──end──▶ ended (final). `status` and `ended_at` always move together
 * (endSessionWithSecret). Only one live session per list (startSessionWithSecret returns the live
 * one). An ended session takes no new people, presence or settings; a call already in progress can
 * still be saved on the registration (claims run out on their own).
 */
export type CallSessionStatus = 'live' | 'ended'

export function isLiveSession(session: { status: CallSessionStatus } | null | undefined): boolean {
  return session?.status === 'live'
}

/** Why a change to a session is refused; null when it is live. */
export function sessionChangeError(session: { status: CallSessionStatus } | null | undefined): string | null {
  if (!session) return 'That calling session no longer exists.'
  return session.status === 'live' ? null : 'This calling session has ended. Start a new one.'
}
