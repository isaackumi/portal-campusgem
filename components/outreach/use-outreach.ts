'use client'

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import {
  addOutreachToFellowshipAction,
  assignOutreachAction,
  getOutreachContactAction,
  listOutreachAssigneesAction,
  listOutreachCampusesAction,
  loadOutreachAction,
  recordOutreachOutcomeAction,
  setOutreachStatusAction,
  shareOutOutreachAction,
  type OutreachAssignee,
  type OutreachPageData,
} from '@/lib/actions/outreach'
import { applyOutcome } from '@/lib/outreach/logic'
import { OUTREACH_OUTCOME_LABELS, OUTREACH_STATUS_LABELS, type OutreachOutcome } from '@/lib/outreach/options'
import type { OutreachContact, OutreachEvent, OutreachStatus } from '@/lib/outreach/types'

/** react-query plumbing for /outreach: queries, and mutations that update the screen first. */

export const outreachKeys = {
  campuses: ['outreach-campuses'] as const,
  page: (campusId: string) => ['outreach', campusId] as const,
  contact: (campusId: string, contactId: string) => ['outreach-contact', campusId, contactId] as const,
  assignees: (campusId: string) => ['outreach-assignees', campusId] as const,
}

type ContactDetail = { contact: OutreachContact; events: OutreachEvent[]; canWork: boolean }

function unwrap<T>(res: { data: T | null; error: string | null }, fallback: string): T {
  if (res.error || res.data == null) throw new Error(res.error ?? fallback)
  return res.data
}

export function useOutreachCampuses(enabled: boolean) {
  return useQuery({
    queryKey: outreachKeys.campuses,
    queryFn: async () => unwrap(await listOutreachCampusesAction(), 'Could not load your campuses'),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useOutreachPage(campusId: string | null) {
  return useQuery({
    queryKey: outreachKeys.page(campusId ?? ''),
    queryFn: async () => unwrap(await loadOutreachAction(campusId!), 'Could not load outreach'),
    enabled: Boolean(campusId),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })
}

export function useOutreachContact(campusId: string, contactId: string | null, placeholder?: OutreachContact) {
  return useQuery({
    queryKey: outreachKeys.contact(campusId, contactId ?? ''),
    queryFn: async () => unwrap(await getOutreachContactAction(campusId, contactId!), 'Could not open this person'),
    enabled: Boolean(contactId),
    placeholderData: placeholder ? { contact: placeholder, events: [], canWork: false } : undefined,
    refetchOnWindowFocus: true,
  })
}

export function useOutreachAssignees(campusId: string, enabled: boolean) {
  return useQuery({
    queryKey: outreachKeys.assignees(campusId),
    queryFn: async () => unwrap(await listOutreachAssigneesAction(campusId), 'Could not load the campus members'),
    enabled,
    staleTime: 60_000,
  })
}

type Snapshot = { page?: OutreachPageData; contacts: Array<[readonly unknown[], ContactDetail | undefined]> }

/** Change contacts on screen now; returns what to put back if the server says no. */
function patchLocal(
  qc: QueryClient,
  campusId: string,
  ids: readonly string[],
  patch: (c: OutreachContact) => OutreachContact,
  event?: (c: OutreachContact) => OutreachEvent | null
): Snapshot {
  const pageKey = outreachKeys.page(campusId)
  const snap: Snapshot = { page: qc.getQueryData<OutreachPageData>(pageKey), contacts: [] }
  const set = new Set(ids)
  if (snap.page) {
    qc.setQueryData<OutreachPageData>(pageKey, {
      ...snap.page,
      contacts: snap.page.contacts.map((c) => (set.has(c.id) ? patch(c) : c)),
    })
  }
  for (const id of ids) {
    const key = outreachKeys.contact(campusId, id)
    const detail = qc.getQueryData<ContactDetail>(key)
    snap.contacts.push([key, detail])
    if (detail) {
      const next = patch(detail.contact)
      const e = event?.(detail.contact)
      qc.setQueryData<ContactDetail>(key, { ...detail, contact: next, events: e ? [...detail.events, e] : detail.events })
    }
  }
  return snap
}

function restore(qc: QueryClient, campusId: string, snap: Snapshot | undefined) {
  if (!snap) return
  if (snap.page) qc.setQueryData(outreachKeys.page(campusId), snap.page)
  for (const [key, detail] of snap.contacts) qc.setQueryData(key, detail)
}

function refresh(qc: QueryClient, campusId: string, ids: readonly string[] = []) {
  void qc.invalidateQueries({ queryKey: outreachKeys.page(campusId) })
  for (const id of ids) void qc.invalidateQueries({ queryKey: outreachKeys.contact(campusId, id) })
}

export function useOutreachMutations(campusId: string, me: { id: string; name: string } | null) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const tempEvent = (kind: OutreachEvent['kind'], extra: Partial<OutreachEvent> = {}) => (c: OutreachContact): OutreachEvent => ({
    id: `temp-${Date.now()}`,
    contact_id: c.id,
    at: Date.now(),
    by_user_id: me?.id,
    by_name: me?.name,
    kind,
    ...extra,
  })

  const record = useMutation({
    mutationFn: async (v: { contactId: string; channel: 'call' | 'whatsapp' | 'note'; outcome?: OutreachOutcome; note?: string }) =>
      unwrap(await recordOutreachOutcomeAction(campusId, v.contactId, { channel: v.channel, outcome: v.outcome, note: v.note }), 'Could not save'),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: outreachKeys.page(campusId) })
      const now = Date.now()
      return patchLocal(
        qc,
        campusId,
        [v.contactId],
        (c) => (v.outcome ? { ...c, ...applyOutcome(c, v.outcome, now) } : c),
        tempEvent(v.outcome && v.channel === 'note' ? 'call' : v.channel, { outcome: v.outcome, note: v.note })
      )
    },
    onError: (error, _v, snap) => {
      restore(qc, campusId, snap)
      toast({ title: 'Not saved', description: error instanceof Error ? error.message : undefined, variant: 'destructive' })
    },
    onSuccess: (_d, v) => {
      toast({ title: v.outcome ? `Saved: ${OUTREACH_OUTCOME_LABELS[v.outcome]}` : 'Note saved' })
    },
    onSettled: (_d, _e, v) => refresh(qc, campusId, [v.contactId]),
  })

  const setStatus = useMutation({
    mutationFn: async (v: { contactId: string; status: OutreachStatus }) =>
      unwrap(await setOutreachStatusAction(campusId, v.contactId, v.status), 'Could not change the status'),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: outreachKeys.page(campusId) })
      return patchLocal(qc, campusId, [v.contactId], (c) => ({ ...c, status: v.status }), (c) =>
        c.status === v.status ? null : tempEvent('status', { outcome: v.status })(c)
      )
    },
    onError: (error, _v, snap) => {
      restore(qc, campusId, snap)
      toast({ title: 'Status not changed', description: error instanceof Error ? error.message : undefined, variant: 'destructive' })
    },
    onSuccess: (_d, v) => toast({ title: `Status: ${OUTREACH_STATUS_LABELS[v.status]}` }),
    onSettled: (_d, _e, v) => refresh(qc, campusId, [v.contactId]),
  })

  const assign = useMutation({
    mutationFn: async (v: { contactIds: string[]; person: OutreachAssignee | null }) =>
      unwrap(await assignOutreachAction(campusId, v.contactIds, v.person?.user_id ?? null), 'Could not assign'),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: outreachKeys.page(campusId) })
      return patchLocal(
        qc,
        campusId,
        v.contactIds,
        (c) => ({ ...c, assigned_to: v.person?.user_id, assigned_name: v.person?.name, assigned_at: v.person ? Date.now() : undefined }),
        tempEvent('assign', { note: v.person ? `Given to ${v.person.name}` : 'Taken back (nobody assigned)' })
      )
    },
    onError: (error, _v, snap) => {
      restore(qc, campusId, snap)
      toast({ title: 'Not assigned', description: error instanceof Error ? error.message : undefined, variant: 'destructive' })
    },
    onSuccess: (_d, v) => {
      const n = v.contactIds.length
      toast({ title: v.person ? `${n === 1 ? 'Given' : `${n} people given`} to ${v.person.name}` : 'Nobody is following them up now' })
    },
    onSettled: (_d, _e, v) => {
      refresh(qc, campusId, v.contactIds)
      void qc.invalidateQueries({ queryKey: outreachKeys.assignees(campusId) })
    },
  })

  const shareOut = useMutation({
    mutationFn: async (v: { contactIds: string[] | 'unassigned'; userIds: string[] }) =>
      unwrap(await shareOutOutreachAction(campusId, v.contactIds, v.userIds), 'Could not share them out'),
    onError: (error) => toast({ title: 'Not shared out', description: error instanceof Error ? error.message : undefined, variant: 'destructive' }),
    onSuccess: (d) => {
      toast({
        title: d.changed === 0 ? 'Nobody left to share out' : `Shared out ${d.changed} ${d.changed === 1 ? 'person' : 'people'}`,
        description: d.perPerson.filter((p) => p.count > 0).map((p) => `${p.name}: ${p.count}`).join(', ') || undefined,
      })
    },
    onSettled: () => {
      refresh(qc, campusId)
      void qc.invalidateQueries({ queryKey: ['outreach-contact', campusId] })
      void qc.invalidateQueries({ queryKey: outreachKeys.assignees(campusId) })
    },
  })

  const join = useMutation({
    mutationFn: async (v: { contactId: string }) => unwrap(await addOutreachToFellowshipAction(campusId, v.contactId), 'Could not add them'),
    onError: (error) => toast({ title: 'Not added', description: error instanceof Error ? error.message : undefined, variant: 'destructive' }),
    onSuccess: (d) => toast({ title: d.status === 'already' ? 'Already in the fellowship; marked as joined' : 'Added to the fellowship' }),
    onSettled: (_d, _e, v) => refresh(qc, campusId, [v.contactId]),
  })

  return { record, setStatus, assign, shareOut, join }
}
