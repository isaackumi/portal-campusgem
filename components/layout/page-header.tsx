import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
  className?: string
}

/** Title row used across admin pages. Matches the accounting page header. */
export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 text-sm text-neutral-500 dark:text-neutral-400">{eyebrow}</p>
          ) : null}
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}
