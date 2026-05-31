import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const maxWidth = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-6xl',
} as const

/** Consistent page width and spacing for mobile through desktop. */
export function PageContainer({ children, className, size = 'lg' }: Props) {
  return (
    <div className={cn('mx-auto w-full min-w-0 space-y-6 px-0 sm:space-y-8', maxWidth[size], className)}>
      {children}
    </div>
  )
}
