'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers'
import { convertRlcVisitorAction } from '@/lib/actions/rlc'
import { RLC_MEMBERSHIP_TYPE_LABELS } from '@/lib/constants/rlc'
import { visitorToConvertForm } from '@/lib/rlc/visitor-convert'
import type { RlcMembershipType, Visitor } from '@/lib/types'
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
import { useToast } from '@/hooks/use-toast'
import { UserCheck } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  visitor: Visitor | null
  onSuccess?: () => void
}

export function ConvertVisitorToMemberDialog({ open, onOpenChange, visitor, onSuccess }: Props) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [membershipType, setMembershipType] = useState<RlcMembershipType>('full_member')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) setMembershipType('full_member')
  }, [open, visitor?.id])

  const name = visitor
    ? [visitor.first_name, visitor.last_name].filter(Boolean).join(' ')
    : 'Visitor'

  async function handleConvert() {
    if (!visitor || !user?.id) {
      toast({ variant: 'destructive', title: 'Sign in required' })
      return
    }
    setSubmitting(true)
    const { error } = await convertRlcVisitorAction(
      visitor.id,
      visitorToConvertForm(visitor, membershipType),
      user.id
    )
    setSubmitting(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Could not add as member', description: error })
      return
    }
    toast({
      title: 'Imported as RLC member',
      description: `${name} is now on the members list.`,
    })
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-rose-700" />
            Import visitor as member
          </DialogTitle>
          <DialogDescription>
            {name}
            {visitor?.phone ? ` · ${visitor.phone}` : ''} will keep their visitor record and appear
            on the RLC members list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Membership type</Label>
          <Select
            value={membershipType}
            onValueChange={(v) => setMembershipType(v as RlcMembershipType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RLC_MEMBERSHIP_TYPE_LABELS) as RlcMembershipType[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {RLC_MEMBERSHIP_TYPE_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-rose-700 hover:bg-rose-800"
            disabled={submitting || !visitor}
            onClick={() => void handleConvert()}
          >
            {submitting ? 'Importing…' : 'Add as member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
