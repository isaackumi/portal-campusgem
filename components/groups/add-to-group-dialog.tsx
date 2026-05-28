'use client'

import { useState } from 'react'
import { useGroups, useAddUserToGroup } from '@/lib/hooks/use-data'
import { FormGroupSelect } from '@/components/forms/group-select'
import { GROUP_MEMBERSHIP_ROLES } from '@/lib/constants/groups'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ensureDirectoryUserFromCampContact } from '@/lib/actions/ensure-camp-directory-user'
import type { GroupMembership } from '@/lib/types'

export type CampContactForGroup = {
  full_name: string
  phone: string
  email?: string
  registrationId?: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string
  campContact?: CampContactForGroup
  contactName: string
  defaultGroupId?: string
  onSuccess?: () => void
}

export function AddToGroupDialog({
  open,
  onOpenChange,
  userId: initialUserId,
  campContact,
  contactName,
  defaultGroupId = '',
  onSuccess,
}: Props) {
  const { toast } = useToast()
  const { data: groups } = useGroups(1, 300)
  const { addUserToGroup, loading } = useAddUserToGroup()
  const [groupId, setGroupId] = useState(defaultGroupId)
  const [role, setRole] = useState<GroupMembership['role']>('member')
  const [ensuringProfile, setEnsuringProfile] = useState(false)

  async function handleSubmit() {
    if (!groupId) {
      toast({ variant: 'destructive', title: 'Select a group', description: 'Choose a campus or activity group.' })
      return
    }

    let userId = initialUserId
    if (!userId) {
      if (!campContact?.phone) {
        toast({
          variant: 'destructive',
          title: 'Cannot add to group',
          description: 'A phone number is required to create a directory profile.',
        })
        return
      }
      setEnsuringProfile(true)
      const ensured = await ensureDirectoryUserFromCampContact({
        full_name: campContact.full_name || contactName,
        phone: campContact.phone,
        email: campContact.email,
        registrationId: campContact.registrationId,
      })
      setEnsuringProfile(false)
      if (ensured.error || !ensured.data) {
        toast({
          variant: 'destructive',
          title: 'Could not create profile',
          description: ensured.error ?? 'Try again or link the registration from camp admin.',
        })
        return
      }
      userId = ensured.data.userId
      if (ensured.data.created) {
        toast({
          title: 'Directory profile created',
          description: `${contactName} can now be assigned to groups and sign in by phone when ready.`,
        })
      }
    }

    const result = await addUserToGroup(groupId, userId, role)
    if (!result) {
      toast({
        variant: 'destructive',
        title: 'Could not add to group',
        description: 'Ensure this person has a member profile linked to their account.',
      })
      return
    }
    toast({ title: 'Added to group', description: `${contactName} was added successfully.` })
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (next) {
          setGroupId(defaultGroupId)
          setRole('member')
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to group</DialogTitle>
          <DialogDescription>
            Assign <span className="font-medium text-foreground">{contactName}</span> to a campus fellowship or
            activity with a role.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Group</Label>
            <FormGroupSelect
              groups={groups ?? []}
              value={groupId}
              onValueChange={(value) => setGroupId(value === '__none__' ? '' : value)}
              placeholder="Select campus or activity"
            />
          </div>
          <div className="space-y-2">
            <Label>Role in group</Label>
            <Select value={role} onValueChange={(value) => setRole(value as GroupMembership['role'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUP_MEMBERSHIP_ROLES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={loading || ensuringProfile}>
            {ensuringProfile ? 'Preparing profile...' : loading ? 'Adding...' : 'Add to group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
