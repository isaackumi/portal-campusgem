'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { GROUP_MEMBERSHIP_ROLES } from '@/lib/constants/groups'
import {
  PERMISSION_LABELS,
  ROLE_LABELS,
  STAFF_ROLES,
  permissionsForRole,
} from '@/lib/auth/roles'
import type { CampContactPromotionInput } from '@/lib/actions/camp-contact-promotion'
import {
  promoteCampContactToCorporateGem,
  promoteCampContactWithRole,
} from '@/lib/actions/camp-contact-promotion'
import type { GroupMembership, UserRole } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

const CORPORATE_GEM_ROLE_HINTS: Partial<Record<GroupMembership['role'], string>> = {
  executive: 'Executive council — oversees Corporate Gem programs and leaders.',
  leader: 'Leads activities and member engagement within Corporate Gem.',
  co_leader: 'Assists the leader with coordination and follow-up.',
  member: 'Standard member access within the Corporate Gem group.',
  volunteer: 'Helps run events without executive responsibilities.',
}

type BaseProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactName: string
  input: CampContactPromotionInput | null
  currentUserRole?: string
  onSuccess?: () => void
}

export function PromoteCorporateGemDialog({
  open,
  onOpenChange,
  contactName,
  input,
  onSuccess,
}: BaseProps) {
  const { toast } = useToast()
  const [groupRole, setGroupRole] = useState<GroupMembership['role']>('member')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) setGroupRole('member')
  }, [open])

  const roleHint = CORPORATE_GEM_ROLE_HINTS[groupRole]

  async function handleSubmit() {
    if (!input) return
    setSubmitting(true)
    const { data, group, profileCreated, error } = await promoteCampContactToCorporateGem(input, { groupRole })
    setSubmitting(false)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Promotion failed', description: error ?? 'Could not add to Corporate Gem' })
      return
    }
    const profileNote = profileCreated ? ' Directory profile created.' : ''
    toast({
      title: 'Added to Corporate Gem',
      description: `${contactName} joined as ${data.role} in ${group?.name ?? 'Corporate Gem'}.${profileNote}`,
    })
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Promote to Corporate Gem</DialogTitle>
          <DialogDescription>
            Add {contactName} to the Corporate Gem group with a leadership or membership role.
            {!input?.userId ? ' A directory profile will be created if needed.' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cg-role">Group role</Label>
            <Select value={groupRole} onValueChange={(v) => setGroupRole(v as GroupMembership['role'])}>
              <SelectTrigger id="cg-role">
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
            {roleHint ? <p className="text-sm text-muted-foreground">{roleHint}</p> : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting || !input}>
            {submitting ? 'Adding…' : 'Add to Corporate Gem'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PromoteStaffRoleDialog({
  open,
  onOpenChange,
  contactName,
  input,
  currentUserRole,
  onSuccess,
}: BaseProps) {
  const { toast } = useToast()
  const [staffRole, setStaffRole] = useState<UserRole>('elder')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      const existing = currentUserRole && STAFF_ROLES.includes(currentUserRole as UserRole)
        ? (currentUserRole as UserRole)
        : 'elder'
      setStaffRole(existing)
    }
  }, [open, currentUserRole])

  const grantedPermissions = useMemo(() => permissionsForRole(staffRole), [staffRole])

  async function handleSubmit() {
    if (!input) return
    setSubmitting(true)
    const { data, profileCreated, error } = await promoteCampContactWithRole(input, staffRole)
    setSubmitting(false)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Could not update access', description: error ?? 'Try again' })
      return
    }
    const profileNote = profileCreated ? ' Directory profile created.' : ''
    toast({
      title: 'Access updated',
      description: `${contactName} is now ${ROLE_LABELS[data.role]} with ${grantedPermissions.length} permissions.${profileNote}`,
    })
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grant staff role & permissions</DialogTitle>
          <DialogDescription>
            Choose a system role for {contactName}. Permissions are applied automatically from that role.
            {!input?.userId ? ' A directory profile will be created if needed.' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-role">System role</Label>
            <Select value={staffRole} onValueChange={(v) => setStaffRole(v as UserRole)}>
              <SelectTrigger id="staff-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 rounded-lg border bg-slate-50/80 p-3">
            <p className="text-sm font-medium text-slate-900">
              Permissions included ({grantedPermissions.length})
            </p>
            <ul className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
              {grantedPermissions.map((permission) => (
                <li key={permission}>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {PERMISSION_LABELS[permission]}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting || !input}>
            {submitting ? 'Saving…' : 'Grant access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
