import { query } from './_generated/server'
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { assertServerSecret } from './lib/serverSecret'
import { phoneLookupVariants } from './lib/phone'

/**
 * Everything the "My GEM" page shows for one person, in one round trip.
 * The Next.js action passes the session user's own id; never a client-supplied one.
 * Returns raw docs for the bridge to map (it strips auth_uid and other secrets).
 */
export const getMyGemWithSecret = query({
  args: { secret: v.string(), user_id: v.id('users'), since: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, user_id, since }) => {
    assertServerSecret(secret)
    const user = await ctx.db.get(user_id)
    if (!user) return null

    const member = await ctx.db
      .query('members')
      .withIndex('by_user_id', (q) => q.eq('user_id', String(user_id)))
      .first()

    // Groups
    const groups: Array<{ id: string; name: string; group_type: string; role: string; joined_date: string }> = []
    if (member) {
      const memberships = await ctx.db
        .query('group_memberships')
        .withIndex('by_member_id', (q) => q.eq('member_id', String(member._id)))
        .collect()
      for (const m of memberships) {
        if (!m.is_active) continue
        const groupId = ctx.db.normalizeId('groups', m.group_id)
        const group = groupId ? await ctx.db.get(groupId) : null
        if (!group || !group.is_active) continue
        groups.push({
          id: String(group._id),
          name: group.name,
          group_type: group.group_type,
          role: m.role,
          joined_date: m.joined_date,
        })
      }
    }

    // Attendance service dates since `since` (YYYY-MM-DD)
    const attendanceDates: string[] = []
    if (member) {
      const rows = await ctx.db
        .query('attendance')
        .withIndex('by_member_and_date', (q) =>
          q.eq('member_id', String(member._id)).gte('service_date', since)
        )
        .take(500)
      for (const row of rows) {
        if (row.is_duplicate) continue
        if (row.status === 'absent') continue
        attendanceDates.push(row.service_date)
      }
    }

    // Active camp year registration, matched by phone
    let camp: {
      year: Doc<'camp_years'>
      registration: Doc<'camp_registrations'> | null
      room_name: string | null
    } | null = null
    const year = await ctx.db
      .query('camp_years')
      .withIndex('by_active', (q) => q.eq('is_active', true))
      .first()
    if (year) {
      let registration: Doc<'camp_registrations'> | null = null
      const phones = [user.phone, user.secondary_phone].filter((p): p is string => Boolean(p))
      outer: for (const phone of phones) {
        for (const variant of phoneLookupVariants(phone)) {
          const rows = await ctx.db
            .query('camp_registrations')
            .withIndex('by_camp_year_phone', (q) =>
              q.eq('camp_year_id', String(year._id)).eq('phone', variant)
            )
            .collect()
          const live = rows.find((r) => r.status !== 'cancelled') ?? rows[0]
          if (live) {
            registration = live
            break outer
          }
        }
      }
      let roomName: string | null = null
      if (registration?.room_id) {
        const roomId = ctx.db.normalizeId('camp_rooms', registration.room_id)
        const room = roomId ? await ctx.db.get(roomId) : null
        roomName = room?.name || null
      }
      camp = { year, registration, room_name: roomName }
    }

    // Household: names only
    let household: { id: string; name: string; members: Array<{ id: string; full_name: string }> } | null = null
    if (user.household_id) {
      const h = await ctx.db.get(user.household_id as Id<'households'>)
      if (h) {
        const people = await ctx.db
          .query('users')
          .withIndex('by_household', (q) => q.eq('household_id', h._id))
          .collect()
        household = {
          id: String(h._id),
          name: h.name,
          members: people.map((p) => ({ id: String(p._id), full_name: p.full_name })),
        }
      }
    }

    return { user, member, groups, attendanceDates, camp, household }
  },
})
