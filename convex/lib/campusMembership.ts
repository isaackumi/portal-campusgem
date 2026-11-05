import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

/**
 * A person's campus tag is their ONE active membership in a `group_type: 'campus'` group.
 * Everything that puts someone on a campus goes through `placeOnCampus`, so moving is
 * atomic (end the old row + add the new one in the same mutation).
 */
export type MembershipRole = Doc<'group_memberships'>['role']

export type CampusRow = { row: Doc<'group_memberships'>; group: Doc<'groups'> }

export async function groupFromString(
  ctx: Pick<QueryCtx, 'db'>,
  id: string
): Promise<Doc<'groups'> | null> {
  const gid = ctx.db.normalizeId('groups', id)
  return gid ? await ctx.db.get(gid) : null
}

/** Active campus memberships of one members-table profile. */
export async function activeCampusRows(ctx: Pick<QueryCtx, 'db'>, memberId: string): Promise<CampusRow[]> {
  const rows = await ctx.db
    .query('group_memberships')
    .withIndex('by_member_id', (q) => q.eq('member_id', memberId))
    .collect()
  const out: CampusRow[] = []
  for (const row of rows) {
    if (!row.is_active) continue
    const group = await groupFromString(ctx, row.group_id)
    if (group && group.group_type === 'campus') out.push({ row, group })
  }
  return out
}

export function campusSummary(group: Doc<'groups'>) {
  return { group_id: String(group._id), name: group.name, short_code: group.short_code ?? null }
}

export type PlaceResult =
  | { status: 'added' | 'unchanged' | 'moved'; membership_id: string; from: ReturnType<typeof campusSummary> | null }
  | { status: 'needs_move'; from: ReturnType<typeof campusSummary> & { role: MembershipRole } }
  | { status: 'blocked_leader'; from: ReturnType<typeof campusSummary> & { role: MembershipRole } }

export async function placeOnCampus(
  ctx: Pick<MutationCtx, 'db'>,
  args: {
    group: Doc<'groups'>
    memberId: Id<'members'>
    role: MembershipRole
    /** End a membership on another campus. Without it, `needs_move` is returned and nothing changes. */
    confirmMove: boolean
    /** Already on this campus: keep their role (public join, self-service). */
    keepExistingRole?: boolean
    /** Refuse to move someone who leads another campus (non-admin callers). */
    protectLeaders?: boolean
    notes?: string
  }
): Promise<PlaceResult> {
  if (args.group.group_type !== 'campus') throw new Error('That group is not a campus.')
  const groupId = String(args.group._id)
  const memberId = String(args.memberId)
  const current = await activeCampusRows(ctx, memberId)
  const others = current.filter((c) => String(c.group._id) !== groupId)
  const other = others[0]
  if (other && args.protectLeaders && others.some((c) => c.row.role === 'leader' || c.row.role === 'co_leader')) {
    return { status: 'blocked_leader', from: { ...campusSummary(other.group), role: other.row.role } }
  }
  if (other && !args.confirmMove) {
    return { status: 'needs_move', from: { ...campusSummary(other.group), role: other.row.role } }
  }

  const now = Date.now()
  for (const c of others) {
    await ctx.db.patch(c.row._id, {
      is_active: false,
      updated_at: now,
      notes: [c.row.notes, `Moved to ${args.group.short_code || args.group.name} on ${new Date(now).toISOString().slice(0, 10)}`]
        .filter(Boolean)
        .join(' · ')
        .slice(0, 500),
    })
  }

  const existing = await ctx.db
    .query('group_memberships')
    .withIndex('by_group_and_member', (q) => q.eq('group_id', groupId).eq('member_id', memberId))
    .collect()
  const keep = existing.find((r) => r.is_active) ?? existing[0]
  const from = other ? campusSummary(other.group) : null

  if (keep) {
    const unchanged = keep.is_active && (args.keepExistingRole || keep.role === args.role)
    const patch: Partial<Doc<'group_memberships'>> = { is_active: true, updated_at: now }
    if (!(keep.is_active && args.keepExistingRole)) patch.role = args.role
    if (!keep.is_active) patch.joined_date = new Date(now).toISOString().slice(0, 10)
    if (args.notes && !keep.notes) patch.notes = args.notes
    await ctx.db.patch(keep._id, patch)
    // Stray duplicates of the same pair (older data): keep one row only.
    for (const dup of existing) {
      if (dup._id !== keep._id && dup.is_active) await ctx.db.patch(dup._id, { is_active: false, updated_at: now })
    }
    return { status: others.length ? 'moved' : unchanged ? 'unchanged' : 'added', membership_id: String(keep._id), from }
  }

  const id = await ctx.db.insert('group_memberships', {
    group_id: groupId,
    member_id: memberId,
    role: args.role,
    joined_date: new Date(now).toISOString().slice(0, 10),
    is_active: true,
    notes: args.notes,
    updated_at: now,
  })
  return { status: others.length ? 'moved' : 'added', membership_id: String(id), from }
}

/** Generic group add (core.addGroupMembershipForUserWithSecret): keep the one-campus rule. */
export async function endOtherCampusMemberships(
  ctx: Pick<MutationCtx, 'db'>,
  memberId: string,
  keepGroupId: string
): Promise<void> {
  const now = Date.now()
  for (const c of await activeCampusRows(ctx, memberId)) {
    if (String(c.group._id) !== keepGroupId) {
      await ctx.db.patch(c.row._id, { is_active: false, updated_at: now })
    }
  }
}
