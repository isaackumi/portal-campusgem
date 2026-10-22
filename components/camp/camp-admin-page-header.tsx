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
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{title}</h1>
        {campYear ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-neutral-200 bg-neutral-100 font-semibold text-neutral-900 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
            >
              <Calendar className="mr-1 h-3 w-3" />
              {campYear.year}
            </Badge>
            {campYear.theme ? (
              <Badge
                variant="outline"
                className="max-w-[min(100%,20rem)] border-brand-200 bg-brand-50 font-medium text-brand-800 hover:bg-brand-50 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-200"
                title={campYear.theme}
              >
                <Sparkles className="mr-1 h-3 w-3 shrink-0" />
                <span className="truncate">{campYear.theme}</span>
              </Badge>
            ) : null}
            {campYear.venue ? (
              <Badge
                variant="outline"
                className="max-w-[min(100%,16rem)] border-neutral-200 bg-white font-medium text-neutral-700 hover:bg-white dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200"
                title={campYear.venue}
              >
                <MapPin className="mr-1 h-3 w-3 shrink-0" />
                <span className="truncate">{campYear.venue}</span>
              </Badge>
            ) : null}
            <Badge
              variant="outline"
              className="border-neutral-200 bg-neutral-50 font-normal text-neutral-600 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {campDateRange(campYear)}
            </Badge>
              {campYear.is_active ? (
                <Badge className="border-emerald-200 bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                  Active year
                </Badge>
              ) : null}
              {campYear.registration_open ? (
                <Badge className="border-sky-200 bg-sky-100 text-sky-900 hover:bg-sky-100">Registration open</Badge>
              ) : null}
            </div>
          ) : null}
          {children ? <div className="mt-2 flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
