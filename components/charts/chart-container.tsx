'use client'

import type { ReactElement, ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

type ChartContainerProps = {
  children?: ReactElement
  height?: number
  className?: string
  empty?: boolean
  emptyMessage?: string
  minHeight?: number
}

export function ChartContainer({
  children,
  height = 280,
  className,
  empty,
  emptyMessage = 'No data yet',
  minHeight,
}: ChartContainerProps) {
  if (empty) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border border-dashed bg-slate-50 text-sm text-muted-foreground',
          className
        )}
        style={{ height, minHeight }}
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn('w-full touch-pan-x', className)} style={{ height, minHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as ReactElement}
      </ResponsiveContainer>
    </div>
  )
}
