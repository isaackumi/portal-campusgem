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
import { Copy, ExternalLink, MoreHorizontal, UserPlus, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type Props = {
  contactName: string
  phone?: string
  email?: string
  userId?: string
  latestRegistrationId?: string
  showFollowUp?: boolean
}

export function ContactRowActions({
  contactName,
  phone,
  email,
  userId,
  latestRegistrationId,
  showFollowUp = true,
}: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [addToGroupOpen, setAddToGroupOpen] = useState(false)

  function copyPhone() {
    if (!phone) return
    void navigator.clipboard.writeText(phone)
    toast({ title: 'Copied', description: 'Phone number copied to clipboard.' })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Contact actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
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
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
