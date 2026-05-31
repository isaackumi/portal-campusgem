'use client'

import { useEffect, useState } from 'react'
import { addPersonToRlcAction } from '@/lib/actions/rlc'
import { RLC_ROLE_LABELS, RLC_ROLES } from '@/lib/constants/rlc'
import type { RlcRole } from '@/lib/types'
import { ensureDirectoryUserFromCampContact } from '@/lib/actions/ensure-camp-directory-user'
import { dataService } from '@/lib/services/data-service'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/providers'
import { Church } from 'lucide-react'

export type CampContactForRlc = {
  full_name: string
  phone: string
  email?: string
  registrationId?: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactName: string
  userId?: string
  memberId?: string
  campContact?: CampContactForRlc
  existingRoles?: string[]
  onSuccess?: () => void
}

export function AddToRlcDialog({
  open,
  onOpenChange,
  contactName,
  userId: initialUserId,
  memberId: initialMemberId,
  campContact,
  existingRoles = [],
  onSuccess,
}: Props) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedRoles, setSelectedRoles] = useState<RlcRole[]>(['member'])
  const [submitting, setSubmitting] = useState(false)
  const [ensuringProfile, setEnsuringProfile] = useState(false)

  useEffect(() => {
    if (open) {
      setSelectedRoles(existingRoles.length ? (existingRoles as RlcRole[]) : ['member'])
    }
  }, [open, existingRoles])

  function toggleRole(role: RlcRole, checked: boolean) {
    setSelectedRoles((prev) => {
      if (checked) return prev.includes(role) ? prev : [...prev, role]
      return prev.filter((r) => r !== role)
    })
  }

  async function handleSubmit() {
    if (!user?.id) return
    if (selectedRoles.length === 0) {
      toast({ variant: 'destructive', title: 'Select at least one role' })
      return
    }

    setSubmitting(true)
    let userId = initialUserId
    let memberId = initialMemberId

    if (!userId && !memberId && campContact?.phone) {
      setEnsuringProfile(true)
      const ensured = await ensureDirectoryUserFromCampContact({
        full_name: campContact.full_name || contactName,
        phone: campContact.phone,
        email: campContact.email,
        registrationId: campContact.registrationId,
      })
      setEnsuringProfile(false)
      if (ensured.error || !ensured.data) {
        setSubmitting(false)
        toast({
          variant: 'destructive',
          title: 'Profile required',
          description: ensured.error ?? 'Could not create directory profile.',
        })
        return
      }
      userId = ensured.data.userId
    }

    if (!memberId && userId) {
      const memberRes = await dataService.getMemberByUserId(userId)
      memberId = memberRes.data?.id
    }

    const { data, error } = await addPersonToRlcAction({
      performedBy: user.id,
      userId,
      memberId,
      campRegistrationId: campContact?.registrationId,
      rlcRoles: selectedRoles,
    })
    setSubmitting(false)

    if (error || !data) {
      toast({ variant: 'destructive', title: 'Failed to add to RLC', description: error })
      return
    }

    toast({
      title: 'Added to Redemption Light Chapel',
      description: `${contactName} — ${selectedRoles.map((r) => RLC_ROLE_LABELS[r]).join(', ')}`,
    })
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Church className="h-5 w-5 text-rose-700" />
            Add to RLC
          </DialogTitle>
          <DialogDescription>
            Assign one or more roles for <strong>{contactName}</strong> at Redemption Light Chapel.
            Existing roles are merged — people can hold multiple ministry roles.
          </DialogDescription>
        </DialogHeader>

        {existingRoles.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {existingRoles.map((role) => (
              <Badge key={role} variant="secondary">
                {RLC_ROLE_LABELS[role as RlcRole] ?? role}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {RLC_ROLES.map((role) => (
            <label
              key={role}
              className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 hover:bg-rose-50/50"
            >
              <Checkbox
                checked={selectedRoles.includes(role)}
                onCheckedChange={(v) => toggleRole(role, v === true)}
              />
              <div>
                <p className="text-sm font-medium">{RLC_ROLE_LABELS[role]}</p>
              </div>
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-rose-700 hover:bg-rose-800"
            disabled={submitting || ensuringProfile}
            onClick={() => void handleSubmit()}
          >
            {submitting || ensuringProfile ? 'Saving…' : 'Add to RLC'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
