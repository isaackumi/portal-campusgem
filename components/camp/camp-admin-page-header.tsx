'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { CampYear } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ArrowLeft, Calendar, MapPin, Sparkles } from 'lucide-react'

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function campDateRange(campYear: CampYear): string {
  return `${formatShortDate(campYear.start_date)} – ${formatShortDate(campYear.end_date)}`
}

type Props = {
  title: string
  campYear?: CampYear | null
  backHref?: string
  actions?: ReactNode
  children?: ReactNode
  className?: string
}

export function CampAdminPageHeader({
  title,
  campYear,
  backHref = '/admin/camp-meeting',
  actions,
  children,
  className,
}: Props) {
  const router = useRouter()

  return (
    <div className={cn('mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="app-page-title">{title}</h1>
        {campYear ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">
              <Calendar className="h-3 w-3" aria-hidden />
              {campYear.year}
            </Badge>
            {campYear.theme ? (
              <Badge variant="brand" className="max-w-[min(100%,20rem)]" title={campYear.theme}>
                <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{campYear.theme}</span>
              </Badge>
            ) : null}
            {campYear.venue ? (
              <Badge variant="outline" className="max-w-[min(100%,16rem)]" title={campYear.venue}>
                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{campYear.venue}</span>
              </Badge>
            ) : null}
            <Badge variant="outline">{campDateRange(campYear)}</Badge>
            {campYear.is_active ? <Badge variant="success">Active year</Badge> : null}
            {campYear.registration_open ? <Badge variant="success">Registration open</Badge> : null}
          </div>
        ) : null}
          {children ? <div className="mt-2 flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
