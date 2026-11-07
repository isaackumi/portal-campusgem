'use client'

import { useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import QRCode from 'react-qr-code'
import { Copy, Share2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

/**
 * Full-screen QR to hold out to a student: their camera opens the outreach form, credited to
 * whoever is showing it. Deliberately black on white in both themes (scans best, reads in sun),
 * and keeps the screen awake while open where the phone allows it.
 */
export function OutreachQrSheet({
  open,
  onOpenChange,
  url,
  campusName,
  campusLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string | null
  campusName: string
  campusLabel: string
}) {
  const { toast } = useToast()
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  useEffect(() => {
    if (!open) return
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock
      ?.request('screen')
      .then((l) => {
        lock = l
      })
      .catch(() => undefined)
    return () => {
      void lock?.release().catch(() => undefined)
    }
  }, [open])

  async function copy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: 'Link copied' })
    } catch {
      toast({ title: 'Could not copy', description: url, variant: 'destructive' })
    }
  }

  async function share() {
    if (!url) return
    try {
      await navigator.share({ title: `Campus GEM ${campusLabel}`, text: `Leave your details with Campus GEM (${campusLabel}):`, url })
    } catch {
      // Closed the share sheet: nothing to do.
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white text-neutral-900 dark:bg-white dark:text-neutral-900"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <p className="app-overline text-neutral-600 dark:text-neutral-600">Campus GEM · {campusLabel}</p>
            <DialogPrimitive.Close className="flex h-12 w-12 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 dark:text-neutral-700 dark:hover:bg-neutral-100">
              <X className="h-6 w-6" aria-hidden />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="min-w-0 text-center">
              <DialogPrimitive.Title className="break-words text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-950">
                {campusName}
              </DialogPrimitive.Title>
              <p className="mt-1 text-base text-neutral-700 dark:text-neutral-700">Scan with your phone camera to leave your details</p>
            </div>
            <div className="w-full max-w-[22rem] rounded-2xl border-2 border-neutral-900 bg-white p-4 dark:border-neutral-900 dark:bg-white">
              {url ? (
                <QRCode value={url} size={512} level="M" style={{ width: '100%', height: 'auto', display: 'block' }} fgColor="#000000" bgColor="#ffffff" />
              ) : (
                <div className="aspect-square w-full animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-100" />
              )}
            </div>
            <div className="grid w-full grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={copy}
                disabled={!url}
                className="h-12 border-neutral-300 bg-white text-base text-neutral-900 hover:bg-neutral-50 dark:border-neutral-300 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-50"
              >
                <Copy className="mr-2 h-5 w-5" aria-hidden />
                Copy link
              </Button>
              <Button
                type="button"
                onClick={canShare ? share : copy}
                disabled={!url}
                className="h-12 bg-neutral-900 text-base text-white hover:bg-neutral-800 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
              >
                <Share2 className="mr-2 h-5 w-5" aria-hidden />
                Share
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
