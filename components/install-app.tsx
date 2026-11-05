'use client'

import { Download, X } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { useInstallApp } from '@/components/pwa-provider'
import { cn } from '@/lib/utils'

/**
 * "Install app" row for the sidebar / mobile menu. Shown whenever this browser can install
 * and the app isn't already running from the home screen (dismissing the dashboard card
 * doesn't hide it: this is the quiet, always-available way back in).
 */
export function InstallAppNavItem({
  collapsed = false,
  onDone,
}: {
  collapsed?: boolean
  onDone?: () => void
}) {
  const { mode, install } = useInstallApp()
  if (!mode) return null

  return (
    <button
      type="button"
      onClick={() => {
        // Close the drawer first so the iOS sheet / Chrome prompt isn't stacked under it.
        onDone?.()
        void install()
      }}
      title={collapsed ? 'Install app' : 'Add Campus Gem to your home screen'}
      data-tour="install-app"
      className={cn('sidebar-nav-item group', collapsed && 'justify-center px-0')}
    >
      <Download className="sidebar-nav-icon h-4 w-4 shrink-0" aria-hidden />
      {collapsed ? <span className="sr-only">Install app</span> : <span className="truncate">Install app</span>}
    </button>
  )
}

/** Dismissible card for the dashboard, phones and tablets only (desktop has the sidebar row). */
export function InstallAppCard({ className }: { className?: string }) {
  const { mode, dismissed, install, dismiss } = useInstallApp()
  if (!mode || dismissed) return null

  return (
    <section
      aria-label="Install the app"
      data-tour="install-app"
      className={cn(
        'relative flex items-center gap-3 rounded-2xl border border-brand-200/70 bg-brand-50 p-3 pr-12 dark:border-brand-500/20 dark:bg-brand-500/10 lg:hidden',
        className
      )}
    >
      <BrandMark size="lg" />
      <div className="min-w-0 flex-1">
        <h2 className="app-section-title">Get the app</h2>
        <p className="text-[13px] leading-5 text-neutral-600 dark:text-neutral-300">
          Add Campus Gem to your home screen to open it in one tap.
        </p>
        <Button size="sm" className="mt-2 h-11 px-4" onClick={() => void install()}>
          <Download className="mr-1.5 h-4 w-4" aria-hidden />
          {mode === 'ios' ? 'Show me how' : 'Install'}
        </Button>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install suggestion"
        className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-brand-100 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </section>
  )
}
