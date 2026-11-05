import 'server-only'

import { getConvexHttpClient } from '@/lib/convex/http-client'
import {
  convexMemberDocToMember,
  convexUserDocToAppUser,
  requireCoreServerSecret,
} from '@/lib/convex/core-bridge'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type { MyGem } from '@/lib/me/types'

type Raw = {
  user: Record<string, unknown>
  member: Record<string, unknown> | null
  groups: MyGem['groups']
  attendanceDates: string[]
  camp: {
    year: Record<string, unknown>
    registration: Record<string, unknown> | null
    room_name: string | null
  } | null
  household: { id: string; name: string; members: Array<{ id: string; full_name: string }> } | null
} | null

const str = (value: unknown) => (value != null && value !== '' ? String(value) : undefined)

/** Load one person's own page. `userId` must come from the session, never from the client. */
export async function fetchMyGemFromConvex(userId: string, since: string): Promise<MyGem | null> {
  const raw = (await getConvexHttpClient().query(api.myGem.getMyGemWithSecret, {
    secret: requireCoreServerSecret(),
    user_id: userId as Id<'users'>,
    since,
  })) as Raw
  if (!raw) return null
  const user = convexUserDocToAppUser(raw.user)
  if (!user) return null

  const reg = raw.camp?.registration
  return {
    user,
    member: convexMemberDocToMember(raw.member),
    groups: raw.groups ?? [],
    attendanceDates: raw.attendanceDates ?? [],
    camp: raw.camp
      ? {
          year: {
            id: String(raw.camp.year._id),
            year: Number(raw.camp.year.year),
            theme: String(raw.camp.year.theme ?? ''),
            start_date: String(raw.camp.year.start_date ?? ''),
            end_date: String(raw.camp.year.end_date ?? ''),
            venue: str(raw.camp.year.venue),
            registration_open: Boolean(raw.camp.year.registration_open),
          },
          // Picked field by field: confirm_token and staff notes never leave the server.
          registration: reg
            ? {
                id: String(reg._id),
                full_name: String(reg.full_name ?? ''),
                status: (reg.status as 'registered' | 'checked_in' | 'cancelled') ?? 'registered',
                payment_status: str(reg.payment_status),
                attendance_confirmation: str(reg.attendance_confirmation),
                check_in_code: str(reg.check_in_code),
                room_name: raw.camp.room_name ?? undefined,
              }
            : null,
        }
      : null,
    household: raw.household ? { name: raw.household.name, members: raw.household.members } : null,
  }
}
