'use client'

import { HeroArt } from '@/components/dashboard/hero-art'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StickyNoteTone = 'rose' | 'sage' | 'apricot' | 'sky' | 'lemon' | 'lilac'

export interface StickyNoteAction {
  href: string
  /** Two short lines, e.g. ['Welcome a', 'visitor']. */
  lines: [string, string?]
  icon: LucideIcon
  tone: StickyNoteTone
}

const NOTE_TONES: Record<StickyNoteTone, { paper: string; ink: string }> = {
  rose: { paper: 'bg-[#f9dbe1]', ink: 'text-[#9b1238]' },
  sage: { paper: 'bg-[#dcefd9]', ink: 'text-[#25632f]' },
  apricot: { paper: 'bg-[#fbe0cf]', ink: 'text-[#a2420f]' },
  sky: { paper: 'bg-[#dbe9fb]', ink: 'text-[#1d4f9a]' },
  lemon: { paper: 'bg-[#fbf1c4]', ink: 'text-[#7a5a05]' },
  lilac: { paper: 'bg-[#e9e0fa]', ink: 'text-[#5b2d9e]' },
}

/** Slight, fixed tilts so the notes look hand-placed but don't jump between renders. */
const TILTS = ['-2.2deg', '1.6deg', '-1.1deg', '2deg', '-1.6deg', '1.2deg']
const TAPE_TILTS = ['-3deg', '2deg', '-1deg', '3deg', '-2deg', '1deg']

function greetingFor(date: Date): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardHero({
  firstName,
  notes,
  actions,
}: {
  firstName: string
  notes: StickyNoteAction[]
  /** Rendered top-right (e.g. the Customise button). */
  actions?: ReactNode
}) {
  const now = new Date()
  const asAt = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <section className="relative isolate z-10 rounded-xl border border-neutral-200/80 dark:border-neutral-800">
      {/* Artwork sits in its own clipped layer so popovers (Customise) can overflow the hero. */}
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-xl" aria-hidden>
        <HeroArt className="absolute inset-0 h-full w-full" />
        {/* Fade towards the greeting so text and notes stay crisp. */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#fbf6f1] via-[#fbf6f1]/70 to-transparent dark:from-[#1b1216] dark:via-[#1b1216]/70 md:via-[#fbf6f1]/40 md:dark:via-[#1b1216]/40" />
      </div>

      <div className="flex min-h-[300px] flex-col gap-6 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="app-page-title">
              {greetingFor(now)}, <span className="app-display-accent">{firstName}</span>
            </h1>
            <p className="app-page-description mt-2 dark:text-neutral-300">
              Here&apos;s how Campus Gem Ministries is doing, as at {asAt}.
            </p>
          </div>
          {actions}
        </div>

        {notes.length > 0 && (
          <nav aria-label="Quick actions" className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 pt-3 sm:gap-5">
            {notes.map((note, index) => {
              const tone = NOTE_TONES[note.tone]
              const Icon = note.icon
              return (
                <Link
                  key={note.href}
                  href={note.href}
                  className={cn(
                    'sticky-note focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
                    tone.paper
                  )}
                  style={
                    {
                      '--note-tilt': TILTS[index % TILTS.length],
                      '--tape-tilt': TAPE_TILTS[index % TAPE_TILTS.length],
                    } as React.CSSProperties
                  }
                >
                  <span className="sticky-note-tape" aria-hidden />
                  <Icon className={cn('absolute right-3 top-3 h-4 w-4 opacity-70', tone.ink)} aria-hidden />
                  <span className={cn('text-[15px] font-semibold leading-tight tracking-tight', tone.ink)}>
                    {note.lines[0]}
                    {note.lines[1] ? (
                      <>
                        <br />
                        {note.lines[1]}
                      </>
                    ) : null}
                  </span>
                </Link>
              )
            })}
          </nav>
        )}
      </div>

    </section>
  )
}
