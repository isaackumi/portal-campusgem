'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useGroups } from '@/lib/hooks/use-data'
import { saveEventAction } from '@/lib/actions/events'
import {
  type ChurchEvent,
  type EventAudience,
  type EventStatus,
  localInputToMs,
  msToLocalInput,
} from '@/lib/events/rsvp'

const AUDIENCE_HINT: Record<EventAudience, string> = {
  all: 'Every active Campus Gem member.',
  group: 'Active members of one group.',
  custom: 'People you pick on the event page.',
}

/** Create or edit an event. Times are Ghana time (UTC+0). */
export function EventForm({ event }: { event?: ChurchEvent }) {
  const router = useRouter()
  const { toast } = useToast()
  const { data: groups } = useGroups(1, 200)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: event?.title ?? '',
    description: event?.description ?? '',
    starts_at: msToLocalInput(event?.starts_at),
    ends_at: msToLocalInput(event?.ends_at),
    location: event?.location ?? '',
    capacity: event?.capacity ? String(event.capacity) : '',
    audience: (event?.audience ?? 'all') as EventAudience,
    group_id: event?.group_id ?? '',
    rsvp_closes_at: msToLocalInput(event?.rsvp_closes_at),
    status: (event?.status ?? 'draft') as EventStatus,
  })

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await saveEventAction({
        id: event?.id,
        title: form.title,
        description: form.description,
        starts_at: localInputToMs(form.starts_at) ?? undefined,
        ends_at: localInputToMs(form.ends_at) ?? undefined,
        location: form.location,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        audience: form.audience,
        group_id: form.group_id || undefined,
        rsvp_closes_at: localInputToMs(form.rsvp_closes_at) ?? undefined,
        status: form.status,
      })
      if (res.error || !res.data) {
        setError(res.error ?? 'Could not save the event.')
        return
      }
      toast({ title: event ? 'Event updated' : 'Event created' })
      router.push(`/admin/events/${res.data.id}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="dashboard-panel space-y-5 p-5">
      <div>
        <Label htmlFor="ev-title">Title</Label>
        <Input id="ev-title" value={form.title} maxLength={120} onChange={(e) => set('title', e.target.value)} required className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="ev-desc">Description</Label>
        <Textarea id="ev-desc" value={form.description} rows={3} maxLength={2000} onChange={(e) => set('description', e.target.value)} className="mt-1.5" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ev-start">Starts (Ghana time)</Label>
          <Input id="ev-start" type="datetime-local" value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="ev-end">Ends (optional)</Label>
          <Input id="ev-end" type="datetime-local" value={form.ends_at} onChange={(e) => set('ends_at', e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="ev-loc">Location</Label>
          <Input id="ev-loc" value={form.location} maxLength={200} onChange={(e) => set('location', e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="ev-cap">Capacity (optional)</Label>
          <Input
            id="ev-cap"
            type="number"
            inputMode="numeric"
            min={1}
            value={form.capacity}
            onChange={(e) => set('capacity', e.target.value)}
            placeholder="No limit"
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Counts people saying yes plus their guests.</p>
        </div>
        <div>
          <Label htmlFor="ev-close">RSVPs close (optional)</Label>
          <Input id="ev-close" type="datetime-local" value={form.rsvp_closes_at} onChange={(e) => set('rsvp_closes_at', e.target.value)} className="mt-1.5" />
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Otherwise answers close when the event starts.</p>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => set('status', v as EventStatus)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft (not visible, no invites)</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Who is invited</Label>
          <Select value={form.audience} onValueChange={(v) => set('audience', v as EventAudience)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              <SelectItem value="group">A group</SelectItem>
              <SelectItem value="custom">Chosen people</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{AUDIENCE_HINT[form.audience]}</p>
        </div>
        {form.audience === 'group' ? (
          <div>
            <Label>Group</Label>
            <Select value={form.group_id} onValueChange={(v) => set('group_id', v)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Choose a group" />
              </SelectTrigger>
              <SelectContent>
                {(groups ?? []).map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          {event ? 'Save changes' : 'Create event'}
        </Button>
      </div>
    </form>
  )
}
