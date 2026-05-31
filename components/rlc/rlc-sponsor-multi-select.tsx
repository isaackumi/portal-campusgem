'use client'

import { useEffect, useMemo, useState } from 'react'
import { loadMemberById } from '@/lib/actions/core-data'
import { resolveRlcSponsorToMemberAction, searchRlcSponsorsAction } from '@/lib/actions/rlc'
import type { RlcSponsorSearchResult } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const EMPTY_IDS: string[] = []

function idsKey(ids: string[]): string {
  if (ids.length === 0) return ''
  return [...ids].sort().join('|')
}

function useSelectedSponsors(ids: string[]) {
  const [selected, setSelected] = useState<{ id: string; label: string }[]>([])
  const key = idsKey(ids)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!key) {
        setSelected((prev) => (prev.length === 0 ? prev : []))
        return
      }
      const idList = key.split('|')
      const rows = await Promise.all(idList.map((id) => loadMemberById(id)))
      if (cancelled) return
      const next = rows
        .map((r, i) => {
          const m = r.data
          if (!m) return { id: idList[i], label: 'Member' }
          return { id: m.id, label: m.user?.full_name?.trim() || m.user?.membership_id || 'Member' }
        })
        .filter(Boolean)
      setSelected((prev) => {
        if (prev.length === next.length && prev.every((p, i) => p.id === next[i]?.id)) return prev
        return next
      })
    }
    load()
    return () => {
      cancelled = true
    }
  }, [key])

  return selected
}

type Props = {
  label?: string
  value: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
}

export function RlcSponsorMultiSelect({
  label = 'Who brought you? (optional)',
  value,
  onChange,
  placeholder = 'Search members, Campus Gem, or camp directory…',
}: Props) {
  const { toast } = useToast()
  const memberIds = value.length > 0 ? value : EMPTY_IDS
  const excludeKey = useMemo(() => idsKey(memberIds), [memberIds])
  const selected = useSelectedSponsors(memberIds)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<RlcSponsorSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [resolving, setResolving] = useState(false)
  const needle = query.trim()

  useEffect(() => {
    if (!needle) {
      setSuggestions([])
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = window.setTimeout(async () => {
      const { data, error } = await searchRlcSponsorsAction(needle)
      if (cancelled) return
      if (error) {
        toast({ variant: 'destructive', title: 'Search failed', description: error })
        setSuggestions([])
      } else {
        const exclude = new Set(excludeKey ? excludeKey.split('|') : [])
        setSuggestions((data ?? []).filter((s) => !s.member_id || !exclude.has(s.member_id)))
      }
      setSearching(false)
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [needle, excludeKey, toast])

  async function add(sponsor: RlcSponsorSearchResult) {
    setResolving(true)
    const { data, error } = await resolveRlcSponsorToMemberAction(sponsor)
    setResolving(false)
    if (error || !data) {
      toast({
        variant: 'destructive',
        title: 'Could not add sponsor',
        description: error ?? 'Unable to link this person as a member sponsor.',
      })
      return
    }
    if (memberIds.includes(data.memberId)) {
      setQuery('')
      return
    }
    onChange([...memberIds, data.memberId])
    setQuery('')
  }

  function remove(id: string) {
    onChange(memberIds.filter((v) => v !== id))
  }

  const showEmpty = needle.length > 0 && !searching && !resolving && suggestions.length === 0

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((s) => (
            <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
              {s.label}
              <button type="button" onClick={() => remove(s.id)} className="rounded p-0.5 hover:bg-slate-200">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        disabled={resolving}
      />
      {searching || resolving ? (
        <p className="text-xs text-muted-foreground">{resolving ? 'Linking sponsor…' : 'Searching…'}</p>
      ) : null}
      {showEmpty ? (
        <p className="text-xs text-muted-foreground">
          No matches. Try another name or phone — camp contacts are added automatically when selected.
        </p>
      ) : null}
      {suggestions.length > 0 ? (
        <div className="rounded-md border bg-white shadow-sm">
          {suggestions.map((s) => (
            <button
              key={s.key}
              type="button"
              className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-rose-50/60"
              disabled={resolving}
              onClick={() => void add(s)}
            >
              <span className="min-w-0">
                <span className="font-medium">{s.full_name}</span>
                {(s.phone || s.membership_id) && (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {[s.phone, s.membership_id].filter(Boolean).join(' · ')}
                  </span>
                )}
              </span>
              {s.badge ? (
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {s.badge}
                </Badge>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Search church members, Campus Gem profiles, or camp registrations. People not yet in the member list are
        linked automatically.
      </p>
    </div>
  )
}
