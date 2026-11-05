'use client'

import { PlusSquare, Share } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** iOS has no install prompt API: explain Share → Add to Home Screen. Bottom sheet on phones. */
export function IosInstallSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const steps = [
    {
      icon: Share,
      text: (
        <>
          Tap <strong className="font-semibold text-neutral-900 dark:text-white">Share</strong> in the
          browser toolbar
        </>
      ),
    },
    {
      icon: PlusSquare,
      text: (
        <>
          Scroll down and tap{' '}
          <strong className="font-semibold text-neutral-900 dark:text-white">Add to Home Screen</strong>
        </>
      ),
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center text-center sm:text-center">
          <BrandMark size="lg" className="mb-1" />
          <DialogTitle className="leading-snug">Add Campus Gem to your Home Screen</DialogTitle>
          <DialogDescription>It opens full screen, like an app, straight to your dashboard.</DialogDescription>
        </DialogHeader>

        <ol className="space-y-2">
          {steps.map((step, index) => (
            <li
              key={index}
              className="flex min-h-[52px] items-center gap-3 rounded-xl bg-neutral-100 px-3 py-2.5 text-[15px] text-neutral-700 dark:bg-white/[0.05] dark:text-neutral-300"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-brand-300 dark:ring-white/10">
                <step.icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span>
                <span className="sr-only">Step {index + 1}: </span>
                {step.text}
              </span>
            </li>
          ))}
        </ol>

        <Button className="h-11 w-full" onClick={() => onOpenChange(false)}>
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  )
}
