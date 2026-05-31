'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { RLC_NAME } from '@/lib/constants/rlc'
import { Button } from '@/components/ui/button'
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
    <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between', className)}>
      <div className="min-w-0 flex-1 space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2 h-8" onClick={() => router.push(backHref)}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-800 sm:h-11 sm:w-11">
            <Church className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-rose-700/80">{RLC_NAME}</p>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {children}
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
