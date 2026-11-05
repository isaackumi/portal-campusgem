'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CampusBadge } from '@/components/campus/campus-badge'
import { useAuth } from '@/components/providers'
import { useToast } from '@/hooks/use-toast'
import { loadCampusTagsAction, setPersonCampusAction, type CampusTag } from '@/lib/actions/campuses'

const NONE = '__none__'

/**
 * Campus tag on a member profile, plus a "Campus" select for `members.manage` holders
 * (moves them with a confirm when they're on another campus).
 */
export function MemberCampusControl({ memberId, userId }: { memberId: string; userId?: string }) {
  const { can } = useAuth()
  const { toast } = useToast()
  const canEdit = can('members.manage')
  const [tag, setTag] = useState<CampusTag | null>(null)
  const [campuses, setCampuses] = useState<Array<{ id: string; label: string; name: string; key: string }>>([])
  const [loaded, setLoaded] = useState(false)
  const [pending, setPending] = useState<{ id: string; from: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await loadCampusTagsAction()
    if (res.data) {
      setCampuses(res.data.campuses)
      setTag(res.data.byMember[memberId] ?? (userId ? res.data.byUser[userId] : undefined) ?? null)
    }
    setLoaded(true)
  }

  useEffect(() => {
    if (can('members.view')) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId, userId])

  async function apply(groupId: string | null, confirmMove = false) {
    if (!userId) return
    setBusy(true)
    const res = await setPersonCampusAction({ userId, groupId, confirmMove })
    setBusy(false)
    if (res.error || !res.data) {
      toast({ title: 'Campus not changed', description: res.error ?? undefined, variant: 'destructive' })
      return
    }
    const r = res.data
    if (r.status === 'needs_move' || r.status === 'blocked_leader') {
      setPending({ id: groupId!, from: r.from.short_code || r.from.name })
      return
    }
    setPending(null)
    toast({ title: groupId ? 'Campus updated' : 'Removed from campus' })
    await load()
  }

  if (!loaded) return null
  const target = pending ? campuses.find((c) => c.id === pending.id) : null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tag ? <CampusBadge label={tag.label} name={tag.name} href={can('groups.manage') ? `/campuses/${encodeURIComponent(tag.key)}` : undefined} /> : null}
      {canEdit && userId && campuses.length > 0 ? (
        pending ? (
          <span className="flex flex-wrap items-center gap-1.5 text-[13px] text-neutral-700 dark:text-neutral-300">
            Move from {pending.from} to {target?.label}?
            <Button size="sm" className="h-9" disabled={busy} onClick={() => apply(pending.id, true)}>
              {busy ? <LoadingSpinner size="sm" /> : 'Move'}
            </Button>
            <Button size="sm" variant="outline" className="h-9" onClick={() => setPending(null)}>Cancel</Button>
          </span>
        ) : (
          <Select value={tag?.group_id ?? NONE} onValueChange={(v) => apply(v === NONE ? null : v)} disabled={busy}>
            <SelectTrigger className="h-8 w-auto gap-1 px-2 text-xs" aria-label="Campus">
              <SelectValue placeholder="Campus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No campus</SelectItem>
              {campuses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.label === c.name ? c.name : `${c.label} · ${c.name}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      ) : null}
    </div>
  )
}
