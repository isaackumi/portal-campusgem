'use client'

import { useEffect, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import QRCode from 'react-qr-code'
import { Copy, Download, Share2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

/**
 * Full-screen QR to hold out to someone: their camera opens `url`. Black on white in both themes
 * (scans best, reads in sun) and keeps the screen awake while open where the phone allows it.
 * "Save image" makes a PNG with the title under the code, to keep in the gallery or print.
 */
export function QrSheet({
  open,
  onOpenChange,
  url,
  title,
  overline,
  hint = 'Scan with your phone camera',
  fileName = 'qr-code',
  shareText,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string | null
  title: string
  overline?: string
  hint?: string
  /** Saved image name, without extension. */
  fileName?: string
  shareText?: string
}) {
  const { toast } = useToast()
  const [canShare, setCanShare] = useState(false)
  const [saving, setSaving] = useState(false)
  const qrBox = useRef<HTMLDivElement>(null)

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
      await navigator.share({ title, text: shareText ?? title, url })
    } catch {
      // Closed the share sheet: nothing to do.
    }
  }

  async function saveImage() {
    const svg = qrBox.current?.querySelector('svg')
    if (!svg || !url) return
    setSaving(true)
    try {
      const blob = await qrPng(svg, title, overline)
      const name = `${fileName.replace(/[^\w-]+/g, '-').toLowerCase() || 'qr-code'}.png`
      const file = new File([blob], name, { type: 'image/png' })
      // Phones: the share sheet has "Save image" / "Save to Photos". Elsewhere: a download.
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean }
      if (nav.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title })
          return
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
        }
      }
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(href), 5000)
    } catch {
      toast({ title: 'Could not save the image', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const light = 'border-neutral-300 bg-white text-base text-neutral-900 hover:bg-neutral-50 dark:border-neutral-300 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-50'

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white text-neutral-900 dark:bg-white dark:text-neutral-900"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <p className="app-overline min-w-0 truncate text-neutral-600 dark:text-neutral-600">{overline ?? ''}</p>
            <DialogPrimitive.Close className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 dark:text-neutral-700 dark:hover:bg-neutral-100">
              <X className="h-6 w-6" aria-hidden />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="min-w-0 text-center">
              <DialogPrimitive.Title className="break-words text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-950">
                {title}
              </DialogPrimitive.Title>
              <p className="mt-1 text-base text-neutral-700 dark:text-neutral-700">{hint}</p>
            </div>
            <div ref={qrBox} className="w-full max-w-[22rem] rounded-2xl border-2 border-neutral-900 bg-white p-4 dark:border-neutral-900 dark:bg-white">
              {url ? (
                <QRCode value={url} size={512} level="M" style={{ width: '100%', height: 'auto', display: 'block' }} fgColor="#000000" bgColor="#ffffff" />
              ) : (
                <div className="aspect-square w-full animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-100" />
              )}
            </div>
            <div className="grid w-full grid-cols-2 gap-3">
              <Button type="button" variant="outline" onClick={copy} disabled={!url} className={`h-12 ${light}`}>
                <Copy className="mr-2 h-5 w-5" aria-hidden />
                Copy link
              </Button>
              <Button type="button" variant="outline" onClick={() => void saveImage()} disabled={!url || saving} className={`h-12 ${light}`}>
                <Download className="mr-2 h-5 w-5" aria-hidden />
                {saving ? 'Saving…' : 'Save image'}
              </Button>
              <Button
                type="button"
                onClick={canShare ? share : copy}
                disabled={!url}
                className="col-span-2 h-12 bg-neutral-900 text-base text-white hover:bg-neutral-800 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
              >
                <Share2 className="mr-2 h-5 w-5" aria-hidden />
                Share link
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** The QR on white with the title (and overline) under it, as a 1080-wide PNG. */
async function qrPng(svg: SVGElement, title: string, overline?: string): Promise<Blob> {
  const W = 1080
  const pad = 90
  const qr = W - pad * 2
  const H = pad + qr + 260
  const xml = new XMLSerializer().serializeToString(svg)
  const img = new Image()
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No canvas')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, pad, pad, qr, qr)
  ctx.fillStyle = '#0a0a0a'
  ctx.textAlign = 'center'
  ctx.font = '700 52px "Plus Jakarta Sans", system-ui, sans-serif'
  const lines = wrap(ctx, title, W - pad * 2).slice(0, 2)
  lines.forEach((line, i) => ctx.fillText(line, W / 2, pad + qr + 90 + i * 62))
  if (overline) {
    ctx.fillStyle = '#525252'
    ctx.font = '500 34px "Plus Jakarta Sans", system-ui, sans-serif'
    ctx.fillText(overline, W / 2, pad + qr + 90 + lines.length * 62 + 20)
  }
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No image'))), 'image/png'))
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width > max && line) {
      lines.push(line)
      line = w
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}
