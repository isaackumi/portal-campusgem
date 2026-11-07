'use client'

import { useEffect, useState } from 'react'
import type { Group } from '@/lib/types'
import { GROUP_TYPES } from '@/lib/constants/groups'
import {
  CampusIdentityFields,
  EMPTY_CAMPUS_IDENTITY,
  campusIdentityFromGroup,
  type CampusIdentityValue,
} from '@/components/campus/campus-identity-fields'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export type GroupFormValues = {
  name: string
  description: string
  group_type: Group['group_type']
  meeting_location: string
  meeting_schedule: string
  is_active: boolean
  max_members: number | undefined
}

const EMPTY: GroupFormValues = {
  name: '',
  description: '',
  group_type: 'fellowship',
  meeting_location: '',
  meeting_schedule: '',
  is_active: true,
  max_members: undefined,
}

/** Create or edit a group. The same fields both ways, so editing never drops anything. */
export function GroupFormDialog({
  open,
  onOpenChange,
  editing,
  defaultType,
  saving,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: Group | null
  defaultType?: Group['group_type']
  saving: boolean
  onSave: (values: GroupFormValues, campus: CampusIdentityValue) => void
}) {
  const [values, setValues] = useState<GroupFormValues>(EMPTY)
  const [campus, setCampus] = useState<CampusIdentityValue>(EMPTY_CAMPUS_IDENTITY)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setValues({
        name: editing.name ?? '',
        description: editing.description ?? '',
        group_type: editing.group_type ?? 'fellowship',
        meeting_location: editing.meeting_location ?? '',
        meeting_schedule: editing.meeting_schedule ?? '',
        is_active: editing.is_active,
        max_members: editing.max_members,
      })
      setCampus(campusIdentityFromGroup(editing))
    } else {
      setValues({ ...EMPTY, group_type: defaultType ?? EMPTY.group_type })
      setCampus(EMPTY_CAMPUS_IDENTITY)
    }
  }, [open, editing, defaultType])

  const set = <K extends keyof GroupFormValues>(key: K, value: GroupFormValues[K]) => setValues((v) => ({ ...v, [key]: value }))
  const typeInfo = GROUP_TYPES.find((t) => t.value === values.group_type)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : 'New group'}</DialogTitle>
          {!editing ? <DialogDescription>You can add members and leaders after creating it.</DialogDescription> : null}
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (values.name.trim()) onSave({ ...values, name: values.name.trim() }, campus)
          }}
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_13rem]">
            <div className="space-y-1.5">
              <Label htmlFor="group-name">Name</Label>
              <Input id="group-name" className="h-11" value={values.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. UEW fellowship, Choir" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-type">Kind of group</Label>
              <Select value={values.group_type} onValueChange={(v) => set('group_type', v as Group['group_type'])}>
                <SelectTrigger id="group-type" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {typeInfo?.description ? (
              <p className="-mt-2 text-xs text-neutral-500 dark:text-neutral-400 sm:col-span-2">{typeInfo.description}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-description">What the group is for</Label>
            <Textarea id="group-description" rows={2} value={values.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="group-schedule">When it meets</Label>
              <Input id="group-schedule" className="h-11" value={values.meeting_schedule} onChange={(e) => set('meeting_schedule', e.target.value)} placeholder="e.g. Wednesdays, 6pm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-location">Where it meets</Label>
              <Input id="group-location" className="h-11" value={values.meeting_location} onChange={(e) => set('meeting_location', e.target.value)} placeholder="e.g. Chapel room 2" />
            </div>
          </div>

          <div className="grid items-end gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="group-max">Member limit</Label>
              <Input
                id="group-max"
                className="h-11"
                inputMode="numeric"
                value={values.max_members ?? ''}
                onChange={(e) => {
                  const n = e.target.value.replace(/\D/g, '')
                  set('max_members', n ? Number(n) : undefined)
                }}
                placeholder="No limit"
              />
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 px-3 dark:border-white/10">
              <Checkbox checked={values.is_active} onCheckedChange={(v) => set('is_active', v === true)} />
              <span className="text-sm">
                <span className="font-medium text-neutral-900 dark:text-neutral-100">Active</span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">Inactive groups are hidden from members</span>
              </span>
            </label>
          </div>

          {values.group_type === 'campus' ? (
            <div className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
              <p className="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">Campus tag and join link</p>
              <CampusIdentityFields idPrefix={editing ? 'edit' : 'create'} value={campus} onChange={setCampus} />
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="h-11" disabled={saving || !values.name.trim()}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
