'use client'

import { useMemo } from 'react'
import type { Group } from '@/lib/types'
import { getGroupTypeLabel } from '@/lib/constants/groups'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'

type Props = {
  groups: Group[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  allowUnassigned?: boolean
  required?: boolean
  id?: string
}

export function FormGroupSelect({
  groups,
  value,
  onValueChange,
  placeholder = 'Select campus or activity',
  allowUnassigned = false,
  id,
}: Props) {
  const { campusGroups, activityGroups, otherGroups } = useMemo(() => {
    const campus: Group[] = []
    const activity: Group[] = []
    const other: Group[] = []
    for (const group of groups) {
      if (!group.is_active) continue
      if (group.group_type === 'campus') campus.push(group)
      else if (group.group_type === 'activity') activity.push(group)
      else other.push(group)
    }
    const byName = (a: Group, b: Group) => a.name.localeCompare(b.name)
    campus.sort(byName)
    activity.sort(byName)
    other.sort(byName)
    return { campusGroups: campus, activityGroups: activity, otherGroups: other }
  }, [groups])

  return (
    <Select value={value || (allowUnassigned ? '__none__' : undefined)} onValueChange={onValueChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {allowUnassigned ? (
          <SelectItem value="__none__">All groups / unassigned</SelectItem>
        ) : null}
        {campusGroups.length > 0 ? (
          <SelectGroup>
            <SelectLabel>Campus fellowships</SelectLabel>
            {campusGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ) : null}
        {activityGroups.length > 0 ? (
          <SelectGroup>
            <SelectLabel>General activities & events</SelectLabel>
            {activityGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ) : null}
        {otherGroups.length > 0 ? (
          <SelectGroup>
            <SelectLabel>Other groups</SelectLabel>
            {otherGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name} ({getGroupTypeLabel(group.group_type)})
              </SelectItem>
            ))}
          </SelectGroup>
        ) : null}
      </SelectContent>
    </Select>
  )
}
