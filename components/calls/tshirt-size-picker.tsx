'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setCallTshirtSizeAction } from '@/lib/actions/call-center'
import { TSHIRT_SIZES } from '@/lib/camp/tshirt'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

/**
 * Ask their T-shirt size on the call: one tap saves it to their registration and their profile.
 * Tapping the chosen size again clears it.
 */
export function TshirtSizePicker({ registrationId, initial, className }: { registrationId: string; initial?: string | null; className?: string }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [size, setSize] = useState<string | null>(initial ?? null)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSize(initial ?? null)
    setSaved(false)
  }, [registrationId, initial])

  async function pick(next: string) {
    const value = size === next ? null : next
    const before = size
    setSize(value)
    setSaving(next)
    setSaved(false)
    const res = await setCallTshirtSizeAction({ registrationId, size: value })
    setSaving(null)
    if (res.error) {
      setSize(before)
      toast({ variant: 'destructive', title: 'Size not saved', description: res.error })
      return
    }
    setSaved(true)
    void queryClient.invalidateQueries({ queryKey: ['call-session'] })
  }

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="app-overline">T-shirt size</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400" aria-live="polite">
          {saving ? 'Saving…' : saved ? (size ? `Saved: ${size}` : 'Cleared') : size ? `On file: ${size}` : 'Ask them'}
        </p>
      </div>
      <div role="radiogroup" aria-label="T-shirt size" className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
        {TSHIRT_SIZES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={size === s}
            disabled={saving !== null}
            onClick={() => void pick(s)}
            className={cn(
              'h-11 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-60',
              size === s
                ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500'
                : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-neutral-600'
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
