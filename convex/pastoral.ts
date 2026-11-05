import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { assertServerSecret } from './lib/serverSecret'

/**
 * Missed-church alerts and the weekly leader summary. Planning happens in
 * lib/pastoral/plan.ts; these functions only read slim data and record what was sent.
 */

export const getPastoralSettingsWithSecret = query({
  args: { secret: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    return await ctx.db.query('pastoral_settings').first()
  },
})

export const savePastoralSettingsWithSecret = mutation({
  args: {
    secret: v.string(),
    alerts_enabled: v.boolean(),
    digest_enabled: v.boolean(),
    weeks_threshold: v.number(),
    fallback_user_ids: v.array(v.string()),
    updated_by: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { secret, ...settings }) => {
    assertServerSecret(secret)
    const existing = await ctx.db.query('pastoral_settings').first()
    const row = { ...settings, updated_at: Date.now() }
    if (existing) await ctx.db.patch('pastoral_settings', existing._id, row)
    else await ctx.db.insert('pastoral_settings', row)
    return null
  },
})

export const recordPastoralRunWithSecret = mutation({
  args: { secret: v.string(), summary: v.any() },
  returns: v.null(),
  handler: async (ctx, { secret, summary }) => {
    assertServerSecret(secret)
    const existing = await ctx.db.query('pastoral_settings').first()
    if (existing) {
      await ctx.db.patch('pastoral_settings', existing._id, { last_run_at: Date.now(), last_run_summary: summary })
    }
    return null
  },
})

/** Sunday attendance since `since` (ISO date), trimmed to what the planner needs. */
export const listPastoralAttendanceWithSecret = query({
  args: { secret: v.string(), since: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret, since }) => {
    assertServerSecret(secret)
    const rows = await ctx.db
      .query('attendance')
      .withIndex('by_service_date', (q) => q.gte('service_date', since))
      .collect()
    return rows
      .filter((r) => !r.visitor_id && (!r.service_type || r.service_type === 'sunday_service'))
      .map((r) => ({
        member_id: r.member_id,
        service_date: r.service_date,
        service_type: r.service_type,
        congregation: r.congregation,
        status: r.status ?? (r.metadata as { status?: string } | undefined)?.status,
      }))
  },
})

/** People, active groups and memberships, and the latest alert per member. */
export const getPastoralPeopleWithSecret = query({
  args: { secret: v.string() },
  returns: v.any(),
  handler: async (ctx, { secret }) => {
    assertServerSecret(secret)
    const [members, users, groups, memberships, alerts] = await Promise.all([
      ctx.db.query('members').collect(),
      ctx.db.query('users').collect(),
      ctx.db
        .query('groups')
        .withIndex('by_active', (q) => q.eq('is_active', true))
        .collect(),
      ctx.db.query('group_memberships').collect(),
      ctx.db.query('pastoral_alerts').collect(),
    ])
    const latest: Record<string, { alerted_at: number; streak: number; last_seen?: string }> = {}
    for (const a of alerts) {
      const prev = latest[a.member_id]
      if (!prev || a.alerted_at > prev.alerted_at) {
        latest[a.member_id] = { alerted_at: a.alerted_at, streak: a.streak, last_seen: a.last_seen }
      }
    }
    return {
      members: members.map((m) => ({
        id: String(m._id),
        user_id: m.user_id,
        status: m.status,
        congregation: m.congregation,
        dob: m.dob,
      })),
      // Only what the texts need: never auth_uid or other user fields.
      users: users
        .filter((u) => !u.merged_into)
        .map((u) => ({
          id: String(u._id),
          full_name: u.full_name,
          first_name: u.first_name,
          phone: u.phone,
          role: u.role,
        })),
      groups: groups.map((g) => ({
        id: String(g._id),
        name: g.name,
        leader_id: g.leader_id,
        co_leader_id: g.co_leader_id,
      })),
      memberships: memberships
        .filter((gm) => gm.is_active)
        .map((gm) => ({ group_id: gm.group_id, member_id: gm.member_id, role: gm.role })),
      priorAlerts: latest,
    }
  },
})

export const recordPastoralAlertsWithSecret = mutation({
  args: {
    secret: v.string(),
    alerts: v.array(
      v.object({
        member_id: v.string(),
        streak: v.number(),
        last_seen: v.optional(v.string()),
        recipients: v.optional(v.array(v.string())),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, { secret, alerts }) => {
    assertServerSecret(secret)
    const now = Date.now()
    for (const a of alerts) await ctx.db.insert('pastoral_alerts', { ...a, alerted_at: now })
    return null
  },
})
