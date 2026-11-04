'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { RLC_NAME } from '@/lib/constants/rlc'
import { cn } from '@/lib/utils'
import { ArrowLeft, Church } from 'lucide-react'

type Props = {
  title: string
  subtitle?: string
  backHref?: string
  actions?: ReactNode
  children?: ReactNode
  className?: string
}

export function RlcPageHeader({
  title,
  subtitle,
  backHref = '/admin/rlc',
  actions,
  children,
  className,
}: Props) {
  const router = useRouter()

  return (
    <div className={cn('mb-5 flex flex-col gap-4 sm:mb-6 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            <Church className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="app-overline">{RLC_NAME}</p>
            <h1 className="app-page-title break-words">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</p> : null}
          </div>
        </div>
        {children}
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-wrap gap-2 [&>*]:min-h-11 [&>*]:flex-1 sm:[&>*]:min-h-0 sm:[&>*]:flex-none lg:w-auto lg:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
