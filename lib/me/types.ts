import type { AppUser, Member } from '@/lib/types'

/** Data for the signed-in person's own "My GEM" page. Contains no secrets. */
export type MyGem = {
  user: AppUser
  member: Member | null
  groups: Array<{ id: string; name: string; group_type: string; role: string; joined_date: string }>
  /** Service dates attended in the last year (YYYY-MM-DD). */
  attendanceDates: string[]
  camp: {
    year: {
      id: string
      year: number
      theme: string
      start_date: string
      end_date: string
      venue?: string
      registration_open: boolean
    }
    registration: {
      id: string
      full_name: string
      status: 'registered' | 'checked_in' | 'cancelled'
      payment_status?: string
      attendance_confirmation?: string
      check_in_code?: string
      room_name?: string
    } | null
  } | null
  /** Names only: other people's private details are not shown here. */
  household: { name: string; members: Array<{ id: string; full_name: string }> } | null
}
