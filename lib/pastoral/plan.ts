/**
 * Weekly pastoral run planner (pure): who is lapsed, who gets told, and the exact text.
 *
 * Ids: `members[].id`, `attendance.member_id` and `memberships.member_id` are `members`
 * doc ids; `groups.leader_id` / `co_leader_id`, `members[].user_id` and the fallback
 * contacts are `users` ids.
 */
import {
  DEFAULT_ABSENCE_RULE,
  assessAbsence,
  countedSundaysFor,
  shouldAlert,
  summariseSundays,
  sundayOf,
  toIsoDate,
  type AbsenceRule,
  type AttendanceRowLite,
  type PriorAlert,
} from '@/lib/pastoral/absence'
import {
  birthdaysInNextDays,
  buildLeaderMessage,
  firstName,
  type AlertEntry,
  type GroupDigest,
} from '@/lib/pastoral/leader-message'

export type PastoralSettings = {
  /** False until an admin saves the settings once: nothing is sent on a schedule before that. */
  configured: boolean
  alerts_enabled: boolean
  digest_enabled: boolean
  weeks_threshold: number
  fallback_user_ids: string[]
}

export const DEFAULT_PASTORAL_SETTINGS: PastoralSettings = {
  configured: false,
  alerts_enabled: true,
  digest_enabled: true,
  weeks_threshold: DEFAULT_ABSENCE_RULE.missedWeeks,
  fallback_user_ids: [],
}

export type SnapshotMember = {
  id: string
  user_id: string
  status: string
  congregation?: string | null
  dob?: string | null
}
export type SnapshotUser = {
  id: string
  full_name: string
  first_name?: string | null
  phone?: string | null
  role: string
}
export type SnapshotGroup = { id: string; name: string; leader_id?: string | null; co_leader_id?: string | null }
export type SnapshotMembership = { group_id: string; member_id: string; role: string }

export type PastoralSnapshot = {
  members: SnapshotMember[]
  users: SnapshotUser[]
  /** Active groups only. */
  groups: SnapshotGroup[]
  /** Active memberships only. */
  memberships: SnapshotMembership[]
  attendance: AttendanceRowLite[]
  /** Latest alert per member id. */
  priorAlerts: Record<string, PriorAlert>
}

export type LapsedMember = {
  member_id: string
  user_id: string
  name: string
  phone: string | null
  streak: number
  last_seen: string | null
  groups: string[]
  /** Would be (or was) alerted this run. */
  alert_due: boolean
  last_alerted_at: number | null
}

export type PlannedMessage = {
  user_id: string
  name: string
  phone: string
  text: string
  segments?: number
  /** Members whose alert is in this text. */
  alert_member_ids: string[]
  groups: string[]
  /** Fallback contact rather than a group leader. */
  fallback: boolean
}

export type PastoralPlan = {
  as_of: string
  last_sunday: string
  lapsed: LapsedMember[]
  messages: PlannedMessage[]
  /** Alerts to record once a text carrying them is sent. */
  alerts: Array<{ member_id: string; streak: number; last_seen: string | null }>
  skipped: { no_phone: Array<{ user_id: string; name: string }>; no_recipient: string[] }
}

export function planPastoralRun(
  snapshot: PastoralSnapshot,
  settings: Pick<PastoralSettings, 'alerts_enabled' | 'digest_enabled' | 'weeks_threshold' | 'fallback_user_ids'>,
  options: { now: Date; isValidPhone: (phone: string | null | undefined) => boolean; rule?: Partial<AbsenceRule> }
): PastoralPlan {
  const rule: AbsenceRule = {
    ...DEFAULT_ABSENCE_RULE,
    ...options.rule,
    missedWeeks: Math.max(1, Math.round(settings.weeks_threshold || DEFAULT_ABSENCE_RULE.missedWeeks)),
  }
  const asOf = toIsoDate(options.now)
  const lastSunday = sundayOf(asOf) ?? asOf
  const summary = summariseSundays(snapshot.attendance)

  const userById = new Map(snapshot.users.map((u) => [u.id, u]))
  const memberById = new Map(snapshot.members.map((m) => [m.id, m]))
  const groupById = new Map(snapshot.groups.map((g) => [g.id, g]))

  // Group -> leader user ids (group record plus leader/co-leader memberships).
  const leadersByGroup = new Map<string, Set<string>>()
  const membersByGroup = new Map<string, Set<string>>()
  const groupsByMember = new Map<string, Set<string>>()
  for (const g of snapshot.groups) {
    const set = new Set<string>()
    if (g.leader_id) set.add(g.leader_id)
    if (g.co_leader_id) set.add(g.co_leader_id)
    leadersByGroup.set(g.id, set)
    membersByGroup.set(g.id, new Set())
  }
  for (const gm of snapshot.memberships) {
    if (!groupById.has(gm.group_id)) continue
    membersByGroup.get(gm.group_id)!.add(gm.member_id)
    let gs = groupsByMember.get(gm.member_id)
    if (!gs) groupsByMember.set(gm.member_id, (gs = new Set()))
    gs.add(gm.group_id)
    if (gm.role === 'leader' || gm.role === 'co_leader') {
      const uid = memberById.get(gm.member_id)?.user_id
      if (uid) leadersByGroup.get(gm.group_id)!.add(uid)
    }
  }

  const nameOf = (m: SnapshotMember) => userById.get(m.user_id)?.full_name?.trim() || 'A member'
  const firstOf = (m: SnapshotMember) => {
    const u = userById.get(m.user_id)
    return firstName(u?.full_name ?? 'Member', u?.first_name)
  }

  // 1. Who is lapsed.
  const lapsed: LapsedMember[] = []
  const lapsedIds = new Set<string>()
  for (const m of snapshot.members) {
    if (m.status !== 'active') continue
    const counted = countedSundaysFor(summary, m.id, m.congregation, asOf)
    const a = assessAbsence(counted, summary.attended.get(m.id), rule)
    if (!a.lapsed) continue
    const prior = snapshot.priorAlerts[m.id]
    const groups = Array.from(groupsByMember.get(m.id) ?? [])
      .map((gid) => groupById.get(gid)?.name)
      .filter((n): n is string => Boolean(n))
    lapsedIds.add(m.id)
    lapsed.push({
      member_id: m.id,
      user_id: m.user_id,
      name: nameOf(m),
      phone: userById.get(m.user_id)?.phone?.trim() || null,
      streak: a.streak,
      last_seen: a.lastSeen,
      groups,
      alert_due: settings.alerts_enabled && shouldAlert(a, prior),
      last_alerted_at: prior?.alerted_at ?? null,
    })
  }
  lapsed.sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name))

  // 2. Build each recipient's bundle.
  type Bundle = { user: SnapshotUser; alerts: LapsedMember[]; groups: string[]; fallback: boolean }
  const bundles = new Map<string, Bundle>()
  const bundleFor = (uid: string, fallback: boolean): Bundle | null => {
    const user = userById.get(uid)
    if (!user) return null
    let b = bundles.get(uid)
    if (!b) bundles.set(uid, (b = { user, alerts: [], groups: [], fallback }))
    if (!fallback) b.fallback = false
    return b
  }

  const fallbackIds = settings.fallback_user_ids.length
    ? settings.fallback_user_ids.filter((id) => userById.has(id))
    : snapshot.users.filter((u) => u.role === 'pastor').map((u) => u.id)

  const noRecipient: string[] = []
  for (const l of lapsed) {
    if (!l.alert_due) continue
    const leaders = new Set<string>()
    groupsByMember.get(l.member_id)?.forEach((gid) => {
      leadersByGroup.get(gid)?.forEach((uid) => {
        if (uid !== l.user_id) leaders.add(uid)
      })
    })
    const reachable = Array.from(leaders).filter((uid) => options.isValidPhone(userById.get(uid)?.phone))
    const targets = reachable.length ? reachable : fallbackIds.filter((uid) => uid !== l.user_id)
    const isFallback = reachable.length === 0
    if (!targets.length) {
      noRecipient.push(l.name)
      continue
    }
    for (const uid of targets) bundleFor(uid, isFallback)?.alerts.push(l)
  }

  // 3. Digest: every leader of an active group.
  const digestsByLeader = new Map<string, Array<{ groupId: string }>>()
  if (settings.digest_enabled) {
    for (const g of snapshot.groups) {
      leadersByGroup.get(g.id)?.forEach((uid) => {
        if (!bundleFor(uid, false)) return
        const list = digestsByLeader.get(uid) ?? []
        list.push({ groupId: g.id })
        digestsByLeader.set(uid, list)
      })
    }
  }

  const recordedLastSunday = summary.recorded.rlc.has(lastSunday) || summary.recorded.campus_gem.has(lastSunday)
  const now = options.now

  const messages: PlannedMessage[] = []
  const noPhone: PastoralPlan['skipped']['no_phone'] = []
  for (const [uid, b] of Array.from(bundles.entries())) {
    const selfMemberIds = new Set(snapshot.members.filter((m) => m.user_id === uid).map((m) => m.id))
    const alertIds = new Set(b.alerts.map((a) => a.member_id))
    const digests: GroupDigest[] = []
    for (const { groupId } of digestsByLeader.get(uid) ?? []) {
      const g = groupById.get(groupId)!
      const ids = Array.from(membersByGroup.get(groupId) ?? []).filter((id) => memberById.get(id)?.status === 'active')
      const others = ids.filter((id) => !selfMemberIds.has(id)).map((id) => memberById.get(id)!)
      const present = recordedLastSunday ? ids.filter((id) => summary.attended.get(id)?.has(lastSunday)).length : null
      const birthdays = birthdaysInNextDays(
        others.map((m) => ({ name: firstOf(m), dob: m.dob })),
        now,
        7
      ).map(({ name, day }) => ({ name, day }))
      const missing = others.filter((m) => lapsedIds.has(m.id) && !alertIds.has(m.id)).map(firstOf)
      if (present == null && !birthdays.length && !missing.length) continue
      digests.push({ groupName: g.name, present, total: ids.length, birthdays, missing })
      b.groups.push(g.name)
    }
    if (!digests.length && !b.alerts.length) continue
    if (!options.isValidPhone(b.user.phone)) {
      noPhone.push({ user_id: uid, name: b.user.full_name })
      continue
    }
    const alerts: AlertEntry[] = b.alerts.map((a) => ({ name: a.name, weeks: a.streak, lastSeen: a.last_seen, phone: a.phone }))
    const text = buildLeaderMessage({ digests, alerts, missedWeeks: rule.missedWeeks })
    if (!text) continue
    messages.push({
      user_id: uid,
      name: b.user.full_name,
      phone: b.user.phone!.trim(),
      text,
      alert_member_ids: Array.from(alertIds),
      groups: b.groups,
      fallback: b.fallback,
    })
  }
  messages.sort((a, b) => a.name.localeCompare(b.name))

  const alerts = lapsed
    .filter((l) => l.alert_due && messages.some((m) => m.alert_member_ids.includes(l.member_id)))
    .map((l) => ({ member_id: l.member_id, streak: l.streak, last_seen: l.last_seen }))

  return {
    as_of: asOf,
    last_sunday: lastSunday,
    lapsed,
    messages,
    alerts,
    skipped: { no_phone: noPhone, no_recipient: noRecipient },
  }
}
