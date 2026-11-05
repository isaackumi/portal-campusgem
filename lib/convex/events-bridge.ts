import 'server-only'

import { getConvexHttpClient } from '@/lib/convex/http-client'
import { requireCoreServerSecret } from '@/lib/convex/core-bridge'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type { ChurchEvent, EventInput, RsvpResponse, RsvpTally } from '@/lib/events/rsvp'

export type EventWithTally = ChurchEvent & { tally: RsvpTally }

/** Admin view of one invitee. No token: it never leaves the server except inside the SMS. */
export type EventInvitee = {
  id: string
  user_id: string
  name: string
  phone?: string
  membership_id?: string
  sms_opt_out: boolean
  response?: RsvpResponse
  guests: number
  responded_at?: number
  invited_at?: number
  reminder_sent_at?: number
}

export type SendTarget = {
  rsvp_id: string
  user_id: string
  token: string
  name: string
  first_name: string
  phone?: string
  sms_opt_out: boolean
  invited_at?: number
  response?: RsvpResponse
}

export type PublicRsvpContext = {
  first_name: string
  event: Pick<ChurchEvent, 'title' | 'description' | 'starts_at' | 'ends_at' | 'location' | 'capacity' | 'rsvp_closes_at' | 'status'>
  response?: RsvpResponse
  guests: number
  others_headcount: number
}

export type MyEvent = Pick<
  ChurchEvent,
  'title' | 'description' | 'starts_at' | 'ends_at' | 'location' | 'capacity' | 'rsvp_closes_at' | 'status'
> & {
  event_id: string
  response?: RsvpResponse
  guests: number
  others_headcount: number
}

function client() {
  return getConvexHttpClient()
}

function mapEvent(raw: Record<string, unknown>): ChurchEvent {
  return { ...(raw as unknown as ChurchEvent), id: String(raw.id) }
}

export async function listEventsFromConvex(): Promise<EventWithTally[]> {
  const rows = (await client().query(api.events.listEventsWithSecret, { secret: requireCoreServerSecret() })) as Array<
    Record<string, unknown>
  >
  return rows.map((r) => ({ ...mapEvent(r), tally: r.tally as RsvpTally }))
}

export async function getEventFromConvex(id: string): Promise<{ event: ChurchEvent; rsvps: EventInvitee[] } | null> {
  const raw = (await client().query(api.events.getEventWithSecret, { secret: requireCoreServerSecret(), id })) as {
    event: Record<string, unknown>
    rsvps: EventInvitee[]
  } | null
  if (!raw) return null
  return {
    event: mapEvent(raw.event),
    rsvps: raw.rsvps.map((r) => ({ ...r, id: String(r.id), user_id: String(r.user_id) })),
  }
}

export async function createEventInConvex(input: EventInput, createdBy: string): Promise<string> {
  return client().mutation(api.events.createEventWithSecret, {
    secret: requireCoreServerSecret(),
    created_by: createdBy,
    ...input,
  })
}

export async function updateEventInConvex(id: string, input: EventInput): Promise<void> {
  await client().mutation(api.events.updateEventWithSecret, {
    secret: requireCoreServerSecret(),
    id: id as Id<'events'>,
    ...input,
  })
}

export async function addInviteesInConvex(
  eventId: string,
  invitees: Array<{ user_id: string; token: string }>
): Promise<number> {
  let added = 0
  // Keep each mutation small.
  for (let i = 0; i < invitees.length; i += 200) {
    const res = await client().mutation(api.events.addInviteesWithSecret, {
      secret: requireCoreServerSecret(),
      event_id: eventId as Id<'events'>,
      invitees: invitees.slice(i, i + 200),
    })
    added += res.added
  }
  return added
}

export async function removeInviteeInConvex(rsvpId: string): Promise<void> {
  await client().mutation(api.events.removeInviteeWithSecret, {
    secret: requireCoreServerSecret(),
    rsvp_id: rsvpId as Id<'event_rsvps'>,
  })
}

export async function listSendTargetsFromConvex(eventId: string, rsvpIds: string[]): Promise<SendTarget[]> {
  const rows = (await client().query(api.events.listSendTargetsWithSecret, {
    secret: requireCoreServerSecret(),
    event_id: eventId as Id<'events'>,
    rsvp_ids: rsvpIds,
  })) as SendTarget[]
  return rows.map((r) => ({ ...r, rsvp_id: String(r.rsvp_id), user_id: String(r.user_id) }))
}

export async function markSentInConvex(rsvpIds: string[], kind: 'invite' | 'reminder'): Promise<void> {
  if (!rsvpIds.length) return
  await client().mutation(api.events.markSentWithSecret, {
    secret: requireCoreServerSecret(),
    rsvp_ids: rsvpIds as Id<'event_rsvps'>[],
    kind,
  })
}

export async function getRsvpByTokenFromConvex(token: string): Promise<PublicRsvpContext | null> {
  return (await client().query(api.events.getRsvpByTokenWithSecret, {
    secret: requireCoreServerSecret(),
    token,
  })) as PublicRsvpContext | null
}

export async function respondRsvpInConvex(args: {
  token?: string
  event_id?: string
  user_id?: string
  response: RsvpResponse
  guests: number
}): Promise<{ ok: boolean; error?: string; full?: boolean }> {
  return (await client().mutation(api.events.respondRsvpWithSecret, {
    secret: requireCoreServerSecret(),
    ...args,
  })) as { ok: boolean; error?: string; full?: boolean }
}

export async function listMyEventsFromConvex(userId: string): Promise<MyEvent[]> {
  const rows = (await client().query(api.events.listMyEventsWithSecret, {
    secret: requireCoreServerSecret(),
    user_id: userId,
  })) as MyEvent[]
  return rows.map((r) => ({ ...r, event_id: String(r.event_id) }))
}
