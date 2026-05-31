'use client'

import { useEffect, useState } from 'react'
import { dataService } from '@/lib/services/data-service'
import type { Member } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'

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
  placeholder = 'Search by name or phone…',
}: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    dataService.getMembers(1, 500).then(({ data }) => setMembers(data ?? []))
  }, [])

  const selected = members.filter((m) => value.includes(m.id))
  const needle = query.trim().toLowerCase()
  const suggestions = needle
    ? members
        .filter((m) => !value.includes(m.id))
        .filter((m) => {
          const name = m.user?.full_name ?? ''
          const phone = m.user?.phone ?? ''
          const mid = m.user?.membership_id ?? ''
          return `${name} ${phone} ${mid}`.toLowerCase().includes(needle)
        })
        .slice(0, 8)
    : []

  function add(id: string) {
    onChange([...value, id])
    setQuery('')
  }

  function remove(id: string) {
    onChange(value.filter((v) => v !== id))
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((m) => (
            <Badge key={m.id} variant="secondary" className="gap-1 pr-1">
              {m.user?.full_name ?? m.id}
              <button type="button" onClick={() => remove(m.id)} className="rounded p-0.5 hover:bg-slate-200">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
      {suggestions.length > 0 ? (
        <div className="rounded-md border bg-white shadow-sm">
          {suggestions.map((m) => (
            <button
              key={m.id}
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={() => add(m.id)}
            >
              <span>{m.user?.full_name ?? 'Member'}</span>
              <span className="text-xs text-muted-foreground">{m.user?.phone}</span>
            </button>
          ))}
        </div>
      ) : null}
      {value.length === 0 ? (
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
  placeholder = 'Search member…',
}: SingleProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    dataService.getMembers(1, 500).then(({ data }) => setMembers(data ?? []))
  }, [])

  const selected = value ? members.find((m) => m.id === value) : undefined
  const needle = query.trim().toLowerCase()
  const suggestions = needle
    ? members
        .filter((m) => m.id !== value)
        .filter((m) => {
          const name = m.user?.full_name ?? ''
          const phone = m.user?.phone ?? ''
          return `${name} ${phone}`.toLowerCase().includes(needle)
        })
        .slice(0, 8)
    : []

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {selected ? (
        <div className="flex items-center gap-2">
          <Badge variant="outline">{selected.user?.full_name}</Badge>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            Clear
          </Button>
        </div>
      ) : (
        <>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
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
                  <span>{m.user?.full_name ?? 'Member'}</span>
                  <span className="text-xs text-muted-foreground">{m.user?.phone}</span>
                </button>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
