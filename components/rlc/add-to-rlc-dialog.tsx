'use client'

import { useEffect, useState } from 'react'
import { addPersonToRlcAction, preparePersonForRlcAction } from '@/lib/actions/rlc'
import { RLC_ROLE_LABELS, RLC_ROLES } from '@/lib/constants/rlc'
import type { RlcRole } from '@/lib/types'
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
    if (!user?.id) {
      toast({ variant: 'destructive', title: 'Sign in required' })
      return
    }
    if (selectedRoles.length === 0) {
      toast({ variant: 'destructive', title: 'Select at least one role' })
      return
    }

    setSubmitting(true)

    const prepared = await preparePersonForRlcAction({
      userId: initialUserId,
      memberId: initialMemberId,
      fullName: campContact?.full_name || contactName,
      phone: campContact?.phone,
      email: campContact?.email,
      campRegistrationId: campContact?.registrationId,
    })

    if (prepared.error || !prepared.data) {
      setSubmitting(false)
      toast({
        variant: 'destructive',
        title: 'Profile required',
        description: prepared.error ?? 'Could not prepare member profile for RLC.',
      })
      return
    }

    const { data, error } = await addPersonToRlcAction({
      performedBy: user.id,
      userId: prepared.data.userId,
      memberId: prepared.data.memberId,
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
      <DialogContent className="max-h-[min(90vh,100dvh)] w-[calc(100vw-1.5rem)] max-w-lg gap-0 overflow-hidden p-0 sm:w-full">
        <div className="max-h-[min(90vh,100dvh)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8 text-left">
              <Church className="h-5 w-5 shrink-0 text-rose-700" />
              Add to RLC
            </DialogTitle>
            <DialogDescription className="text-left">
              Assign one or more roles for <strong>{contactName}</strong> at Redemption Light Chapel.
              Existing roles are merged — people can hold multiple ministry roles.
            </DialogDescription>
          </DialogHeader>

          {existingRoles.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {existingRoles.map((role) => (
                <Badge key={role} variant="secondary">
                  {RLC_ROLE_LABELS[role as RlcRole] ?? role}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {RLC_ROLES.map((role) => (
              <label
                key={role}
                className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 hover:bg-rose-50/50"
              >
                <Checkbox
                  checked={selectedRoles.includes(role)}
                  onCheckedChange={(v) => toggleRole(role, v === true)}
                />
                <p className="text-sm font-medium leading-snug">{RLC_ROLE_LABELS[role]}</p>
              </label>
            ))}
          </div>

          <DialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full bg-rose-700 hover:bg-rose-800 sm:w-auto"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? 'Saving…' : 'Add to RLC'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
