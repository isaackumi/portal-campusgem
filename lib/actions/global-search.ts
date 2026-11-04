'use server'

/**
 * Search behind the ⌘K palette: people, this year's campers and groups.
 * Results are limited to what the signed-in user is allowed to open.
 */
import { guard } from '@/lib/auth/action-guard'
import { hasPermission } from '@/lib/auth/roles'
import type { AppUser, CampRegistration, Group, Member } from '@/lib/types'

export type SearchHit = {
  id: string
  kind: 'person' | 'camper' | 'group'
  title: string
  subtitle?: string
  href: string
  /** Shown in mono (membership ID, check-in code). */
  code?: string
}

type Snapshot = {
  at: number
  users: AppUser[]
  members: Member[]
  groups: Group[]
  campers: CampRegistration[]
  campYear: number | null
}

// Directory data changes slowly; a short shared cache keeps typing snappy.
const TTL_MS = 30_000
let snapshot: Snapshot | null = null
let inflight: Promise<Snapshot> | null = null

async function loadSnapshot(): Promise<Snapshot> {
  if (snapshot && Date.now() - snapshot.at < TTL_MS) return snapshot
  if (inflight) return inflight
  inflight = (async () => {
    const core = await import('@/lib/convex/core-bridge')
    const camp = await import('@/lib/convex/camp-bridge')
    const [users, members, groups, year] = await Promise.all([
      core.fetchUsersFromConvex().catch(() => [] as AppUser[]),
      core.fetchMembersFromConvex().catch(() => [] as Member[]),
      core.fetchGroupsFromConvex().catch(() => [] as Group[]),
      camp.fetchActiveCampYearFromConvex().catch(() => null),
    ])
    const campers = year ? await camp.fetchRegistrationsFromConvex(year.id).catch(() => []) : []
    snapshot = { at: Date.now(), users, members, groups, campers, campYear: year?.year ?? null }
    return snapshot
  })().finally(() => {
    inflight = null
  })
  return inflight
}

function normalize(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
}

function digits(s: string | null | undefined): string {
  return (s ?? '').replace(/\D/g, '')
}

/** Score a candidate: 3 = starts with, 2 = word starts with, 1 = contains, 0 = no match. */
function score(query: string, fields: Array<string | null | undefined>, phones: Array<string | null | undefined> = []): number {
  const q = normalize(query).trim()
  if (!q) return 0
  let best = 0
  const parts = q.split(/\s+/)
  for (const field of fields) {
    const f = normalize(field)
    if (!f) continue
    if (f.startsWith(q)) best = Math.max(best, 3)
    else if (parts.every((p) => f.split(/[\s\-_.]+/).some((w) => w.startsWith(p)))) best = Math.max(best, 2)
    else if (parts.every((p) => f.includes(p))) best = Math.max(best, 1)
  }
  const qd = digits(query)
  if (qd.length >= 3) {
    // Match 024… and +23324… forms of the same number.
    const tail = qd.replace(/^233/, '').replace(/^0/, '')
    for (const phone of phones) {
      const pd = digits(phone).replace(/^233/, '').replace(/^0/, '')
      if (pd && tail && pd.includes(tail)) best = Math.max(best, pd.startsWith(tail) ? 3 : 2)
    }
  }
  return best
}

function top<T>(items: Array<{ item: T; s: number }>, n: number): T[] {
  return items
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.item)
}

export async function globalSearchAction(query: string): Promise<{ data: SearchHit[]; error: string | null }> {
  try {
    const user = await guard('dashboard.view')
    const q = query.trim()
    if (q.length < 2 || !process.env.NEXT_PUBLIC_CONVEX_URL) return { data: [], error: null }
    const can = (p: Parameters<typeof hasPermission>[1]) =>
      user ? hasPermission(user.role, p, user.permissions) : true

    const snap = await loadSnapshot()
    const hits: SearchHit[] = []

    if (can('members.view') || can('users.manage')) {
      const memberByUser = new Map(snap.members.map((m) => [m.user_id, m]))
      const people = top(
        snap.users.map((u) => ({ item: u, s: score(q, [u.full_name, u.membership_id, u.email], [u.phone]) })),
        6
      )
      for (const u of people) {
        const member = memberByUser.get(u.id)
        const href = member && can('members.view') ? `/members/${member.id}` : can('users.manage') ? `/admin/users/${u.id}` : null
        if (!href) continue
        hits.push({
          id: `person-${u.id}`,
          kind: 'person',
          title: u.full_name,
          subtitle: [u.phone, u.role !== 'member' ? u.role.replace('_', ' ') : null].filter(Boolean).join(' · '),
          code: u.membership_id || undefined,
          href,
        })
      }
    }

    if (can('camp.manage')) {
      const campers = top(
        snap.campers.map((r) => ({
          item: r,
          s: score(q, [r.full_name, r.check_in_code, r.residence], [r.phone, r.whatsapp]),
        })),
        6
      )
      for (const r of campers) {
        hits.push({
          id: `camper-${r.id}`,
          kind: 'camper',
          title: r.full_name,
          subtitle: [snap.campYear ? `Camp ${snap.campYear}` : null, r.phone, r.status === 'checked_in' ? 'Checked in' : null]
            .filter(Boolean)
            .join(' · '),
          code: r.check_in_code || undefined,
          href: `/admin/camp-meeting/registrations/${r.id}`,
        })
      }
    }

    if (can('groups.view')) {
      const groups = top(snap.groups.map((g) => ({ item: g, s: score(q, [g.name, g.description]) })), 4)
      for (const g of groups) {
        hits.push({
          id: `group-${g.id}`,
          kind: 'group',
          title: g.name,
          subtitle: g.group_type?.replace(/_/g, ' '),
          href: `/groups/${g.id}`,
        })
      }
    }

    return { data: hits, error: null }
  } catch (error: unknown) {
    return { data: [], error: error instanceof Error ? error.message : 'Search failed' }
  }
}
