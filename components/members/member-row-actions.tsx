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
import { AddToGroupDialog } from '@/components/groups/add-to-group-dialog'
import { AddToRlcDialog } from '@/components/rlc/add-to-rlc-dialog'
import { Copy, Edit, Eye, MoreHorizontal, UserPlus, Church, Phone, Mail } from 'lucide-react'
import { WhatsappLogo } from '@/components/icons/whatsapp-logo'
import { mailtoHref, telHref, whatsAppChatHref } from '@/lib/contact-links'
import { useToast } from '@/hooks/use-toast'

type Props = {
  memberId: string
  userId?: string
  displayName: string
  membershipId?: string
  rlcRoles?: string[]
  /** Shown as Call / WhatsApp / Email items so the menu works as a contact sheet on phones. */
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
}

export function MemberRowActions({
  memberId,
  userId,
  displayName,
  membershipId,
  rlcRoles,
  phone,
  whatsapp,
  email,
}: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [addToGroupOpen, setAddToGroupOpen] = useState(false)
  const [addToRlcOpen, setAddToRlcOpen] = useState(false)
  const tel = telHref(phone)
  const wa = whatsAppChatHref(whatsapp?.trim() || phone)
  const mail = mailtoHref(email)
  const item = 'min-h-11 cursor-pointer sm:min-h-9'

  function copyMembershipId() {
    if (!membershipId) return
    void navigator.clipboard.writeText(membershipId)
    toast({ title: 'Copied', description: 'Membership ID copied.' })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 sm:h-9 sm:w-9"
            aria-label={`Actions for ${displayName}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {tel || wa || mail ? (
            <>
              {tel ? (
                <DropdownMenuItem asChild className={item}>
                  <a href={tel}>
                    <Phone className="mr-2 h-4 w-4 text-brand-600 dark:text-brand-300" />
                    Call
                  </a>
                </DropdownMenuItem>
              ) : null}
              {wa ? (
                <DropdownMenuItem asChild className={item}>
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    <WhatsappLogo className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    WhatsApp
                  </a>
                </DropdownMenuItem>
              ) : null}
              {mail ? (
                <DropdownMenuItem asChild className={item}>
                  <a href={mail}>
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </a>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem className={item} onClick={() => router.push(`/members/${memberId}`)}>
            <Eye className="mr-2 h-4 w-4" />
            View profile
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onClick={() => router.push(`/members/${memberId}?edit=true`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit profile
          </DropdownMenuItem>
          {userId || memberId ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className={item} onClick={() => setAddToRlcOpen(true)}>
                <Church className="mr-2 h-4 w-4 text-rose-700 dark:text-rose-300" />
                Add to RLC…
              </DropdownMenuItem>
            </>
          ) : null}
          {userId ? (
            <DropdownMenuItem className={item} onClick={() => setAddToGroupOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add to group
            </DropdownMenuItem>
          ) : null}
          {membershipId ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className={item} onClick={copyMembershipId}>
                <Copy className="mr-2 h-4 w-4" />
                Copy membership ID
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {userId && addToGroupOpen ? (
        <AddToGroupDialog
          open={addToGroupOpen}
          onOpenChange={setAddToGroupOpen}
          userId={userId}
          contactName={displayName}
        />
      ) : null}
      {(userId || memberId) && addToRlcOpen ? (
        <AddToRlcDialog
          open={addToRlcOpen}
          onOpenChange={setAddToRlcOpen}
          contactName={displayName}
          userId={userId}
          memberId={memberId}
          existingRoles={rlcRoles}
          onSuccess={() => router.refresh()}
        />
      ) : null}
    </>
  )
}
