'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { saveMyMessageAction } from '@/lib/actions/call-center'
import { TEMPLATE_LIMITS, type TemplateChannel } from '@/lib/calls/templates'
import { useToast } from '@/hooks/use-toast'

/**
 * "Save as my message": keep what you wrote (or changed) to pick again later. Only you see it;
 * managers can tick "Share with the team" instead.
 */
export function SaveMyMessage({ body, channel, canShare, onSaved }: { body: string; channel: TemplateChannel; canShare: boolean; onSaved?: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [share, setShare] = useState(false)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await saveMyMessageAction({ name, body, channel, share })
    setSaving(false)
    if (res.error) {
      toast({ variant: 'destructive', title: 'Not saved', description: res.error })
      return
    }
    toast({ title: share ? 'Saved for the whole team' : 'Saved to your messages', description: 'Pick it next time from the list.' })
    setOpen(false)
    setName('')
    setShare(false)
    void queryClient.invalidateQueries({ queryKey: ['call-templates'] })
    onSaved?.()
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" className="h-10 px-2 text-brand-700 dark:text-brand-300" onClick={() => setOpen(true)} disabled={!body.trim()}>
        <Bookmark className="mr-1.5 h-4 w-4" aria-hidden />
        Save as my message
      </Button>
    )
  }

  return (
    <div className="grid gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
      <label className="grid gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
        Name it so you can find it again
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={TEMPLATE_LIMITS.name}
          placeholder="e.g. Bus pick-up times"
          className="h-11 rounded-lg border border-neutral-200 bg-white px-3 text-[15px] font-normal text-neutral-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        />
      </label>
      {canShare ? (
        <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
          <Checkbox checked={share} onCheckedChange={(v) => setShare(v === true)} />
          Share with the whole team
        </label>
      ) : (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Only you will see it.</p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" className="h-10" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="button" className="h-10" onClick={() => void save()} disabled={saving || !name.trim() || !body.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
