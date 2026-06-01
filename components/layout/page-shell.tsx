import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PageShellProps = {
  children: ReactNode
  className?: string
}

/** Standard in-app page wrapper — spacing aligned with dashboard layout. */
export function PageShell({ children, className }: PageShellProps) {
  return <div className={cn('space-y-6 sm:space-y-8', className)}>{children}</div>
}
