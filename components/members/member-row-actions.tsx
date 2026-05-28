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
import { Copy, Edit, Eye, MoreHorizontal, UserPlus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type Props = {
  memberId: string
  userId?: string
  displayName: string
  membershipId?: string
}

export function MemberRowActions({ memberId, userId, displayName, membershipId }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [addToGroupOpen, setAddToGroupOpen] = useState(false)

  function copyMembershipId() {
    if (!membershipId) return
    void navigator.clipboard.writeText(membershipId)
    toast({ title: 'Copied', description: 'Membership ID copied.' })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Member actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => router.push(`/members/${memberId}`)}>
            <Eye className="mr-2 h-4 w-4" />
            View profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/members/${memberId}?edit=true`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit profile
          </DropdownMenuItem>
          {userId ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAddToGroupOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add to group
              </DropdownMenuItem>
            </>
          ) : null}
          {membershipId ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={copyMembershipId}>
                <Copy className="mr-2 h-4 w-4" />
                Copy membership ID
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {userId ? (
        <AddToGroupDialog
          open={addToGroupOpen}
          onOpenChange={setAddToGroupOpen}
          userId={userId}
          contactName={displayName}
        />
      ) : null}
    </>
  )
}
