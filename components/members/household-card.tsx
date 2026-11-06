'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Home, Plus, Search, Star, X } from 'lucide-react'
import { useAuth } from '@/components/providers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PersonAvatar } from '@/components/ui/person'
import { useToast } from '@/hooks/use-toast'
import {
  addToHouseholdAction,
  createHouseholdAction,
  loadUserHouseholdAction,
  removeFromHouseholdAction,
  searchPeopleForHouseholdAction,
  setHouseholdPrimaryAction,
  type HouseholdSearchResult,
} from '@/lib/actions/households'

/**
 * Household card for a member profile. Anyone with `members.view` sees it;
 * changes need `members.manage`.
 */
export function HouseholdCard({ userId, fullName }: { userId: string; fullName: string }) {
  const { can } = useAuth()
  const canManage = can('members.manage')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'idle' | 'create' | 'add'>('idle')
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<HouseholdSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [busy, setBusy] = useState(false)

  const queryKey = ['household', userId]
  const householdQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await loadUserHouseholdAction(userId)
      if (res.error) throw new Error(res.error)
      return res.data
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
  const household = householdQuery.data ?? null

  useEffect(() => {
    if (mode !== 'add' || search.trim().length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      const res = await searchPeopleForHouseholdAction(search)
      setResults(res.data ?? [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, mode])

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['household'] })
  }

  async function run(fn: () => Promise<{ error: string | null }>, done: string) {
    setBusy(true)
    try {
      const res = await fn()
      if (res.error) {
        toast({ variant: 'destructive', title: 'Not saved', description: res.error })
        return false
      }
      toast({ title: done })
      refresh()
      return true
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Not saved',
        description: error instanceof Error ? error.message : 'Something went wrong',
      })
      return false
    } finally {
      setBusy(false)
    }
  }

  async function create() {
    const ok = await run(() => createHouseholdAction({ name: name.trim(), userId }), 'Household created')
    if (ok) {
      setMode('idle')
      setName('')
    }
  }

  /** No household yet: put this person into the chosen person's household (or start one with them). */
  async function addPerson(person: HouseholdSearchResult) {
    let ok: boolean
    if (household) {
      if (person.household_id && person.household_id !== household.id) {
        if (!window.confirm(`${person.full_name} is in another household. Move them to ${household.name}?`)) return
      }
      ok = await run(
        () => addToHouseholdAction({ householdId: household.id, userId: person.id }),
        `${person.full_name} added`
      )
    } else if (person.household_id) {
      ok = await run(
        () => addToHouseholdAction({ householdId: person.household_id!, userId }),
        `${fullName} joined ${person.full_name}'s household`
      )
    } else {
      const surname = person.full_name.trim().split(/\s+/).pop() || person.full_name
      ok = await run(async () => {
        const created = await createHouseholdAction({ name: `${surname} household`, userId: person.id })
        if (created.error || !created.data) return { error: created.error ?? 'Could not create the household' }
        return addToHouseholdAction({ householdId: created.data.id, userId })
      }, 'Household created')
    }
    if (ok) {
      setMode('idle')
      setSearch('')
    }
  }

  async function remove(personId: string, personName: string) {
    const last = household?.members.length === 1
    const message = last
      ? `Remove ${personName}? They are the last person, so the household will be deleted.`
      : `Remove ${personName} from ${household?.name}?`
    if (!window.confirm(message)) return
    await run(() => removeFromHouseholdAction(personId), `${personName} removed`)
  }

  const memberIds = new Set(household?.members.map((m) => m.id) ?? [])

  return (
    <section className="dashboard-panel p-4 sm:p-5" data-tour="member-household">
      <div className="flex items-center justify-between gap-3">
        <h2 className="app-section-title flex items-center gap-2">
          <Home className="h-4 w-4 text-neutral-400 dark:text-neutral-500" aria-hidden />
          Household
        </h2>
        {household ? <Badge variant="secondary">{household.members.length}</Badge> : null}
      </div>

      {householdQuery.isLoading ? (
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>
      ) : householdQuery.error ? (
        <p className="mt-3 text-sm text-red-700 dark:text-red-300">Could not load the household.</p>
      ) : household ? (
        <>
          <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-white">{household.name}</p>
          <ul className="mt-3 space-y-1">
            {household.members.map((person) => {
              const isPrimary = person.id === household.primary_user_id
              return (
                <li key={person.id} className="flex items-center gap-2">
                  <PersonAvatar name={person.full_name} seed={person.id} size="sm" />
                  <Link
                    href={`/members/${person.id}`}
                    className="min-h-9 min-w-0 flex-1 truncate py-2 text-sm text-neutral-800 hover:text-brand-600 dark:text-neutral-200 dark:hover:text-brand-300"
                  >
                    {person.full_name}
                    {person.id === userId ? (
                      <span className="text-neutral-500 dark:text-neutral-400"> (this profile)</span>
                    ) : null}
                  </Link>
                  {isPrimary ? (
                    <Badge variant="brand" title="Gets the text when sending one per household">
                      Main contact
                    </Badge>
                  ) : canManage ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      disabled={busy}
                      aria-label={`Make ${person.full_name} the main contact`}
                      title="Make main contact"
                      onClick={() =>
                        void run(
                          () => setHouseholdPrimaryAction({ householdId: household.id, userId: person.id }),
                          `${person.full_name} is now the main contact`
                        )
                      }
                    >
                      <Star className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : null}
                  {canManage ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-neutral-500 hover:text-red-700 dark:text-neutral-400 dark:hover:text-red-300"
                      disabled={busy}
                      aria-label={`Remove ${person.full_name} from the household`}
                      onClick={() => void remove(person.id, person.full_name)}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Not linked to a household.{canManage ? ' Start one, or add them to a family member’s.' : ''}
        </p>
      )}

      {canManage && !householdQuery.isLoading && mode === 'idle' ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-11 sm:h-9" onClick={() => setMode('add')}>
            <Search className="mr-2 h-4 w-4" aria-hidden />
            {household ? 'Add a person' : 'Link to family'}
          </Button>
          {!household ? (
            <Button
              variant="outline"
              size="sm"
              className="h-11 sm:h-9"
              onClick={() => {
                const surname = fullName.trim().split(/\s+/).pop() || fullName
                setName(`${surname} household`)
                setMode('create')
              }}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              New household
            </Button>
          ) : null}
        </div>
      ) : null}

      {canManage && mode === 'create' ? (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            void create()
          }}
        >
          <Label htmlFor="household-name">Household name</Label>
          <Input
            id="household-name"
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            className="h-11 sm:h-10"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" className="h-11 sm:h-9" onClick={() => setMode('idle')}>
              Cancel
            </Button>
            <Button type="submit" className="h-11 sm:h-9" disabled={busy || !name.trim()}>
              Create
            </Button>
          </div>
        </form>
      ) : null}

      {canManage && mode === 'add' ? (
        <div className="mt-4 space-y-2">
          <Label htmlFor="household-search">
            {household ? `Add someone to ${household.name}` : `Find a family member of ${fullName}`}
          </Label>
          <Input
            id="household-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, membership ID or phone"
            className="h-11 sm:h-10"
            autoFocus
          />
          {searching ? <p className="text-xs text-neutral-500 dark:text-neutral-400">Searching…</p> : null}
          {results.length > 0 ? (
            <ul className="max-h-64 divide-y divide-neutral-200/80 overflow-y-auto rounded-lg border border-neutral-200/80 dark:divide-white/[0.06] dark:border-white/[0.06]">
              {results
                .filter((person) => person.id !== userId && !memberIds.has(person.id))
                .map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void addPerson(person)}
                      className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-60 dark:hover:bg-white/[0.04]"
                    >
                      <span className="min-w-0 flex-1 truncate text-neutral-800 dark:text-neutral-200">{person.full_name}</span>
                      <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{person.membership_id}</span>
                      {person.household_id ? <Badge variant="outline">Has household</Badge> : null}
                    </button>
                  </li>
                ))}
            </ul>
          ) : search.trim().length >= 2 && !searching ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Nobody found.</p>
          ) : null}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              className="h-11 sm:h-9"
              onClick={() => {
                setMode('idle')
                setSearch('')
              }}
            >
              Done
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
