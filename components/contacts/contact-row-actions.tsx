'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { AddToGroupDialog, type CampContactForGroup } from '@/components/groups/add-to-group-dialog'
import { AddToRlcDialog, type CampContactForRlc } from '@/components/rlc/add-to-rlc-dialog'
import { PromoteCorporateGemDialog, PromoteStaffRoleDialog } from '@/components/contacts/promote-contact-dialogs'
import { useAuth } from '@/components/providers'
import { hasPermission, isStaffRole } from '@/lib/auth/roles'
import { Copy, ExternalLink, Gem, Church, MoreHorizontal, Shield, UserPlus, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { UserRole } from '@/lib/types'

type Props = {
  contactName: string
  phone?: string
  email?: string
  userId?: string
  userRole?: string
  latestRegistrationId?: string
  showFollowUp?: boolean
  showPromotions?: boolean
  memberId?: string
  rlcRoles?: string[]
  showRlc?: boolean
  onPromoted?: () => void
}

export function ContactRowActions({
  contactName,
  phone,
  email,
  userId,
  userRole,
  latestRegistrationId,
  memberId,
  rlcRoles,
  showFollowUp = true,
  showPromotions = false,
  showRlc = true,
  onPromoted,
}: Props) {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [addToGroupOpen, setAddToGroupOpen] = useState(false)
  const [addToRlcOpen, setAddToRlcOpen] = useState(false)
  const [corporateGemOpen, setCorporateGemOpen] = useState(false)
  const [staffRoleOpen, setStaffRoleOpen] = useState(false)

  const actorRole = currentUser?.role as UserRole | undefined
  const canManageGroups = Boolean(actorRole && hasPermission(actorRole, 'groups.manage'))
  const canManageUsers = Boolean(actorRole && hasPermission(actorRole, 'users.manage'))
  const canManageRlc = Boolean(actorRole && hasPermission(actorRole, 'rlc.manage'))
  const canPromoteCorporateGem = showPromotions && canManageGroups && Boolean(phone?.trim())
  const canPromoteStaff = showPromotions && canManageUsers && Boolean(phone?.trim())
  const canAddToRlc = showRlc && canManageRlc && Boolean(phone?.trim() || userId)
  const hasStaffAccess = isStaffRole(userRole)

  function campContactInput() {
    if (!phone?.trim()) return null
    return {
      full_name: contactName,
      phone: phone.trim(),
      email,
      userId,
      registrationId: latestRegistrationId,
    }
  }

  function afterPromote() {
    onPromoted?.()
    router.refresh()
  }

  function copyPhone() {
    if (!phone) return
    void navigator.clipboard.writeText(phone)
    toast({ title: 'Copied', description: 'Phone number copied to clipboard.' })
  }

  const promotionInput = campContactInput()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Contact actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {latestRegistrationId ? (
            <DropdownMenuItem
              onClick={() => router.push(`/admin/camp-meeting/registrations/${latestRegistrationId}`)}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open registration
            </DropdownMenuItem>
          ) : null}
          {showFollowUp ? (
            <DropdownMenuItem onClick={() => router.push('/admin/camp-meeting/follow-up')}>
              <Users className="mr-2 h-4 w-4" />
              Follow-up board
            </DropdownMenuItem>
          ) : null}
          {(latestRegistrationId || showFollowUp) && phone ? <DropdownMenuSeparator /> : null}
          {phone ? (
            <DropdownMenuItem onClick={() => setAddToGroupOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add to group
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled className="text-muted-foreground">
              Add to group (needs phone)
            </DropdownMenuItem>
          )}
          {canAddToRlc ? (
            <DropdownMenuItem onClick={() => setAddToRlcOpen(true)}>
              <Church className="mr-2 h-4 w-4 text-rose-700" />
              Add to RLC…
            </DropdownMenuItem>
          ) : null}
          {canPromoteCorporateGem ? (
            <DropdownMenuItem onClick={() => setCorporateGemOpen(true)}>
              <Gem className="mr-2 h-4 w-4 text-violet-600" />
              Promote to Corporate Gem…
            </DropdownMenuItem>
          ) : null}
          {canPromoteStaff ? (
            <DropdownMenuItem onClick={() => setStaffRoleOpen(true)}>
              <Shield className="mr-2 h-4 w-4 text-amber-600" />
              {hasStaffAccess ? 'Change staff role…' : 'Grant staff role…'}
            </DropdownMenuItem>
          ) : null}
          {phone ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={copyPhone}>
                <Copy className="mr-2 h-4 w-4" />
                Copy phone
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AddToGroupDialog
        open={addToGroupOpen}
        onOpenChange={setAddToGroupOpen}
        userId={userId}
        campContact={
          phone
            ? ({
                full_name: contactName,
                phone,
                email,
                registrationId: latestRegistrationId,
              } satisfies CampContactForGroup)
            : undefined
        }
        contactName={contactName}
        onSuccess={afterPromote}
      />

      <AddToRlcDialog
        open={addToRlcOpen}
        onOpenChange={setAddToRlcOpen}
        contactName={contactName}
        userId={userId}
        memberId={memberId}
        existingRoles={rlcRoles}
        campContact={
          phone
            ? ({
                full_name: contactName,
                phone,
                email,
                registrationId: latestRegistrationId,
              } satisfies CampContactForRlc)
            : undefined
        }
        onSuccess={afterPromote}
      />

      <PromoteCorporateGemDialog
        open={corporateGemOpen}
        onOpenChange={setCorporateGemOpen}
        contactName={contactName}
        input={promotionInput}
        onSuccess={afterPromote}
      />

      <PromoteStaffRoleDialog
        open={staffRoleOpen}
        onOpenChange={setStaffRoleOpen}
        contactName={contactName}
        input={promotionInput}
        currentUserRole={userRole}
        onSuccess={afterPromote}
      />
    </>
  )
}
