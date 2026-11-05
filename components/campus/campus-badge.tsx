import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** A person's campus tag ("UEW"). Links to the campus page when `href` is given. */
export function CampusBadge({
  label,
  name,
  href,
  className,
}: {
  label: string
  /** Full campus name, for the tooltip and screen readers. */
  name?: string
  href?: string
  className?: string
}) {
  const chip = (
    <Badge variant="brand" className={cn('font-mono', className)} title={name}>
      <GraduationCap className="h-3 w-3" aria-hidden />
      {label}
      {name && name !== label ? <span className="sr-only"> ({name})</span> : null}
    </Badge>
  )
  if (!href) return chip
  return (
    <Link href={href} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40">
      {chip}
    </Link>
  )
}
