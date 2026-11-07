'use server'

import { headers } from 'next/headers'
import { asSystem, guard } from '@/lib/auth/action-guard'
import { guardCampus, guardCampusMember, memberCampusIds } from '@/lib/auth/campus-scope'
import { isCampusAdmin } from '@/lib/campus/scope'
import { createWindowLimiter } from '@/lib/campus/join'
import { ghanaCalendarDate } from '@/lib/birthdays/sms'
import { maskPhone } from '@/lib/activity/describe'
import { isOutreachOutcome, OUTREACH_OUTCOME_LABELS, OUTREACH_STATUS_LABELS, type OutreachOutcome } from '@/lib/outreach/options'
import {
  applyOutcome,
  canSeeContact,
  canWorkContact,
  filterContacts,
  openFollowUps,
  outreachSunday,
  shareOutEvenly,
  sortContacts,
  summarizeDay,
  type OutreachAccess,
  type OutreachDaySummary,
  type OutreachFilters,
  type OutreachTab,
} from '@/lib/outreach/logic'
import { outreachCsv } from '@/lib/outreach/csv'
import { signOutreachRef, verifyOutreachRef } from '@/lib/outreach/ref'
import { validateOutreachAnswers, type OutreachField } from '@/lib/outreach/validate'
import {
  OUTREACH_STATUSES,
  type OutreachCampus,
  type OutreachContact,
  type OutreachEvent,
  type OutreachStatus,
} from '@/lib/outreach/types'
import type { Group } from '@/lib/types'
import type { ActivityInput } from '@/lib/activity/log'

/**
 * Campus outreach (/outreach, public form /o/<slug>). EVERY action that takes a campus id
 * starts with `guardCampusMember(campusId)` (or `guardCampus`), which verifies the id is a
 * campus the caller belongs to before anything else. After it, nested `guard()` calls pass,
 * so the per-contact rules are checked here with `canSeeContact` / `canWorkContact`, and only
 * the verified `group.id` is used. No SMS is sent from here.
 */

type Result<T> = { data: T | null; error: string | null }

function ok<T>(data: T): Result<T> {
  return { data, error: null }
}

function fail<T>(error: unknown, fallback: string): Result<T> {
  return { data: null, error: error instanceof Error ? error.message : fallback }
}

async function bridge() {
  return import('@/lib/convex/outreach-bridge')
}

async function log(input: ActivityInput) {
  const { logActivity } = await import('@/lib/activity/log')
  await logActivity(input)
}

function campusKey(group: Pick<Group, 'id' | 'slug' | 'short_code'>): string {
  return group.slug || group.short_code?.toLowerCase() || group.id
}

function toCampus(group: Group): OutreachCampus {
  return {
    id: group.id,
    key: campusKey(group),
    name: group.name,
    label: group.short_code || group.name,
    short_code: group.short_code,
  }
}

function today(): string {
  return ghanaCalendarDate().iso
}

function refSecret(): string {
  const secret = process.env.OUTREACH_REF_SECRET || process.env.CAMP_CONVEX_SERVER_SECRET
  if (!secret) throw new Error('CAMP_CONVEX_SERVER_SECRET must be set')
  return secret
}

async function qrUrlFor(group: Group, userId: string): Promise<string> {
  const { siteOrigin } = await import('@/lib/site-url')
  const ref = signOutreachRef(userId, group.id, refSecret())
  return `${siteOrigin()}/o/${encodeURIComponent(campusKey(group))}?by=${encodeURIComponent(ref)}`
}

function cleanId(value: unknown): string {
  const id = typeof value === 'string' ? value : ''
  if (!/^[a-z0-9]{10,64}$/i.test(id)) throw new Error('Not found.')
  return id
}

function cleanNote(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim()
  return v ? v.slice(0, 1000) : undefined
}

function cleanFilters(input: unknown): OutreachFilters {
  const raw = (input ?? {}) as Record<string, unknown>
  const tab = raw.tab === 'mine' || raw.tab === 'met' || raw.tab === 'all' ? (raw.tab as OutreachTab) : 'mine'
  const metOn =
    raw.metOn === 'sunday' || (typeof raw.metOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.metOn)) ? String(raw.metOn) : undefined
  const status =
    typeof raw.status === 'string' && (OUTREACH_STATUSES as readonly string[]).includes(raw.status)
      ? (raw.status as OutreachStatus)
      : undefined
  return {
    tab,
    metOn,
    status,
    unassigned: raw.unassigned === true,
    bibleStudy: raw.bibleStudy === true,
    search: typeof raw.search === 'string' ? raw.search.slice(0, 80) : undefined,
  }
}

type Me = { id: string; name: string }

/** The session user after `guardCampusMember` (never null from the browser). */
function meOf(user: { id: string; full_name: string } | null): Me {
  if (!user) throw new Error('Sign in again.')
  return { id: user.id, name: user.full_name }
}

/** Load one contact the caller may see (else "not found", never "not allowed": no probing). */
async function visibleContact(groupId: string, contactId: string, access: OutreachAccess, me: Me) {
  const found = await (await bridge()).getOutreachContactFromConvex(groupId, cleanId(contactId))
  if (!found || !canSeeContact(access, me.id, found.contact)) throw new Error('That person is not on your list.')
  return found
}

async function workableContact(groupId: string, contactId: string, access: OutreachAccess, me: Me) {
  const found = await visibleContact(groupId, contactId, access, me)
  if (!canWorkContact(access, me.id, found.contact)) {
    throw new Error('Only the person following them up, whoever met them, or a campus leader can do this.')
  }
  return found
}

// ---------------------------------------------------------------------------
// Campuses + page data
// ---------------------------------------------------------------------------

/** Campuses the session user can do outreach on: their own (any role), or every campus for admins. */
export async function listOutreachCampusesAction(): Promise<Result<{ campuses: OutreachCampus[]; isAdmin: boolean }>> {
  const user = await guard('dashboard.view')
  try {
    if (!user) throw new Error('Sign in again.')
    const admin = isCampusAdmin(user)
    const { listCampusesFromConvex } = await import('@/lib/convex/campus-bridge')
    const [all, mine] = await Promise.all([listCampusesFromConvex(), admin ? Promise.resolve([] as string[]) : memberCampusIds(user)])
    const campuses = all.filter((c) => admin || mine.includes(c.id)).map(toCampus)
    return ok({ campuses, isAdmin: admin })
  } catch (error) {
    return fail(error, 'Could not load your campuses')
  }
}

export type OutreachPageData = {
  campus: OutreachCampus
  access: OutreachAccess
  me: Me
  todayIso: string
  sunday: string
  qrUrl: string
  hallSuggestions: boolean
  /** Every contact this person may see (all of them for leaders, else theirs). */
  contacts: OutreachContact[]
}

/** Everything /outreach needs for one campus; the page filters on the phone. */
export async function loadOutreachAction(campusId: string): Promise<Result<OutreachPageData>> {
  try {
    const { group, user, access } = await guardCampusMember(campusId)
    const me = meOf(user)
    const todayIso = today()
    const all = await (await bridge()).listOutreachContactsFromConvex(group.id)
    return ok({
      campus: toCampus(group),
      access,
      me,
      todayIso,
      sunday: outreachSunday(todayIso),
      qrUrl: await qrUrlFor(group, me.id),
      hallSuggestions: (group.short_code ?? '').toUpperCase() === 'UG',
      contacts: all.filter((c) => canSeeContact(access, me.id, c)),
    })
  } catch (error) {
    return fail(error, 'Could not load outreach')
  }
}

/** The same list with filters applied on the server (search, status, date, tab). */
export async function listOutreachContactsAction(campusId: string, filters: unknown): Promise<Result<OutreachContact[]>> {
  try {
    const { group, user, access } = await guardCampusMember(campusId)
    const me = meOf(user)
    const f = cleanFilters(filters)
    if (f.tab === 'all' && access === 'member') f.tab = 'mine'
    const all = await (await bridge()).listOutreachContactsFromConvex(group.id)
    return ok(sortContacts(filterContacts(all, f, { userId: me.id, access, todayIso: today() }), f.tab ?? 'mine'))
  } catch (error) {
    return fail(error, 'Could not load the list')
  }
}

/** My personal QR link for this campus. */
export async function getOutreachQrLinkAction(campusId: string): Promise<Result<{ url: string; campus: OutreachCampus }>> {
  try {
    const { group, user } = await guardCampusMember(campusId)
    const me = meOf(user)
    return ok({ url: await qrUrlFor(group, me.id), campus: toCampus(group) })
  } catch (error) {
    return fail(error, 'Could not make your link')
  }
}

export async function getOutreachContactAction(
  campusId: string,
  contactId: string
): Promise<Result<{ contact: OutreachContact; events: OutreachEvent[]; canWork: boolean }>> {
  try {
    const { group, user, access } = await guardCampusMember(campusId)
    const me = meOf(user)
    const found = await visibleContact(group.id, contactId, access, me)
    return ok({ ...found, canWork: canWorkContact(access, me.id, found.contact) })
  } catch (error) {
    return fail(error, 'Could not open this person')
  }
}

// ---------------------------------------------------------------------------
// Add / edit
// ---------------------------------------------------------------------------

export type SaveOutreachResult =
  | { ok: true; contact_id: string; merged: boolean }
  | { ok: false; errors: Partial<Record<OutreachField, string>> }

/**
 * "Add a person" (signed in, so `met_by` is the session user) or edit one (`contactId`).
 * Adding with a number already on this campus's list adds a "met again" visit instead.
 */
export async function saveOutreachContactAction(
  campusId: string,
  input: unknown,
  contactId?: string
): Promise<Result<SaveOutreachResult>> {
  try {
    const { group, user, access } = await guardCampusMember(campusId)
    const me = meOf(user)
    const checked = validateOutreachAnswers(input)
    if (!checked.ok) return ok({ ok: false, errors: checked.errors })
    const b = await bridge()

    if (contactId) {
      const { contact } = await workableContact(group.id, contactId, access, me)
      await b.updateOutreachContactInConvex(group.id, contact.id, checked.data)
      await log({
        category: 'groups',
        action: 'outreach.edit',
        summary: `Edited outreach contact ${checked.data.full_name} (${group.short_code || group.name})`,
        target: { type: 'outreach_contact', id: contact.id, label: checked.data.full_name },
      })
      return ok({ ok: true, contact_id: contact.id, merged: false })
    }

    if (!group.is_active) return { data: null, error: 'This campus is archived.' }
    const res = await b.submitOutreachContactInConvex({
      campus_id: group.id,
      answers: checked.data,
      met_on: today(),
      met_by_user_id: me.id,
      met_by_name: me.name,
      source: 'member',
    })
    await log({
      category: 'groups',
      action: res.merged ? 'outreach.met_again' : 'outreach.add',
      summary: `${res.merged ? 'Met again' : 'Added'} ${checked.data.full_name} on ${group.short_code || group.name} outreach`,
      target: { type: 'outreach_contact', id: res.id, label: checked.data.full_name },
    })
    return ok({ ok: true, contact_id: res.id, merged: res.merged })
  } catch (error) {
    return fail(error, 'Could not save')
  }
}

// ---------------------------------------------------------------------------
// Public QR form (/o/<slug>?by=<ref>)
// ---------------------------------------------------------------------------

const viewLimiter = createWindowLimiter({ limit: 60, windowMs: 60_000 })
const ipLimiter = createWindowLimiter({ limit: 20, windowMs: 10 * 60_000 })
const phoneLimiter = createWindowLimiter({ limit: 4, windowMs: 10 * 60_000 })

async function clientIp(): Promise<string> {
  try {
    const h = await headers()
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  } catch {
    return 'unknown'
  }
}

export type PublicOutreachCampus = { key: string; name: string; label: string; short_code?: string }

export async function getPublicOutreachCampusAction(key: string): Promise<PublicOutreachCampus | null> {
  return asSystem(async () => {
    if (typeof key !== 'string' || !/^[a-z0-9-]{2,64}$/i.test(key)) return null
    if (!viewLimiter.allow(await clientIp())) return null
    try {
      const { findCampusFromConvex } = await import('@/lib/convex/campus-bridge')
      const group = await findCampusFromConvex(key)
      if (!group || !group.is_active) return null
      return { key, name: group.name, label: group.short_code || group.name, short_code: group.short_code }
    } catch {
      return null
    }
  })
}

/**
 * A student fills the form from a GEM member's QR code. Intentionally public (`asSystem`).
 * The answer is the same whether or not the number was already on the list, and a bad `by`
 * ref only means nobody is credited. Rate-limited per IP and per phone.
 */
export async function submitPublicOutreachAction(
  key: string,
  input: unknown,
  ref?: string | null
): Promise<Result<{ ok: true; label: string; name: string } | { ok: false; errors: Partial<Record<OutreachField, string>> }>> {
  return asSystem(async () => {
    const checked = validateOutreachAnswers(input)
    if (!checked.ok) return ok({ ok: false as const, errors: checked.errors })
    const ip = await clientIp()
    if (!ipLimiter.allow(ip) || !phoneLimiter.allow(checked.data.phone)) {
      return { data: null, error: 'Too many forms from this phone. Please wait a few minutes and try again.' }
    }
    try {
      const { findCampusFromConvex } = await import('@/lib/convex/campus-bridge')
      const group = typeof key === 'string' && /^[a-z0-9-]{2,64}$/i.test(key) ? await findCampusFromConvex(key) : null
      if (!group || !group.is_active || group.group_type !== 'campus') {
        return { data: null, error: 'This link is no longer active.' }
      }
      let metBy: Me | null = null
      const secret = process.env.OUTREACH_REF_SECRET || process.env.CAMP_CONVEX_SERVER_SECRET || ''
      const userId = verifyOutreachRef(ref, group.id, secret)
      if (userId) {
        const { fetchUserFromConvex } = await import('@/lib/convex/core-bridge')
        const u = await fetchUserFromConvex(userId).catch(() => null)
        if (u && !u.merged_into) metBy = { id: u.id, name: u.full_name }
      }
      const res = await (await bridge()).submitOutreachContactInConvex({
        campus_id: group.id,
        answers: checked.data,
        met_on: today(),
        met_by_user_id: metBy?.id,
        met_by_name: metBy?.name,
        source: 'qr',
      })
      const label = group.short_code || group.name
      await log({
        category: 'groups',
        action: 'outreach.qr_form',
        summary: `Outreach form (QR) on ${label}: ${maskPhone(checked.data.phone)}${metBy ? `, shown by ${metBy.name}` : ''}`,
        actor: null,
        target: { type: 'outreach_contact', id: res.id },
      })
      return ok({ ok: true as const, label, name: checked.data.full_name.split(' ')[0] ?? '' })
    } catch (err) {
      console.error('[outreach] public submit failed', err)
      return { data: null, error: 'Something went wrong. Please try again.' }
    }
  })
}

// ---------------------------------------------------------------------------
// Follow-up: outcomes, status, assigning
// ---------------------------------------------------------------------------

export async function recordOutreachOutcomeAction(
  campusId: string,
  contactId: string,
  input: { channel: 'call' | 'whatsapp' | 'note'; outcome?: OutreachOutcome; note?: string }
): Promise<Result<OutreachContact>> {
  try {
    const { group, user, access } = await guardCampusMember(campusId)
    const me = meOf(user)
    const { contact } = await workableContact(group.id, contactId, access, me)
    const channel = input?.channel === 'call' || input?.channel === 'whatsapp' ? input.channel : 'note'
    const outcome = isOutreachOutcome(input?.outcome) ? input.outcome : undefined
    const note = cleanNote(input?.note)
    if (channel === 'note' && !note && !outcome) return { data: null, error: 'Write a note first.' }
    const patch = outcome ? applyOutcome(contact, outcome, Date.now()) : null
    const updated = await (await bridge()).recordOutreachInConvex({
      campus_id: group.id,
      contact_id: contact.id,
      // An outcome is always a contact attempt, even when the channel was not said.
      kind: outcome && channel === 'note' ? 'call' : channel,
      outcome,
      note,
      status: patch?.status,
      bible_study: patch?.bible_study,
      by_user_id: me.id,
      by_name: me.name,
    })
    await log({
      category: 'groups',
      action: outcome ? 'outreach.outcome' : 'outreach.note',
      summary: outcome
        ? `${OUTREACH_OUTCOME_LABELS[outcome]}: ${contact.full_name} (${channel === 'whatsapp' ? 'WhatsApp' : 'call'})`
        : `Note on ${contact.full_name}`,
      target: { type: 'outreach_contact', id: contact.id, label: contact.full_name },
    })
    if (!updated) return { data: null, error: 'Saved, but could not reload them.' }
    return ok(updated)
  } catch (error) {
    return fail(error, 'Could not save')
  }
}

export async function setOutreachStatusAction(
  campusId: string,
  contactId: string,
  status: OutreachStatus
): Promise<Result<OutreachContact>> {
  try {
    const { group, user, access } = await guardCampusMember(campusId)
    const me = meOf(user)
    if (!(OUTREACH_STATUSES as readonly string[]).includes(status)) return { data: null, error: 'Choose a status.' }
    const { contact } = await workableContact(group.id, contactId, access, me)
    const updated = await (await bridge()).setOutreachStatusInConvex({
      campus_id: group.id,
      contact_id: contact.id,
      status,
      by_user_id: me.id,
      by_name: me.name,
    })
    await log({
      category: 'groups',
      action: 'outreach.status',
      summary: `${contact.full_name}: ${OUTREACH_STATUS_LABELS[status]}`,
      target: { type: 'outreach_contact', id: contact.id, label: contact.full_name },
    })
    if (!updated) return { data: null, error: 'Saved, but could not reload them.' }
    return ok(updated)
  } catch (error) {
    return fail(error, 'Could not change the status')
  }
}

export type OutreachAssignee = { user_id: string; name: string; role: string; open: number }

async function assignees(groupId: string, contacts?: readonly OutreachContact[]): Promise<OutreachAssignee[]> {
  const { listCampusMembersFromConvex } = await import('@/lib/convex/campus-bridge')
  const rows = await listCampusMembersFromConvex(groupId)
  const out = new Map<string, OutreachAssignee>()
  for (const r of rows) {
    const u = r.member?.user
    if (!r.is_active || !u?.id || u.merged_into) continue
    if (!['leader', 'co_leader', 'executive', 'member'].includes(r.role)) continue
    out.set(u.id, { user_id: u.id, name: u.full_name, role: r.role, open: contacts ? openFollowUps(contacts, u.id) : 0 })
  }
  return Array.from(out.values()).sort((a, b) => a.name.localeCompare(b.name))
}

/** The campus's active members (leaders, executives, members), for the assign picker. Names only. */
export async function listOutreachAssigneesAction(campusId: string): Promise<Result<OutreachAssignee[]>> {
  try {
    const { group } = await guardCampus(campusId, 'manage')
    const contacts = await (await bridge()).listOutreachContactsFromConvex(group.id)
    return ok(await assignees(group.id, contacts))
  } catch (error) {
    return fail(error, 'Could not load the campus members')
  }
}

/** Give one or many people to a campus member (`userId` null: take them back). Leaders only. */
export async function assignOutreachAction(
  campusId: string,
  contactIds: string[],
  userId: string | null
): Promise<Result<{ changed: number }>> {
  try {
    const { group, user } = await guardCampus(campusId, 'manage')
    const me = meOf(user)
    if (!Array.isArray(contactIds) || contactIds.length === 0) return ok({ changed: 0 })
    if (contactIds.length > 500) return { data: null, error: 'Assign at most 500 people at a time.' }
    let name: string | null = null
    if (userId) {
      const person = (await assignees(group.id)).find((a) => a.user_id === userId)
      if (!person) return { data: null, error: 'They are not an active member of this campus.' }
      name = person.name
    }
    const ids = Array.from(new Set(contactIds.map(cleanId)))
    const res = await (await bridge()).assignOutreachInConvex({
      campus_id: group.id,
      assignments: ids.map((id) => ({ contact_id: id, user_id: userId, name })),
      by_user_id: me.id,
      by_name: me.name,
    })
    await log({
      category: 'groups',
      action: 'outreach.assign',
      summary: userId
        ? `Gave ${res.changed} outreach contact${res.changed === 1 ? '' : 's'} to ${name} (${group.short_code || group.name})`
        : `Took back ${res.changed} outreach contact${res.changed === 1 ? '' : 's'} (${group.short_code || group.name})`,
      target: { type: 'group', id: group.id, label: group.name },
      details: { contacts: ids.length },
    })
    return ok(res)
  } catch (error) {
    return fail(error, 'Could not assign')
  }
}

/**
 * Share out evenly: the chosen contacts (or every unassigned one) are split between the chosen
 * campus members, counting what each already has open. Leaders only.
 */
export async function shareOutOutreachAction(
  campusId: string,
  contactIds: string[] | 'unassigned',
  userIds: string[]
): Promise<Result<{ changed: number; perPerson: Array<{ name: string; count: number }> }>> {
  try {
    const { group, user } = await guardCampus(campusId, 'manage')
    const me = meOf(user)
    if (!Array.isArray(userIds) || userIds.length === 0) return { data: null, error: 'Pick at least one person.' }
    const contacts = await (await bridge()).listOutreachContactsFromConvex(group.id)
    const people = await assignees(group.id, contacts)
    const chosen = people.filter((p) => userIds.includes(p.user_id))
    if (chosen.length === 0) return { data: null, error: 'Those people are not active members of this campus.' }
    const byId = new Map(contacts.map((c) => [c.id, c]))
    const targets =
      contactIds === 'unassigned'
        ? sortContacts(contacts.filter((c) => !c.assigned_to && c.status !== 'joined' && c.status !== 'not_interested'), 'mine').map((c) => c.id)
        : Array.from(new Set((Array.isArray(contactIds) ? contactIds : []).map(cleanId))).filter((id) => byId.has(id))
    if (targets.length === 0) return ok({ changed: 0, perPerson: [] })
    if (targets.length > 500) return { data: null, error: 'Share at most 500 people at a time.' }
    const plan = shareOutEvenly(
      targets,
      chosen.map((p) => p.user_id),
      Object.fromEntries(chosen.map((p) => [p.user_id, p.open]))
    )
    const names = new Map(chosen.map((p) => [p.user_id, p.name]))
    const res = await (await bridge()).assignOutreachInConvex({
      campus_id: group.id,
      assignments: Object.entries(plan).map(([contact_id, uid]) => ({ contact_id, user_id: uid, name: names.get(uid) ?? null })),
      by_user_id: me.id,
      by_name: me.name,
    })
    const counts = new Map<string, number>()
    for (const uid of Object.values(plan)) counts.set(uid, (counts.get(uid) ?? 0) + 1)
    const perPerson = chosen.map((p) => ({ name: p.name, count: counts.get(p.user_id) ?? 0 }))
    await log({
      category: 'groups',
      action: 'outreach.share_out',
      summary: `Shared ${res.changed} outreach contact${res.changed === 1 ? '' : 's'} between ${chosen.length} people (${group.short_code || group.name})`,
      target: { type: 'group', id: group.id, label: group.name },
      details: { perPerson },
    })
    return ok({ changed: res.changed, perPerson })
  } catch (error) {
    return fail(error, 'Could not share them out')
  }
}

// ---------------------------------------------------------------------------
// Into the fellowship
// ---------------------------------------------------------------------------

/**
 * "Add to the campus fellowship": finds them in the directory by phone (or creates them as a
 * campus_gem member) and puts them on THIS campus via joinCampusByPhone, the same path as the
 * /join link and roster import. Never moves someone off another campus. Leaders only.
 */
export async function addOutreachToFellowshipAction(
  campusId: string,
  contactId: string
): Promise<Result<{ status: 'added' | 'already'; contact: OutreachContact | null }>> {
  try {
    const { group, user, isAdmin, access } = await guardCampus(campusId, 'manage')
    const me = meOf(user)
    const { contact } = await visibleContact(group.id, contactId, access, me)
    const { joinCampusByPhoneInConvex } = await import('@/lib/convex/campus-bridge')
    const { generateMembershipId, normalizeMembershipId } = await import('@/lib/membershipId')
    const note = [
      contact.level ? (/^\d+$/.test(contact.level) ? `Level ${contact.level}` : contact.level) : undefined,
      contact.hall ? `Hall: ${contact.hall}${contact.room ? `, room ${contact.room}` : ''}` : undefined,
      contact.programme,
      `Met on outreach ${contact.met_on}`,
    ]
      .filter(Boolean)
      .join(' · ')
    const result = await joinCampusByPhoneInConvex({
      group_id: group.id,
      full_name: contact.full_name,
      phone: contact.phone,
      whatsapp: contact.whatsapp,
      area_of_residence: contact.residence === 'hall' ? contact.hall : contact.area,
      notes: note,
      membership_id: normalizeMembershipId(generateMembershipId(contact.phone)),
      auth_uid: crypto.randomUUID(),
      confirm_move: false,
      protect_leaders: !isAdmin,
    })
    if (result.status === 'needs_move' || result.status === 'blocked_leader') {
      const from = result.from?.short_code || result.from?.name || 'another campus'
      return { data: null, error: `This number is already on ${from}. Ask an administrator to move them.` }
    }
    const updated = await (await bridge()).setOutreachStatusInConvex({
      campus_id: group.id,
      contact_id: contact.id,
      status: 'joined',
      user_id: result.user_id,
      note: result.status === 'unchanged' ? 'Already in the fellowship' : `Added to ${group.short_code || group.name} fellowship`,
      by_user_id: me.id,
      by_name: me.name,
    })
    await log({
      category: 'groups',
      action: 'outreach.join',
      summary: `Added ${contact.full_name} to ${group.short_code || group.name} fellowship from outreach`,
      target: { type: 'outreach_contact', id: contact.id, label: contact.full_name },
      details: { user_id: result.user_id, created: result.created ?? false },
    })
    return ok({ status: result.status === 'unchanged' ? 'already' : 'added', contact: updated })
  } catch (error) {
    return fail(error, 'Could not add them to the fellowship')
  }
}

// ---------------------------------------------------------------------------
// Export, summaries
// ---------------------------------------------------------------------------

/** CSV of the campus's contacts (optionally filtered). Leaders only. */
export async function exportOutreachCsvAction(
  campusId: string,
  filters?: unknown
): Promise<Result<{ filename: string; csv: string; rows: number }>> {
  try {
    const { group, user, access } = await guardCampus(campusId, 'manage')
    const me = meOf(user)
    const all = await (await bridge()).listOutreachContactsFromConvex(group.id)
    const f = { ...cleanFilters(filters), tab: 'all' as const }
    const rows = sortContacts(filterContacts(all, f, { userId: me.id, access, todayIso: today() }), 'all')
    await log({
      category: 'groups',
      action: 'outreach.export',
      summary: `Exported ${rows.length} outreach contacts (${group.short_code || group.name})`,
      target: { type: 'group', id: group.id, label: group.name },
    })
    return ok({ filename: `outreach-${campusKey(group)}-${today()}.csv`, csv: outreachCsv(rows), rows: rows.length })
  } catch (error) {
    return fail(error, 'Could not export')
  }
}

/** Campus page panel: the latest outreach Sunday's numbers and the viewer's QR link. */
export async function campusOutreachSummaryAction(
  campusId: string
): Promise<Result<{ summary: OutreachDaySummary; total: number; qrUrl: string | null; campus: OutreachCampus }>> {
  try {
    const { group, user } = await guardCampus(campusId, 'view')
    const all = await (await bridge()).listOutreachContactsFromConvex(group.id)
    return ok({
      summary: summarizeDay(all, outreachSunday(today())),
      total: all.length,
      qrUrl: user ? await qrUrlFor(group, user.id) : null,
      campus: toCampus(group),
    })
  } catch (error) {
    return fail(error, 'Could not load outreach numbers')
  }
}

/** My GEM card: the session user's campus, QR link and open follow-ups. Null when on no campus. */
export async function myOutreachSummaryAction(): Promise<
  Result<{ campus: OutreachCampus; qrUrl: string; followUps: number } | null>
> {
  const user = await guard('dashboard.view')
  try {
    if (!user) throw new Error('Sign in again.')
    const { currentCampusForUserFromConvex } = await import('@/lib/convex/campus-bridge')
    const current = await currentCampusForUserFromConvex(user.id)
    if (!current) return ok(null)
    const { fetchGroupFromConvex } = await import('@/lib/convex/core-bridge')
    const group = await fetchGroupFromConvex(current.group_id)
    if (!group || group.group_type !== 'campus' || !group.is_active) return ok(null)
    const assigned = await (await bridge()).listAssignedOutreachFromConvex(user.id)
    return ok({
      campus: toCampus(group),
      qrUrl: await qrUrlFor(group, user.id),
      followUps: openFollowUps(
        assigned.filter((c) => c.campus_id === group.id),
        user.id
      ),
    })
  } catch (error) {
    return fail(error, 'Could not load outreach')
  }
}
