'use server'

import { guard } from '@/lib/auth/action-guard'
import { guardCampus, visibleCampusIds } from '@/lib/auth/campus-scope'
import { hasPermission } from '@/lib/auth/roles'
import { canAssignCampusRole } from '@/lib/campus/scope'
import {
  campusLabel,
  isValidCampusSlug,
  matchPersonToCampus,
  matchPersonToCampuses,
  normalizeShortCode,
  parseAliases,
  slugifyCampus,
  type CampusMatchSource,
  type CampusMatchTarget,
} from '@/lib/campus/match'
import { classifyRoster, parseRoster, type RosterPreviewRow } from '@/lib/campus/roster-import'
import { isValidPhone, normalizePhone } from '@/lib/phone'
import type { AppUser, ChurchForm, ChurchFormField, ChurchFormResponse, Group, GroupMembership } from '@/lib/types'
import type { GroupSmsInput, GroupSmsResult } from '@/lib/groups/send-group-sms'
import type { ApiResponse } from '@/lib/services/api-types'
import type { PeopleIndexRow, PlaceOnCampusResult } from '@/lib/convex/campus-bridge'

/**
 * Campus pages (/campuses, /campuses/<slug>). EVERY action that takes a campus id starts
 * with `guardCampus(groupId, level)` (lib/auth/campus-scope.ts), which verifies the id is a
 * campus the caller may see / run before anything else runs. Never call a broader action
 * from here with an id that did not pass that check.
 */

type Result<T> = { data: T | null; error: string | null }

function ok<T>(data: T): Result<T> {
  return { data, error: null }
}

function fail<T>(error: unknown, fallback: string): Result<T> {
  return { data: null, error: error instanceof Error ? error.message : fallback }
}

async function bridge() {
  return import('@/lib/convex/campus-bridge')
}

const ROLES: ReadonlyArray<GroupMembership['role']> = ['leader', 'co_leader', 'executive', 'member', 'volunteer']

function isRole(value: unknown): value is GroupMembership['role'] {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/** URL key for a campus: slug, else lower-case short code, else id. */
function campusKey(group: Pick<Group, 'id' | 'slug' | 'short_code'>): string {
  return group.slug || group.short_code?.toLowerCase() || group.id
}

function maskPhone(phone: string | null | undefined): string | undefined {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits.length >= 3 ? `••• ••• ${digits.slice(-3)}` : undefined
}

function matchTarget(group: Group): CampusMatchTarget {
  return { id: group.id, name: group.name, short_code: group.short_code, aliases: group.aliases }
}

/** Only the fields campus pages need (no access data, no auth_uid). */
function slimUser(user: AppUser | undefined): AppUser | undefined {
  if (!user) return undefined
  return {
    id: user.id,
    has_login: user.has_login,
    membership_id: user.membership_id,
    phone: user.phone,
    whatsapp: user.whatsapp,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    join_year: user.join_year,
    created_at: user.created_at,
    updated_at: user.updated_at,
  } as AppUser
}

function slimMemberships(rows: GroupMembership[]): GroupMembership[] {
  return rows.map((row) => ({
    ...row,
    member: row.member
      ? ({
          id: row.member.id,
          user_id: row.member.user_id,
          status: row.member.status,
          school_or_workplace: row.member.school_or_workplace,
          area_of_residence: row.member.area_of_residence,
          emergency_contacts: [],
          documents: [],
          created_at: row.member.created_at,
          updated_at: row.member.updated_at,
          user: slimUser(row.member.user),
        } as NonNullable<GroupMembership['member']>)
      : undefined,
  }))
}

// ---------------------------------------------------------------------------
// List + page
// ---------------------------------------------------------------------------

export type CampusCard = {
  id: string
  key: string
  name: string
  short_code?: string
  description?: string
  meeting_location?: string
  member_count: number
  leader_count: number
  executive_count: number
}

export async function listCampusesAction(): Promise<
  Result<{ campuses: CampusCard[]; isAdmin: boolean }>
> {
  const user = await guard(['groups.manage', 'campus.lead'])
  try {
    if (!user) throw new Error('Sign in again.')
    const visible = await visibleCampusIds(user)
    const all = await (await bridge()).listCampusesFromConvex()
    const campuses = all
      .filter((c) => visible === 'all' || visible.includes(c.id))
      .map((c) => ({
        id: c.id,
        key: campusKey(c),
        name: c.name,
        short_code: c.short_code,
        description: c.description,
        meeting_location: c.meeting_location,
        member_count: c.member_count,
        leader_count: c.leader_count,
        executive_count: c.executive_count,
      }))
    return ok({ campuses, isAdmin: visible === 'all' })
  } catch (error) {
    return fail(error, 'Could not load campuses')
  }
}

export type CampusPageData = {
  group: Group
  key: string
  access: 'view' | 'manage'
  isAdmin: boolean
  canText: boolean
  /** Can set the Leader role / move leaders. */
  canAssignLeader: boolean
  memberships: GroupMembership[]
  forms: ChurchForm[]
  joinUrl: string
}

export async function loadCampusPageAction(key: string): Promise<Result<CampusPageData>> {
  try {
    if (typeof key !== 'string' || key.length > 80) return { data: null, error: 'Campus not found.' }
    const found = await (await bridge()).findCampusFromConvex(decodeURIComponent(key))
    if (!found) return { data: null, error: 'Campus not found.' }
    const { group, user, access, isAdmin } = await guardCampus(found.id, 'view')
    const { listFormsFromConvex } = await import('@/lib/convex/forms-bridge')
    const { siteOrigin } = await import('@/lib/site-url')
    const [memberships, forms] = await Promise.all([
      (await bridge()).listCampusMembersFromConvex(group.id),
      listFormsFromConvex({ groupId: group.id }),
    ])
    const canText =
      access === 'manage' && (!isAdmin || (user ? hasPermission(user.role, 'sms.send', user.permissions) : true))
    return ok({
      group,
      key: campusKey(group),
      access,
      isAdmin,
      canText,
      canAssignLeader: isAdmin,
      memberships: slimMemberships(memberships),
      forms: forms.filter((f) => f.group_id === group.id),
      joinUrl: `${siteOrigin()}/join/${encodeURIComponent(campusKey(group))}`,
    })
  } catch (error) {
    return fail(error, 'Could not load this campus')
  }
}

// ---------------------------------------------------------------------------
// Members: add / move / role / remove
// ---------------------------------------------------------------------------

export type PersonHit = {
  user_id: string
  full_name: string
  phone_hint?: string
  campus?: string
  on_this_campus: boolean
}

/** Find someone in the directory to add. Three or more characters; at most 12 results; phones masked. */
export async function searchPeopleForCampusAction(groupId: string, query: string): Promise<Result<PersonHit[]>> {
  try {
    const { group } = await guardCampus(groupId, 'manage')
    const q = (query ?? '').trim().toLowerCase()
    if (q.length < 3) return ok([])
    const b = await bridge()
    const [people, tags] = await Promise.all([b.peopleIndexFromConvex(), b.campusTagMapFromConvex()])
    const labels = new Map(tags.campuses.map((c) => [c.id, c.short_code || c.name]))
    const digits = q.replace(/\D/g, '')
    const hits = people
      .filter((p) => {
        if (p.full_name.toLowerCase().includes(q)) return true
        if (digits.length >= 6) {
          return [p.phone, p.secondary_phone].some((ph) => (ph ?? '').replace(/\D/g, '').includes(digits.replace(/^0/, '')))
        }
        return false
      })
      .slice(0, 12)
      .map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        phone_hint: maskPhone(p.phone),
        campus: p.campus_group_id ? labels.get(p.campus_group_id) : undefined,
        on_this_campus: p.campus_group_id === group.id,
      }))
    return ok(hits)
  } catch (error) {
    return fail(error, 'Search failed')
  }
}

export type AddToCampusOutcome = PlaceOnCampusResult

export async function addCampusMemberAction(input: {
  groupId: string
  userId: string
  role: GroupMembership['role']
  confirmMove?: boolean
}): Promise<Result<AddToCampusOutcome>> {
  try {
    const { group, isAdmin } = await guardCampus(input.groupId, 'manage')
    if (!isRole(input.role)) return { data: null, error: 'Choose a role.' }
    if (!canAssignCampusRole(isAdmin, input.role)) {
      return { data: null, error: 'Only an administrator can make someone the campus leader.' }
    }
    const result = await (await bridge()).placeUserOnCampusInConvex({
      group_id: group.id,
      user_id: String(input.userId),
      role: input.role,
      confirm_move: Boolean(input.confirmMove),
      protect_leaders: !isAdmin,
    })
    if (result.status === 'blocked_leader') {
      return { data: null, error: `They lead ${result.from.short_code || result.from.name}. Ask an administrator to move them.` }
    }
    return ok(result)
  } catch (error) {
    return fail(error, 'Could not add them')
  }
}

/** "Add selected": everyone in the list as `member`; people on another campus are reported, not moved. */
export async function addCampusMembersAction(
  groupId: string,
  userIds: string[],
  confirmMove = false
): Promise<Result<{ added: number; unchanged: number; elsewhere: Array<{ user_id: string; from: string }> }>> {
  try {
    const { group, isAdmin } = await guardCampus(groupId, 'manage')
    if (!Array.isArray(userIds) || userIds.length === 0) return ok({ added: 0, unchanged: 0, elsewhere: [] })
    if (userIds.length > 200) return { data: null, error: 'Add at most 200 people at a time.' }
    const b = await bridge()
    let added = 0
    let unchanged = 0
    const elsewhere: Array<{ user_id: string; from: string }> = []
    for (const userId of Array.from(new Set(userIds.map(String)))) {
      const r = await b.placeUserOnCampusInConvex({
        group_id: group.id,
        user_id: userId,
        role: 'member',
        confirm_move: confirmMove,
        keep_existing_role: true,
        protect_leaders: !isAdmin,
      })
      if (r.status === 'added' || r.status === 'moved') added++
      else if (r.status === 'unchanged') unchanged++
      else elsewhere.push({ user_id: userId, from: r.from?.short_code || r.from?.name || 'another campus' })
    }
    return ok({ added, unchanged, elsewhere })
  } catch (error) {
    return fail(error, 'Could not add them')
  }
}

export async function setCampusMemberRoleAction(
  groupId: string,
  membershipId: string,
  role: GroupMembership['role']
): Promise<Result<true>> {
  try {
    const { group, user, isAdmin } = await guardCampus(groupId, 'manage')
    if (!isRole(role)) return { data: null, error: 'Choose a role.' }
    const b = await bridge()
    const row = await b.getCampusMembershipFromConvex(group.id, String(membershipId))
    if (!row || !row.is_active) return { data: null, error: 'That person is not on this campus.' }
    if (!canAssignCampusRole(isAdmin, role, row.role)) {
      return { data: null, error: 'Only an administrator can change who leads the campus.' }
    }
    if (!isAdmin && user && (await isOwnMembership(user.id, row))) {
      return { data: null, error: 'You can’t change your own role here.' }
    }
    await b.setCampusMembershipRoleInConvex(group.id, row.id, role)
    return ok(true)
  } catch (error) {
    return fail(error, 'Could not change the role')
  }
}

async function isOwnMembership(userId: string, row: GroupMembership): Promise<boolean> {
  const { fetchMemberByUserIdFromConvex } = await import('@/lib/convex/core-bridge')
  const mine = await fetchMemberByUserIdFromConvex(userId)
  return Boolean(mine && mine.id === row.member_id)
}

export async function removeCampusMemberAction(groupId: string, membershipId: string): Promise<Result<true>> {
  try {
    const { group, user, isAdmin } = await guardCampus(groupId, 'manage')
    const b = await bridge()
    const row = await b.getCampusMembershipFromConvex(group.id, String(membershipId))
    if (!row || !row.is_active) return ok(true)
    if (!isAdmin && (row.role === 'leader' || (user && (await isOwnMembership(user.id, row))))) {
      return { data: null, error: 'Only an administrator can remove the campus leader or yourself.' }
    }
    await b.endCampusMembershipInConvex(group.id, row.id)
    return ok(true)
  } catch (error) {
    return fail(error, 'Could not remove them')
  }
}

// ---------------------------------------------------------------------------
// Onboarding: matching existing people
// ---------------------------------------------------------------------------

export type CampusSuggestion = {
  user_id: string
  full_name: string
  phone?: string
  reasons: string[]
  score: number
  /** Global view: which campus they probably belong to (several when tied). */
  campus_ids?: string[]
}

/** Answers people gave on campus / student forms, keyed by user id (matched by phone). */
async function formSignals(
  people: PeopleIndexRow[],
  campusIds: Set<string>
): Promise<Map<string, Array<CampusMatchSource & { group_id?: string }>>> {
  const { listFormsFromConvex, getFormAdminFromConvex, listFormResponsesFromConvex } = await import(
    '@/lib/convex/forms-bridge'
  )
  const { STUDENT_REGISTRATION_CATEGORY } = await import('@/lib/constants/corporate-gem')
  const byPhone = new Map<string, string>()
  for (const p of people) {
    for (const ph of [p.phone, p.secondary_phone]) {
      if (ph && isValidPhone(ph)) byPhone.set(normalizePhone(ph), p.user_id)
    }
  }
  const forms = (await listFormsFromConvex()).filter(
    (f) => (f.group_id && campusIds.has(f.group_id)) || f.category === STUDENT_REGISTRATION_CATEGORY
  )
  const out = new Map<string, Array<CampusMatchSource & { group_id?: string }>>()
  for (const form of forms.slice(0, 40)) {
    const [admin, responses] = await Promise.all([getFormAdminFromConvex(form.id), listFormResponsesFromConvex(form.id)])
    const textFields = (admin?.fields ?? []).filter((f) =>
      ['short_text', 'long_text', 'dropdown', 'radio'].includes(String(f.field_type))
    )
    for (const r of responses) {
      const phone = r.respondent_phone && isValidPhone(r.respondent_phone) ? normalizePhone(r.respondent_phone) : ''
      const userId = phone ? byPhone.get(phone) : undefined
      if (!userId) continue
      const answers = textFields
        .map((f) => r.values[f.id])
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 1)
        .join(' · ')
      const list = out.get(userId) ?? []
      list.push({ label: `form “${form.title}”`, value: answers, group_id: form.group_id })
      out.set(userId, list)
    }
  }
  return out
}

function personSources(p: PeopleIndexRow): CampusMatchSource[] {
  return [
    { label: 'school', value: p.school_or_workplace },
    { label: 'residence', value: p.area_of_residence },
    { label: 'workplace', value: p.place_of_work },
  ]
}

/** "Probably at this campus": people with no campus whose details match this one. */
export async function campusSuggestionsAction(groupId: string): Promise<Result<CampusSuggestion[]>> {
  try {
    const { group, isAdmin } = await guardCampus(groupId, 'manage')
    const people = (await (await bridge()).peopleIndexFromConvex()).filter((p) => !p.campus_group_id)
    const signals = await formSignals(people, new Set([group.id]))
    const target = matchTarget(group)
    const out: CampusSuggestion[] = []
    for (const p of people) {
      const formRows = signals.get(p.user_id) ?? []
      const match = matchPersonToCampus(target, [...personSources(p), ...formRows])
      const ownForm = formRows.find((f) => f.group_id === group.id)
      if (!match && !ownForm) continue
      const reasons = match?.reasons ?? []
      if (ownForm && !reasons.some((r) => r.startsWith(ownForm.label))) reasons.push(`filled in ${ownForm.label}`)
      out.push({
        user_id: p.user_id,
        full_name: p.full_name,
        phone: isAdmin ? p.phone ?? undefined : maskPhone(p.phone),
        reasons,
        score: (match?.score ?? 0) + (ownForm ? 3 : 0),
      })
    }
    out.sort((a, b) => b.score - a.score || a.full_name.localeCompare(b.full_name))
    return ok(out.slice(0, 300))
  } catch (error) {
    return fail(error, 'Could not look for matches')
  }
}

/** Admins: people with no campus who match ANY campus, with the best campus for each. */
export async function unassignedStudentsAction(): Promise<
  Result<{ campuses: Array<{ id: string; key: string; label: string }>; people: CampusSuggestion[] }>
> {
  await guard('groups.manage')
  try {
    const b = await bridge()
    const [campuses, index] = await Promise.all([b.listCampusesFromConvex(), b.peopleIndexFromConvex()])
    const people = index.filter((p) => !p.campus_group_id)
    const signals = await formSignals(people, new Set(campuses.map((c) => c.id)))
    const targets = campuses.map(matchTarget)
    const out: CampusSuggestion[] = []
    for (const p of people) {
      const formRows = signals.get(p.user_id) ?? []
      const matches = matchPersonToCampuses(targets, [...personSources(p), ...formRows])
      const ownForms = Array.from(new Set(formRows.map((f) => f.group_id).filter((g): g is string => Boolean(g))))
      const ids = matches.length ? matches.map((m) => m.campus_id) : ownForms.length === 1 ? ownForms : []
      if (ids.length === 0) continue
      out.push({
        user_id: p.user_id,
        full_name: p.full_name,
        phone: p.phone ?? undefined,
        reasons: matches.length ? matches[0].reasons : formRows.map((f) => `filled in ${f.label}`),
        score: matches[0]?.score ?? 1,
        campus_ids: ids,
      })
    }
    out.sort((a, b) => b.score - a.score || a.full_name.localeCompare(b.full_name))
    return ok({
      campuses: campuses.map((c) => ({ id: c.id, key: campusKey(c), label: campusLabel(c) })),
      people: out.slice(0, 500),
    })
  } catch (error) {
    return fail(error, 'Could not find unassigned students')
  }
}

// ---------------------------------------------------------------------------
// Onboarding: paste / CSV
// ---------------------------------------------------------------------------

async function previewRoster(groupId: string, text: string): Promise<RosterPreviewRow[]> {
  const b = await bridge()
  const [people, tags] = await Promise.all([b.peopleIndexFromConvex(), b.campusTagMapFromConvex()])
  const labels = new Map(tags.campuses.map((c) => [c.id, c.short_code || c.name]))
  const rows = classifyRoster(
    parseRoster(String(text ?? '').slice(0, 100_000)),
    people.map((p) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      phones: [p.phone, p.secondary_phone].filter((x): x is string => Boolean(x)),
      campus: p.campus_group_id ? (p.campus_group_id === groupId ? 'this campus' : labels.get(p.campus_group_id)) : undefined,
    }))
  )
  return rows
}

export async function previewCampusRosterAction(groupId: string, text: string): Promise<Result<RosterPreviewRow[]>> {
  try {
    const { group } = await guardCampus(groupId, 'manage')
    // Rows carry names and campus labels only; never other people's numbers.
    return ok(await previewRoster(group.id, text))
  } catch (error) {
    return fail(error, 'Could not read the list')
  }
}

/**
 * Import the pasted list: matched rows are added (moved from another campus only when
 * `confirmMove`), new rows are created as campus_gem members. The list is re-read here;
 * nothing from the client preview is trusted.
 */
export async function importCampusRosterAction(
  groupId: string,
  text: string,
  confirmMove = false
): Promise<Result<{ added: number; created: number; unchanged: number; skipped: number; elsewhere: number }>> {
  try {
    const { group, isAdmin } = await guardCampus(groupId, 'manage')
    const rows = await previewRoster(group.id, text)
    const b = await bridge()
    const { generateMembershipId, normalizeMembershipId } = await import('@/lib/membershipId')
    const tally = { added: 0, created: 0, unchanged: 0, skipped: 0, elsewhere: 0 }
    for (const row of rows) {
      if (row.status === 'matched' && row.user_id) {
        const r = await b.placeUserOnCampusInConvex({
          group_id: group.id,
          user_id: row.user_id,
          role: 'member',
          confirm_move: confirmMove,
          keep_existing_role: true,
          protect_leaders: !isAdmin,
        })
        if (r.status === 'added' || r.status === 'moved') tally.added++
        else if (r.status === 'unchanged') tally.unchanged++
        else tally.elsewhere++
      } else if (row.status === 'new' && row.phone && row.name) {
        const r = await b.joinCampusByPhoneInConvex({
          group_id: group.id,
          full_name: row.name,
          phone: row.phone,
          membership_id: normalizeMembershipId(generateMembershipId(row.phone)),
          auth_uid: crypto.randomUUID(),
          confirm_move: confirmMove,
          protect_leaders: !isAdmin,
        })
        if (r.status === 'needs_move' || r.status === 'blocked_leader') tally.elsewhere++
        else if (r.created) tally.created++
        else tally.added++
      } else {
        tally.skipped++
      }
    }
    return ok(tally)
  } catch (error) {
    return fail(error, 'Import failed')
  }
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

/** "Set up registration form" for this campus (campus member or student sign-up form). */
export async function setupCampusFormAction(
  groupId: string,
  kind: 'campus' | 'student'
): Promise<Result<{ form: ChurchForm; created: boolean }>> {
  try {
    const { group } = await guardCampus(groupId, 'manage')
    // Trusted from here (guardCampus verified this campus); only `group` (verified) is passed on.
    if (kind === 'student') {
      const { ensureStudentRegistrationForm } = await import('@/lib/actions/student-registration-form')
      const { publishCampusMemberRegistrationForm } = await import('@/lib/actions/campus-registration-form')
      const res = await ensureStudentRegistrationForm(group.id, group.name)
      if (res.error || !res.data) return { data: null, error: res.error ?? 'Could not set up the form' }
      if (res.created) await publishCampusMemberRegistrationForm(res.data.id)
      return ok({ form: res.data, created: res.created })
    }
    const { ensureCampusMemberRegistrationForm, publishCampusMemberRegistrationForm } = await import(
      '@/lib/actions/campus-registration-form'
    )
    const res = await ensureCampusMemberRegistrationForm(group.id, group.name)
    if (res.error || !res.data) return { data: null, error: res.error ?? 'Could not set up the form' }
    if (res.created) await publishCampusMemberRegistrationForm(res.data.id)
    return ok({ form: res.data, created: res.created })
  } catch (error) {
    return fail(error, 'Could not set up the form')
  }
}

/** Campus id for a /campuses/<key> URL, only if the caller may view that campus. */
export async function findCampusIdForKey(key: string): Promise<string | null> {
  try {
    if (typeof key !== 'string' || key.length > 80) return null
    const found = await (await bridge()).findCampusFromConvex(decodeURIComponent(key))
    if (!found) return null
    const { group } = await guardCampus(found.id, 'view')
    return group.id
  } catch {
    return null
  }
}

/** Read-only responses of one of this campus's forms. */
export async function listCampusFormResponsesAction(
  groupId: string,
  formId: string
): Promise<Result<{ form: ChurchForm; fields: ChurchFormField[]; responses: ChurchFormResponse[] }>> {
  try {
    const { group } = await guardCampus(groupId, 'view')
    const { getFormAdminFromConvex, listFormResponsesFromConvex } = await import('@/lib/convex/forms-bridge')
    const admin = await getFormAdminFromConvex(String(formId))
    if (!admin || admin.form.group_id !== group.id) return { data: null, error: 'That form does not belong to this campus.' }
    const responses = await listFormResponsesFromConvex(admin.form.id)
    return ok({ form: admin.form, fields: admin.fields, responses })
  } catch (error) {
    return fail(error, 'Could not load responses')
  }
}

// ---------------------------------------------------------------------------
// Text the campus
// ---------------------------------------------------------------------------

/**
 * Campus SMS: `manage` on this campus, AND either leading it (campus.lead scope) or holding
 * `sms.send` (admins reaching it through groups.manage). Executives cannot text.
 */
export async function sendCampusSmsAction(input: GroupSmsInput): Promise<ApiResponse<GroupSmsResult>> {
  try {
    const { group, user, isAdmin } = await guardCampus(input?.group_id, 'manage')
    if (!user) return { data: null, error: 'Sign in again to send messages.', loading: false }
    if (isAdmin && !hasPermission(user.role, 'sms.send', user.permissions)) {
      return { data: null, error: 'You do not have permission to send SMS.', loading: false }
    }
    const { sendGroupSms } = await import('@/lib/groups/send-group-sms')
    return sendGroupSms(user, { ...input, group_id: group.id })
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to send', loading: false }
  }
}

// ---------------------------------------------------------------------------
// Identity (admins)
// ---------------------------------------------------------------------------

export async function setCampusIdentityAction(
  groupId: string,
  input: { short_code?: string; slug?: string; aliases?: string | string[] }
): Promise<Result<Group>> {
  try {
    const { group, isAdmin } = await guardCampus(groupId, 'manage')
    if (!isAdmin) return { data: null, error: 'Only an administrator can change the campus code or link.' }
    const rawCode = (input.short_code ?? '').trim()
    const short_code = rawCode ? normalizeShortCode(rawCode) : null
    if (rawCode && !short_code) return { data: null, error: 'Short code: 2–10 letters or digits, e.g. UEW.' }
    const rawSlug = (input.slug ?? '').trim().toLowerCase()
    const slug = rawSlug ? slugifyCampus(rawSlug) : short_code ? short_code.toLowerCase() : slugifyCampus(group.name)
    if (!isValidCampusSlug(slug)) return { data: null, error: 'Link name: letters, digits and dashes.' }
    const data = await (await bridge()).setCampusIdentityInConvex(group.id, {
      short_code,
      slug,
      aliases: parseAliases(input.aliases ?? []),
    })
    if (!data) return { data: null, error: 'Campus not found.' }
    return ok(data)
  } catch (error) {
    return fail(error, 'Could not save')
  }
}

// ---------------------------------------------------------------------------
// Tags across the app (members list, profile)
// ---------------------------------------------------------------------------

export type CampusTag = { group_id: string; label: string; name: string; key: string; role: GroupMembership['role'] }

/** One call for the members list: campus per member id and per user id. */
export async function loadCampusTagsAction(): Promise<
  Result<{
    campuses: Array<{ id: string; label: string; name: string; key: string }>
    byMember: Record<string, CampusTag>
    byUser: Record<string, CampusTag>
  }>
> {
  await guard('members.view')
  try {
    const map = await (await bridge()).campusTagMapFromConvex()
    const campuses = map.campuses
      .filter((c) => c.is_active)
      .map((c) => ({
        id: c.id,
        label: c.short_code || c.name,
        name: c.name,
        key: c.slug || c.short_code?.toLowerCase() || c.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
    const byId = new Map(
      map.campuses.map((c) => [c.id, { label: c.short_code || c.name, name: c.name, key: c.slug || c.short_code?.toLowerCase() || c.id }])
    )
    const byMember: Record<string, CampusTag> = {}
    const byUser: Record<string, CampusTag> = {}
    for (const row of map.rows) {
      const c = byId.get(row.group_id)
      if (!c) continue
      const tag: CampusTag = { group_id: row.group_id, role: row.role, ...c }
      byMember[row.member_id] = tag
      if (row.user_id) byUser[row.user_id] = tag
    }
    return ok({ campuses, byMember, byUser })
  } catch (error) {
    return fail(error, 'Could not load campuses')
  }
}

/** Member profile "Campus" select: put a person on a campus (or take them off). */
export async function setPersonCampusAction(input: {
  userId: string
  groupId: string | null
  confirmMove?: boolean
}): Promise<Result<PlaceOnCampusResult | { status: 'removed' }>> {
  await guard('members.manage')
  try {
    const b = await bridge()
    const userId = String(input.userId)
    if (!input.groupId) {
      const map = await b.campusTagMapFromConvex()
      const rows = map.rows.filter((r) => r.user_id === userId)
      const { listGroupMembershipsFromConvex } = await import('@/lib/convex/core-bridge')
      for (const r of rows) {
        const memberships = await listGroupMembershipsFromConvex(r.group_id)
        const mine = memberships.find((m) => m.member_id === r.member_id)
        if (mine) await b.endCampusMembershipInConvex(r.group_id, mine.id)
      }
      return ok({ status: 'removed' as const })
    }
    const result = await b.placeUserOnCampusInConvex({
      group_id: String(input.groupId),
      user_id: userId,
      role: 'member',
      confirm_move: Boolean(input.confirmMove),
      keep_existing_role: true,
    })
    return ok(result)
  } catch (error) {
    return fail(error, 'Could not change their campus')
  }
}
