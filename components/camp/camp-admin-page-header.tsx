'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { CampYear } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0 space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="-ml-2 h-8 shrink-0" onClick={() => router.push(backHref)}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">{title}</h1>
          {campYear ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-slate-200 bg-slate-50 font-semibold text-slate-900 hover:bg-slate-50"
              >
                <Calendar className="mr-1 h-3 w-3" />
                {campYear.year}
              </Badge>
              {campYear.theme ? (
                <Badge
                  variant="outline"
                  className="max-w-[min(100%,20rem)] border-violet-200 bg-violet-50 font-medium text-violet-900 hover:bg-violet-50"
                  title={campYear.theme}
                >
                  <Sparkles className="mr-1 h-3 w-3 shrink-0" />
                  <span className="truncate">{campYear.theme}</span>
                </Badge>
              ) : null}
              {campYear.venue ? (
                <Badge
                  variant="outline"
                  className="max-w-[min(100%,16rem)] border-amber-200 bg-amber-50 font-medium text-amber-950 hover:bg-amber-50"
                  title={campYear.venue}
                >
                  <MapPin className="mr-1 h-3 w-3 shrink-0" />
                  <span className="truncate">{campYear.venue}</span>
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                className="border-slate-200 bg-slate-50 font-normal text-slate-700 hover:bg-slate-50"
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
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
