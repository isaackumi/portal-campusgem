'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Group } from '@/lib/types'

export type CampusIdentityValue = { short_code: string; slug: string; aliases: string }

export const EMPTY_CAMPUS_IDENTITY: CampusIdentityValue = { short_code: '', slug: '', aliases: '' }

export function campusIdentityFromGroup(group: Group | null | undefined): CampusIdentityValue {
  return {
    short_code: group?.short_code ?? '',
    slug: group?.slug ?? '',
    aliases: (group?.aliases ?? []).join(', '),
  }
}

/** Short code, link name and match aliases for a campus group (admin create / edit dialogs). */
export function CampusIdentityFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string
  value: CampusIdentityValue
  onChange: (next: CampusIdentityValue) => void
}) {
  const set = (key: keyof CampusIdentityValue) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: key === 'short_code' ? e.target.value.toUpperCase() : e.target.value })
  return (
    <fieldset className="space-y-3 rounded-xl border border-neutral-200/80 p-4 dark:border-white/10">
      <legend className="app-overline px-1">Campus tag</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-short-code`}>Short code</Label>
          <Input
            id={`${idPrefix}-short-code`}
            value={value.short_code}
            onChange={set('short_code')}
            placeholder="e.g. UEW"
            maxLength={10}
            className="h-11 font-mono sm:h-10"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">The badge shown on members. Unique.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-slug`}>Link name</Label>
          <Input
            id={`${idPrefix}-slug`}
            value={value.slug}
            onChange={set('slug')}
            placeholder="defaults to the short code"
            maxLength={48}
            className="h-11 font-mono sm:h-10"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">/campuses/… and /join/…</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-aliases`}>Other names</Label>
        <Input
          id={`${idPrefix}-aliases`}
          value={value.aliases}
          onChange={set('aliases')}
          placeholder="e.g. Winneba, University of Education"
          className="h-11 sm:h-10"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Comma separated. Used to find students whose school or residence mentions this campus.
        </p>
      </div>
    </fieldset>
  )
}
