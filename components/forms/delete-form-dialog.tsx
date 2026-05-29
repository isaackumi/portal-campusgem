'use client'

import { useState } from 'react'
import { deleteForm } from '@/lib/actions/forms'
import type { ChurchForm } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

type Props = {
  form: Pick<ChurchForm, 'id' | 'title' | 'response_count'> | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

export function DeleteFormDialog({ form, open, onOpenChange, onDeleted }: Props) {
  const { toast } = useToast()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!form) return
    setDeleting(true)
    const { error } = await deleteForm(form.id)
    setDeleting(false)

    if (error) {
      toast({ variant: 'destructive', title: 'Delete failed', description: error })
      return
    }

    toast({
      title: 'Form deleted',
      description: `"${form.title}" and all its responses were permanently removed.`,
    })
    onOpenChange(false)
    onDeleted()
  }

  const responseCount = form?.response_count ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this form?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 pt-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-slate-900">{form?.title}</span> will be permanently
                deleted. This cannot be undone.
              </p>
              {responseCount > 0 ? (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-950">
                  {responseCount} response{responseCount === 1 ? '' : 's'} will also be deleted.
                </p>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete form'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
