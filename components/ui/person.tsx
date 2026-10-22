import type { ReactNode } from 'react'
import { cn, getInitials } from '@/lib/utils'

/** Same pastel family as the dashboard sticky notes, so people and actions feel related. */
const AVATAR_TONES = [
  'bg-[#f9dbe1] text-[#9b1238] dark:bg-[#4a1524] dark:text-[#f9b8c7]',
  'bg-[#dcefd9] text-[#25632f] dark:bg-[#183a1e] dark:text-[#a9dcae]',
  'bg-[#fbe0cf] text-[#a2420f] dark:bg-[#47230f] dark:text-[#f5bf98]',
  'bg-[#dbe9fb] text-[#1d4f9a] dark:bg-[#142c4f] dark:text-[#a9c8f2]',
  'bg-[#fbf1c4] text-[#7a5a05] dark:bg-[#3d3108] dark:text-[#eed98a]',
  'bg-[#e9e0fa] text-[#5b2d9e] dark:bg-[#2c1a4d] dark:text-[#cbb5f2]',
]

/** Stable tone per person: the same name always gets the same colour. */
function toneFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length]
}

const SIZES = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
} as const

export function PersonAvatar({
  name,
  seed,
  size = 'md',
  className,
}: {
  name?: string | null
  /** Defaults to the name; pass an id when names can change. */
  seed?: string
  size?: keyof typeof SIZES
  className?: string
}) {
  const label = name?.trim() || '?'
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-wide',
        SIZES[size],
        toneFor(seed ?? label),
        className
      )}
    >
      {label === '?' ? '?' : getInitials(label)}
    </span>
  )
}

/** Avatar + name + one quiet detail line: the standard way to show a person in a list or table. */
export function PersonLabel({
  name,
  detail,
  seed,
  meta,
  size = 'md',
  className,
}: {
  name?: string | null
  detail?: ReactNode
  seed?: string
  /** Inline after the name, e.g. a role chip. */
  meta?: ReactNode
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <PersonAvatar name={name} seed={seed} size={size} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {displayName(name)}
          </p>
          {meta}
        </div>
        {detail ? (
          <p className="truncate text-[13px] text-neutral-500 dark:text-neutral-400">{detail}</p>
        ) : null}
      </div>
    </div>
  )
}

/** "PRINCESS KOOMSON" → "Princess Koomson"; mixed-case names are left alone. */
export function displayName(name?: string | null): string {
  const value = name?.trim()
  if (!value) return 'Unknown'
  if (value !== value.toUpperCase()) return value
  return value.toLowerCase().replace(/(^|[\s'-])(\S)/g, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}
