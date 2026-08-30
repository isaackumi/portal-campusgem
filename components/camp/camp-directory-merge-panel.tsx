'use client'

import { useMemo, useState } from 'react'
import {
  findDirectoryDuplicateGroups,
  primaryRowForGroup,
  registrationIdsToMerge,
  type DirectoryDuplicateGroup,
} from '@/lib/camp/directory-duplicates'
import { mergeCampDirectoryContacts } from '@/lib/actions/camp'
import type { CampCamperDirectoryRow } from '@/lib/types'
import { FoldableCard } from '@/components/foldable-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { GitMerge, AlertTriangle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type CampDirectoryMergePanelProps = {
  rows: CampCamperDirectoryRow[]
  onMerged: () => void
}

export function CampDirectoryMergePanel({ rows, onMerged }: CampDirectoryMergePanelProps) {
  const { toast } = useToast()
  const groups = useMemo(() => findDirectoryDuplicateGroups(rows), [rows])
  const [primaryByGroup, setPrimaryByGroup] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const group of findDirectoryDuplicateGroups(rows)) {
      initial[group.nameKey] = group.suggestedPrimaryPhoneKey
    }
    return initial
  })
  const [mergingKey, setMergingKey] = useState<string | null>(null)

  if (groups.length === 0) return null

  async function handleMerge(group: DirectoryDuplicateGroup) {
    const primaryPhoneKey = primaryByGroup[group.nameKey] ?? group.suggestedPrimaryPhoneKey
    const primary = primaryRowForGroup(group, primaryPhoneKey)
    if (!primary?.phone?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Pick a phone number',
        description: 'The canonical row needs a valid phone to merge into.',
      })
      return
    }

    const registrationIds = registrationIdsToMerge(group, primaryPhoneKey)
    if (registrationIds.length === 0) {
      toast({ variant: 'destructive', title: 'Nothing to merge' })
      return
    }

    setMergingKey(group.nameKey)
    const { data, error } = await mergeCampDirectoryContacts({
      canonicalPhone: primary.phone,
      registrationIds,
    })
    setMergingKey(null)

    if (error || !data) {
      toast({ variant: 'destructive', title: 'Merge failed', description: error ?? 'Try again' })
      return
    }

    if (data.conflicts.length > 0) {
      toast({
        variant: 'destructive',
        title: `Merged ${data.merged}, ${data.conflicts.length} conflict(s)`,
        description: data.conflicts[0]?.reason ?? 'Same camp year exists on both phones — resolve manually.',
      })
    } else {
      toast({
        title: 'Contacts merged',
        description: `Updated ${data.merged} registration(s) to use ${primary.phone}.`,
      })
    }

    onMerged()
  }

  return (
    <FoldableCard
      className="border-amber-200/80 bg-amber-50/30"
      title="Possible duplicate contacts"
      description="Same name with different phone numbers — pick the correct phone and merge"
      icon={<GitMerge className="h-5 w-5 text-amber-800" />}
      badge={
        <Badge variant="secondary" className="bg-amber-100 text-amber-900">
          {groups.length} group{groups.length === 1 ? '' : 's'}
        </Badge>
      }
      defaultExpanded
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Merging reassigns camp registrations from duplicate phone entries onto the canonical number
          you choose. Everyone not checked in for RLC is still implicitly absent; this only fixes camp
          directory duplicates from imports or typos.
        </p>

        {groups.map((group) => {
          const primaryPhoneKey = primaryByGroup[group.nameKey] ?? group.suggestedPrimaryPhoneKey
          const mergeCount = registrationIdsToMerge(group, primaryPhoneKey).length

          return (
            <div key={group.nameKey} className="rounded-lg border border-amber-200/80 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{group.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.rows.length} directory rows · {mergeCount} registration
                    {mergeCount === 1 ? '' : 's'} to reassign
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-amber-800 hover:bg-amber-900"
                  disabled={mergingKey === group.nameKey || mergeCount === 0}
                  onClick={() => void handleMerge(group)}
                >
                  {mergingKey === group.nameKey ? 'Merging…' : 'Merge into selected phone'}
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Canonical phone (keep this one)
                </p>
                {group.rows.map((row) => {
                  const selected = row.phone_key === primaryPhoneKey
                  return (
                    <button
                      key={row.phone_key}
                      type="button"
                      className={cn(
                        'flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                        selected
                          ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500/30'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      )}
                      onClick={() =>
                        setPrimaryByGroup((current) => ({
                          ...current,
                          [group.nameKey]: row.phone_key,
                        }))
                      }
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                          selected ? 'border-amber-700 bg-amber-700 text-white' : 'border-slate-300'
                        )}
                      >
                        {selected ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="flex-1 space-y-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{row.phone || 'No phone'}</span>
                          {row.phone_key === group.suggestedPrimaryPhoneKey ? (
                            <Badge variant="outline" className="text-xs">
                              Suggested
                            </Badge>
                          ) : null}
                          {row.user_id ? (
                            <Badge variant="secondary" className="text-xs">
                              Has account
                            </Badge>
                          ) : null}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {row.registration_count} registration{row.registration_count === 1 ? '' : 's'} ·{' '}
                          {row.years.map((y) => y.year).join(', ') || '—'}
                          {row.email?.trim() && row.email.trim() !== ' ' ? ` · ${row.email}` : ''}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>

              {mergeCount === 0 ? (
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Select a different canonical phone to reassign registrations.
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </FoldableCard>
  )
}
