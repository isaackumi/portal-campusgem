'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { IosInstallSheet } from '@/components/ios-install-sheet'

/**
 * Home-screen install ("Add to Home Screen") for the whole app.
 *
 * Installability comes from public/manifest.json alone: Chrome no longer needs a service
 * worker. We deliberately run *no* service worker (an old one served stale JS chunks), so
 * this provider also removes any that an older build registered.
 *
 *   Android / desktop Chromium  `beforeinstallprompt` is captured and replayed by install().
 *   iOS / iPadOS                 no prompt API: install() opens a sheet explaining
 *                                Share → Add to Home Screen.
 *   Already running standalone   mode is null, so nothing is shown.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

/** How this browser installs the app; null when it can't, or already has. */
export type InstallMode = 'prompt' | 'ios' | null

interface InstallAppContextValue {
  mode: InstallMode
  /** The user closed the dashboard install card (remembered per browser). */
  dismissed: boolean
  install: () => Promise<void>
  dismiss: () => void
}

const DISMISSED_KEY = 'chms-install-dismissed-v1'

const InstallAppContext = createContext<InstallAppContextValue>({
  mode: null,
  dismissed: true,
  install: async () => {},
  dismiss: () => {},
})

export function useInstallApp() {
  return useContext(InstallAppContext)
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos() {
  const ua = navigator.userAgent
  // iPadOS reports itself as a Mac; touch support gives it away.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [ios, setIos] = useState(false)
  const [standalone, setStandalone] = useState(true) // assume installed until checked: no flash
  const [dismissed, setDismissed] = useState(true)
  const [iosSheetOpen, setIosSheetOpen] = useState(false)

  useEffect(() => {
    // Remove service workers left by older builds (production too, not only dev).
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
        .catch(() => {})
    }

    setIos(isIos())
    setStandalone(isStandalone())
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === '1')
    } catch {
      setDismissed(false)
    }

    const onPrompt = (event: Event) => {
      // Keep Chrome's own mini-infobar away; we offer install from the menu / dashboard.
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setDeferred(null)
      setStandalone(true)
    }
    const media = window.matchMedia('(display-mode: standalone)')
    const onDisplayMode = () => setStandalone(isStandalone())

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    media.addEventListener?.('change', onDisplayMode)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      media.removeEventListener?.('change', onDisplayMode)
    }
  }, [])

  const mode: InstallMode = standalone ? null : deferred ? 'prompt' : ios ? 'ios' : null

  const install = useCallback(async () => {
    if (deferred) {
      try {
        await deferred.prompt()
        await deferred.userChoice
      } catch {
        // Prompt already used or blocked; fall through and drop it.
      }
      // A prompt event can only be used once. Chrome fires a fresh one if it's still installable.
      setDeferred(null)
      return
    }
    if (ios) setIosSheetOpen(true)
  }, [deferred, ios])

  const dismiss = useCallback(() => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Not persisted; hidden for this visit.
    }
  }, [])

  const value = useMemo(() => ({ mode, dismissed, install, dismiss }), [mode, dismissed, install, dismiss])

  return (
    <InstallAppContext.Provider value={value}>
      {children}
      {ios ? <IosInstallSheet open={iosSheetOpen} onOpenChange={setIosSheetOpen} /> : null}
    </InstallAppContext.Provider>
  )
}
