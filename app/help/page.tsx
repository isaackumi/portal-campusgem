'use client'

import { useEffect, useState } from 'react'
import {
  CalendarCheck,
  Check,
  Compass,
  HeartHandshake,
  MessageSquare,
  PlayCircle,
  RotateCcw,
  Church,
  Tent,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'
import { useAuth } from '@/components/providers'
import { useTour } from '@/components/tour/tour-provider'
import { DESKTOP_QUERY } from '@/components/tour/dom'
import { useToast } from '@/hooks/use-toast'
import { groupTours, isDynamicRoute, stepsForLayout, visibleSteps } from '@/lib/tour/logic'
import type { TourGroupId } from '@/lib/tour/tours'

const GROUP_ICONS: Record<TourGroupId, LucideIcon> = {
  'getting-started': Compass,
  people: Users,
  attendance: CalendarCheck,
  groups: UsersRound,
  camp: Tent,
  communication: MessageSquare,
  rlc: Church,
  pastoral: HeartHandshake,
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const sync = () => setMobile(!mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return mobile
}

function GuidedToursContent() {
  const { user, loading, can } = useAuth()
  const { tours, isCompleted, startTour, resetAll, state } = useTour()
  const { toast } = useToast()
  const mobile = useIsMobile()

  if (loading && !user) return <LoadingPage title="Loading tours…" />

  const groups = groupTours(tours)
  const done = tours.filter((t) => isCompleted(t.id)).length
  const anyDone = Object.keys(state.completed).length > 0

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Help"
        title="Guided tours"
        description="Short, step-by-step tours of the app. Each one opens the right page and points at what matters. Replay any of them whenever you like."
        actions={
          <Button
            variant="outline"
            className="h-11 sm:h-10"
            disabled={!anyDone}
            onClick={() => {
              resetAll()
              toast({ title: 'Tours reset', description: 'Every tour is marked as not done yet.' })
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
            Reset all tours
          </Button>
        }
      />

      <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-300" aria-live="polite">
        <span className="font-semibold tabular-nums text-neutral-900 dark:text-white">{done}</span> of{' '}
        <span className="tabular-nums">{tours.length}</span> tours done. Press Esc at any time to stop a tour; the
        arrow keys move between steps.
      </p>

      <div className="space-y-8">
        {groups.map((group) => {
          const Icon = GROUP_ICONS[group.id]
          return (
            <section key={group.id} aria-labelledby={`tour-group-${group.id}`}>
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-400/10 dark:text-brand-300">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 id={`tour-group-${group.id}`} className="app-section-title">
                    {group.title}
                  </h2>
                  <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{group.description}</p>
                </div>
              </div>

              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.tours.map((tour) => {
                  const completed = isCompleted(tour.id)
                  const steps = stepsForLayout(visibleSteps(tour, can), mobile).length
                  return (
                    <li key={tour.id} className="dashboard-panel flex flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-neutral-900 dark:text-white">{tour.title}</h3>
                        {completed ? (
                          <Badge variant="success" className="shrink-0">
                            <Check className="h-3 w-3" aria-hidden />
                            Done
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 flex-1 text-sm text-neutral-600 dark:text-neutral-300">{tour.description}</p>
                      {isDynamicRoute(tour.route) && tour.startHint ? (
                        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                          Starts from one {tour.route.startsWith('/groups') ? 'group' : 'person'}’s page.
                        </p>
                      ) : null}
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                          About {steps} step{steps === 1 ? '' : 's'}
                        </span>
                        <Button
                          size="sm"
                          variant={completed ? 'outline' : 'default'}
                          className="h-11 sm:h-9"
                          onClick={() => startTour(tour.id)}
                          aria-label={`${completed ? 'Replay' : 'Start'} tour: ${tour.title}`}
                        >
                          {completed ? (
                            <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
                          ) : (
                            <PlayCircle className="mr-1.5 h-4 w-4" aria-hidden />
                          )}
                          {completed ? 'Replay' : 'Start'}
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export default function GuidedToursPage() {
  return (
    <DashboardLayout>
      <GuidedToursContent />
    </DashboardLayout>
  )
}
