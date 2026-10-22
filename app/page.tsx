'use client'

import Link from 'next/link'
import { ArrowRight, LogIn } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers'
import {
  filterLandingSections,
  landingAccentStyles,
  landingHref,
} from '@/lib/navigation/landing'
import { cn } from '@/lib/utils'

export default function HomePage() {
  const { user, loading } = useAuth()
  const sections = filterLandingSections(user?.role, undefined, user?.permissions)
  const isSignedIn = Boolean(user)

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <BrandMark size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                Campus Gem
              </p>
              <p className="truncate text-sm font-bold tracking-tight text-neutral-900 dark:text-white">
                Ministries
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          {!loading && (
            <Button asChild size="sm" className="shrink-0 gap-2">
              <Link href={isSignedIn ? '/dashboard' : '/auth'}>
                {isSignedIn ? (
                  <>
                    Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Staff sign in
                  </>
                )}
              </Link>
            </Button>
          )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-neutral-900 px-4 py-14 text-white sm:px-6 sm:py-20">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-32 right-10 h-96 w-96 rounded-full bg-white/5" />

        <div className="relative mx-auto max-w-6xl">
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/60">
            Campus Gem portal
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            One home for camp, RLC, and church operations
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            Register for camp meeting, check in as an RLC visitor, or sign in to manage members,
            attendance, and ministry outreach.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2 bg-white text-brand-800 hover:bg-brand-50">
              <Link href="/camp-meeting/register">
                Camp registration
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/rlc/visit">RLC visitor check-in</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/rlc/join">RLC membership</Link>
            </Button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-12 px-4 py-12 sm:px-6 sm:py-16">
        {sections.map((section) => (
          <section key={section.id} aria-labelledby={`landing-${section.id}`}>
            <div className="mb-6 max-w-2xl">
              <h2 id={`landing-${section.id}`} className="app-section-title sm:text-xl">
                {section.title}
              </h2>
              <p className="app-page-description mt-1">{section.description}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.destinations.map((destination) => {
                const Icon = destination.icon
                const styles = landingAccentStyles(destination.accent)
                const href = destination.public
                  ? destination.href
                  : landingHref(destination.href, isSignedIn)

                return (
                  <Link
                    key={destination.href}
                    href={href}
                    className={cn(
                      'group relative flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-all dark:border-neutral-700 dark:bg-neutral-800',
                      'hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md dark:hover:border-neutral-600',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                      styles.ring
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                          styles.icon
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{destination.title}</h3>
                          {destination.public ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                              Open
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                          {destination.description}
                        </p>
                      </div>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 dark:text-brand-300">
                      {destination.public ? 'Go' : isSignedIn ? 'Open' : 'Sign in to open'}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}

        {!isSignedIn && !loading ? (
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Staff & leaders</h2>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  Sign in with your phone or membership ID to access ministry tools.
                </p>
              </div>
              <Button asChild className="shrink-0 gap-2">
                <Link href="/auth">
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Link>
              </Button>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-neutral-200 bg-white px-4 py-8 dark:border-neutral-700 dark:bg-neutral-800 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-center text-xs text-neutral-500 dark:text-neutral-400 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} Campus Gem Ministries</p>
          <p>Camp meeting · Redemption Light Chapel · Outreach</p>
        </div>
      </footer>
    </div>
  )
}
