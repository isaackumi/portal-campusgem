import 'server-only'

import { getConvexHttpClient } from '@/lib/convex/http-client'
import { api } from '@/convex/_generated/api'
import { requireCoreServerSecret } from '@/lib/convex/core-bridge'
import type { OutreachAnswers, OutreachContact, OutreachEvent, OutreachStatus } from '@/lib/outreach/types'

/** Server-side access to convex/outreach.ts. Callers authorise first (lib/actions/outreach.ts). */

function secret() {
  return requireCoreServerSecret()
}

function client() {
  return getConvexHttpClient()
}

function toContact(doc: Record<string, unknown> | null | undefined): OutreachContact | null {
  if (!doc || typeof doc._id !== 'string') return null
  const { _id, _creationTime: _ct, ...rest } = doc
  return { id: _id, ...(rest as Omit<OutreachContact, 'id'>) }
}

function toEvent(doc: Record<string, unknown>): OutreachEvent {
  const { _id, _creationTime: _ct, contact_id, ...rest } = doc
  return { id: String(_id), contact_id: String(contact_id), ...(rest as Omit<OutreachEvent, 'id' | 'contact_id'>) }
}

function contacts(rows: unknown): OutreachContact[] {
  return (Array.isArray(rows) ? rows : []).map((r) => toContact(r as Record<string, unknown>)).filter((c): c is OutreachContact => c != null)
}

export async function listOutreachContactsFromConvex(campusId: string): Promise<OutreachContact[]> {
  return contacts(await client().query(api.outreach.listContactsWithSecret, { secret: secret(), campus_id: campusId }))
}

export async function listAssignedOutreachFromConvex(userId: string): Promise<OutreachContact[]> {
  return contacts(await client().query(api.outreach.listAssignedWithSecret, { secret: secret(), user_id: userId }))
}

export async function getOutreachContactFromConvex(
  campusId: string,
  contactId: string
): Promise<{ contact: OutreachContact; events: OutreachEvent[] } | null> {
  try {
    const res = (await client().query(api.outreach.getContactWithSecret, {
      secret: secret(),
      campus_id: campusId,
      contact_id: contactId,
    })) as { contact: Record<string, unknown>; events: Array<Record<string, unknown>> }
    const contact = toContact(res.contact)
    return contact ? { contact, events: res.events.map(toEvent) } : null
  } catch (error) {
    if (error instanceof Error && /not on this campus/.test(error.message)) return null
    throw error
  }
}

function dropUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T
}

export async function submitOutreachContactInConvex(args: {
  campus_id: string
  answers: OutreachAnswers
  met_on: string
  met_by_user_id?: string
  met_by_name?: string
  source: 'qr' | 'member'
}): Promise<{ id: string; merged: boolean }> {
  return (await client().mutation(api.outreach.submitContactWithSecret, {
    secret: secret(),
    campus_id: args.campus_id,
    ...dropUndefined(args.answers),
    met_on: args.met_on,
    source: args.source,
    ...dropUndefined({ met_by_user_id: args.met_by_user_id, met_by_name: args.met_by_name }),
  })) as { id: string; merged: boolean }
}

/** Full replacement of the answers: anything left empty is cleared. */
export async function updateOutreachContactInConvex(
  campusId: string,
  contactId: string,
  answers: OutreachAnswers
): Promise<OutreachContact | null> {
  const doc = await client().mutation(api.outreach.updateContactWithSecret, {
    secret: secret(),
    campus_id: campusId,
    contact_id: contactId,
    full_name: answers.full_name,
    phone: answers.phone,
    whatsapp: answers.whatsapp ?? null,
    student_id: answers.student_id ?? null,
    level: answers.level ?? null,
    programme: answers.programme ?? null,
    residence: answers.residence ?? null,
    hall: answers.hall ?? null,
    room: answers.room ?? null,
    area: answers.area ?? null,
    ministry_interests: answers.ministry_interests ?? null,
    ministry_other: answers.ministry_other ?? null,
    bible_study: answers.bible_study ?? null,
    prayer_request: answers.prayer_request ?? null,
  })
  return toContact(doc as Record<string, unknown>)
}

export async function recordOutreachInConvex(args: {
  campus_id: string
  contact_id: string
  kind: 'call' | 'whatsapp' | 'note'
  outcome?: string
  note?: string
  status?: OutreachStatus
  bible_study?: 'yes'
  by_user_id?: string
  by_name?: string
}): Promise<OutreachContact | null> {
  const doc = await client().mutation(api.outreach.recordContactWithSecret, { secret: secret(), ...dropUndefined(args) })
  return toContact(doc as Record<string, unknown>)
}

export async function setOutreachStatusInConvex(args: {
  campus_id: string
  contact_id: string
  status: OutreachStatus
  note?: string
  user_id?: string
  by_user_id?: string
  by_name?: string
}): Promise<OutreachContact | null> {
  const doc = await client().mutation(api.outreach.setStatusWithSecret, { secret: secret(), ...dropUndefined(args) })
  return toContact(doc as Record<string, unknown>)
}

export async function assignOutreachInConvex(args: {
  campus_id: string
  assignments: Array<{ contact_id: string; user_id: string | null; name: string | null }>
  by_user_id?: string
  by_name?: string
}): Promise<{ changed: number }> {
  return (await client().mutation(api.outreach.assignContactsWithSecret, { secret: secret(), ...dropUndefined(args) })) as {
    changed: number
  }
}
