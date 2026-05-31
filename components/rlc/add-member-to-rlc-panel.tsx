'use client'

import { useState } from 'react'
import { loadMembersPage } from '@/lib/actions/core-data'
import type { Member } from '@/lib/types'
import { AddToRlcDialog } from '@/components/rlc/add-to-rlc-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Church, Search } from 'lucide-react'

type Props = {
  onAdded?: () => void
}

export function AddMemberToRlcPanel({ onAdded }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Member[]>([])
  const [searching, setSearching] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Member | null>(null)

  async function search() {
    const needle = query.trim()
    if (needle.length < 1) return
    setSearching(true)
    const res = await loadMembersPage(1, 15, needle)
    setResults(res.data ?? [])
    setSearching(false)
  }

  function openForMember(member: Member) {
    setSelected(member)
    setDialogOpen(true)
  }

  return (
    <>
      <Card className="border-rose-100/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Church className="h-5 w-5 text-rose-700" />
            Add member to RLC
          </CardTitle>
          <CardDescription>Search the directory, then assign ministry roles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Name, phone, or membership ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void search()}
            />
            <Button
              type="button"
              className="shrink-0 bg-rose-700 hover:bg-rose-800 sm:w-auto"
              disabled={searching}
              onClick={() => void search()}
            >
              <Search className="mr-2 h-4 w-4" />
              {searching ? 'Searching…' : 'Search'}
            </Button>
          </div>
          {results.length > 0 ? (
            <ul className="divide-y rounded-md border bg-white">
              {results.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-0.5 px-3 py-3 text-left hover:bg-rose-50/50 sm:flex-row sm:items-center sm:justify-between"
                    onClick={() => openForMember(m)}
                  >
                    <span className="font-medium">{m.user?.full_name ?? 'Member'}</span>
                    <span className="text-xs text-muted-foreground sm:text-sm">
                      {[m.user?.phone, m.user?.membership_id].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      {selected ? (
        <AddToRlcDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) setSelected(null)
          }}
          contactName={selected.user?.full_name ?? 'Member'}
          userId={selected.user_id}
          memberId={selected.id}
          existingRoles={selected.rlc_roles}
          onSuccess={() => {
            setDialogOpen(false)
            setSelected(null)
            setResults([])
            setQuery('')
            onAdded?.()
          }}
        />
      ) : null}
    </>
  )
}
