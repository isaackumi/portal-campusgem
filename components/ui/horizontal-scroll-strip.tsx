'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type HorizontalScrollStripProps = {
  children: ReactNode
  className?: string
  /** Extra padding inside the scroll area (for snap items). */
  innerClassName?: string
}

/**
 * Horizontally scrollable row for tab-like nav on small screens.
 * Hides scrollbars, enables touch snap, and keeps items from shrinking.
 */
export function HorizontalScrollStrip({
  children,
  className,
  innerClassName,
}: HorizontalScrollStripProps) {
  return (
    <div
      className={cn(
        'relative',
        'before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-4 before:bg-gradient-to-r before:from-white before:to-transparent',
        'after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:z-10 after:w-4 after:bg-gradient-to-r after:from-transparent after:to-white',
        className
      )}
    >
      <div
        className={cn(
          'flex w-full gap-1.5 overflow-x-auto overscroll-x-contain',
          'snap-x snap-mandatory scroll-smooth',
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}

export const horizontalScrollItemClass =
  'shrink-0 snap-start min-h-10 touch-manipulation whitespace-nowrap'
