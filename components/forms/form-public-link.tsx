'use client'

import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  slug: string
  className?: string
  showPathOnly?: boolean
}

export function formPublicUrl(slug: string): string {
  if (typeof window === 'undefined') return `/f/${slug}`
  return `${window.location.origin}/f/${slug}`
}

/** Clickable public form URL for admin surfaces. */
export function FormPublicLink({ slug, className, showPathOnly = false }: Props) {
  const href = formPublicUrl(slug)
  const label = showPathOnly ? `/f/${slug}` : href

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex max-w-full items-center gap-1 text-xs font-medium text-indigo-600 underline-offset-2 hover:text-indigo-800 hover:underline',
        className
      )}
      title="Open public form in a new tab"
    >
      <span className="truncate">{label}</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
    </a>
  )
}
