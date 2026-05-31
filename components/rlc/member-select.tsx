'use client'

import { useEffect, useMemo, useState } from 'react'
import { loadMemberById, loadMembersPage } from '@/lib/actions/core-data'
import type { Member } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'

const EMPTY_IDS: string[] = []

function memberLabel(m: Member): string {
  return m.user?.full_name?.trim() || m.user?.membership_id || 'Member'
}

function memberDetail(m: Member): string {
  const parts = [m.user?.phone, m.user?.membership_id].filter(Boolean)
  return parts.join(' · ')
}

function idsKey(ids: string[]): string {
  if (ids.length === 0) return ''
  return [...ids].sort().join('|')
}

function useMemberSearch(query: string, excludeIdsKey: string) {
  const [suggestions, setSuggestions] = useState<Member[]>([])
  const [searching, setSearching] = useState(false)
  const needle = query.trim()

  useEffect(() => {
    if (!needle) return

    let cancelled = false
    setSearching(true)

    const timer = window.setTimeout(async () => {
      const result = await loadMembersPage(1, 20, needle)
      if (cancelled) return

      const exclude = new Set(excludeIdsKey ? excludeIdsKey.split('|').filter(Boolean) : [])
      setSuggestions((result.data ?? []).filter((m) => !exclude.has(m.id)))
      setSearching(false)
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [needle, excludeIdsKey])

  return {
    suggestions: needle ? suggestions : [],
    searching: needle ? searching : false,
  }
}

function useSelectedMembers(ids: string[]) {
  const [selected, setSelected] = useState<Member[]>([])
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

      const next = rows.map((r) => r.data).filter(Boolean) as Member[]
      setSelected((prev) => {
        if (prev.length === next.length && prev.every((m, i) => m.id === next[i]?.id)) {
          return prev
        }
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

export function MemberMultiSelect({
  label = 'Members who brought visitor',
  value,
  onChange,
  placeholder = 'Search by name, phone, or membership ID…',
}: Props) {
  const [query, setQuery] = useState('')
  const memberIds = value.length > 0 ? value : EMPTY_IDS
  const excludeIdsKey = useMemo(() => idsKey(memberIds), [memberIds])
  const selected = useSelectedMembers(memberIds)
  const { suggestions, searching } = useMemberSearch(query, excludeIdsKey)

  function add(id: string) {
    onChange([...memberIds, id])
    setQuery('')
  }

  function remove(id: string) {
    onChange(memberIds.filter((v) => v !== id))
  }

  const trimmedQuery = query.trim()
  const showEmpty = trimmedQuery.length > 0 && !searching && suggestions.length === 0

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((m) => (
            <Badge key={m.id} variant="secondary" className="gap-1 pr-1">
              {memberLabel(m)}
              <button type="button" onClick={() => remove(m.id)} className="rounded p-0.5 hover:bg-slate-200">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
      {searching ? <p className="text-xs text-muted-foreground">Searching…</p> : null}
      {showEmpty ? <p className="text-xs text-muted-foreground">No members match your search.</p> : null}
      {suggestions.length > 0 ? (
        <div className="rounded-md border bg-white shadow-sm">
          {suggestions.map((m) => (
            <button
              key={m.id}
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={() => add(m.id)}
            >
              <span>{memberLabel(m)}</span>
              <span className="text-xs text-muted-foreground">{memberDetail(m)}</span>
            </button>
          ))}
        </div>
      ) : null}
      {memberIds.length === 0 ? (
        <p className="text-xs text-muted-foreground">Optional — select one or more sponsoring members.</p>
      ) : null}
    </div>
  )
}

type SingleProps = {
  label?: string
  value?: string
  onChange: (id: string | undefined) => void
  placeholder?: string
}

export function MemberSingleSelect({
  label = 'Assigned for follow-up',
  value,
  onChange,
  placeholder = 'Search by name, phone, or membership ID…',
}: SingleProps) {
  const [query, setQuery] = useState('')
  const memberIds = useMemo(() => (value ? [value] : EMPTY_IDS), [value])
  const excludeIdsKey = useMemo(() => idsKey(memberIds), [memberIds])
  const selectedList = useSelectedMembers(memberIds)
  const selected = selectedList[0]
  const { suggestions, searching } = useMemberSearch(query, excludeIdsKey)

  const trimmedQuery = query.trim()
  const showEmpty = trimmedQuery.length > 0 && !searching && suggestions.length === 0

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {selected ? (
        <div className="flex items-center gap-2">
          <Badge variant="outline">{memberLabel(selected)}</Badge>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            Clear
          </Button>
        </div>
      ) : (
        <>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
          {searching ? <p className="text-xs text-muted-foreground">Searching…</p> : null}
          {showEmpty ? <p className="text-xs text-muted-foreground">No members match your search.</p> : null}
          {suggestions.length > 0 ? (
            <div className="rounded-md border bg-white shadow-sm">
              {suggestions.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    onChange(m.id)
                    setQuery('')
                  }}
                >
                  <span>{memberLabel(m)}</span>
                  <span className="text-xs text-muted-foreground">{memberDetail(m)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
