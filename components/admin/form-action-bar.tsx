import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Save / Cancel row for staff form pages. On phones it sticks above the bottom tab bar so the
 * primary action is always under the thumb; from `sm` up it is a plain right-aligned row.
 * Children are buttons; they stretch to share the width on phones.
 */
export function FormActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 flex gap-2 rounded-xl border border-neutral-200 bg-white/95 p-2 shadow-lg backdrop-blur',
        'dark:border-white/10 dark:bg-neutral-900/95',
        '[&>*]:h-11 [&>*]:flex-1',
        'sm:static sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none sm:dark:bg-transparent',
        'sm:[&>*]:h-10 sm:[&>*]:flex-none',
        className
      )}
    >
      {children}
    </div>
  )
}
