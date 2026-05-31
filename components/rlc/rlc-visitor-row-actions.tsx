'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { deleteRlcVisitorAction } from '@/lib/actions/rlc'
import type { Visitor } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { Archive, Edit, Eye, MoreHorizontal, Trash2 } from 'lucide-react'

type Props = {
  visitor: Visitor
  onDeleted?: () => void
}

export function RlcVisitorRowActions({ visitor, onDeleted }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  const name = [visitor.first_name, visitor.last_name].filter(Boolean).join(' ')

  async function archive() {
    if (!user?.id) return
    if (!confirm(`Archive ${name}? They will be hidden from the active pipeline.`)) return
    setBusy(true)
    const { error } = await deleteRlcVisitorAction(visitor.id, user.id, false)
    setBusy(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Archive failed', description: error })
      return
    }
    toast({ title: 'Visitor archived' })
    onDeleted?.()
  }

  async function permanentDelete() {
    if (!user?.id) return
    if (
      !confirm(
        `Permanently delete ${name}? This removes the record and all follow-up history. This cannot be undone.`
      )
    ) {
      return
    }
    setBusy(true)
    const { error } = await deleteRlcVisitorAction(visitor.id, user.id, true)
    setBusy(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Delete failed', description: error })
      return
    }
    toast({ title: 'Visitor deleted' })
    onDeleted?.()
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" asChild disabled={busy}>
        <Link href={`/admin/rlc/visitors/${visitor.id}`}>
          <Eye className="mr-2 h-4 w-4" />
          View
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={busy}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/admin/rlc/visitors/${visitor.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit record
          </DropdownMenuItem>
          {visitor.is_active !== false ? (
            <DropdownMenuItem onClick={archive}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={permanentDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete permanently
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
