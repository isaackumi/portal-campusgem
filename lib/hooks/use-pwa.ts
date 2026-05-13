import { useState, useEffect, useCallback } from 'react'

interface PWAState {
  isInstalled: boolean
  canInstall: boolean
  isOnline: boolean
  updateAvailable: boolean
  registration: ServiceWorkerRegistration | null
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function usePWA() {
  const [pwaState, setPwaState] = useState<PWAState>({
    isInstalled: false,
    canInstall: false,
    isOnline: navigator.onLine,
    updateAvailable: false,
    registration: null
  })

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  // Check if PWA is installed
  const checkInstallStatus = useCallback(() => {
    const isInstalled = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://')

    setPwaState(prev => ({ ...prev, isInstalled }))
  }, [])

  // Handle before install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Don't prevent default - let the browser handle it naturally
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      setPwaState(prev => ({ ...prev, canInstall: true }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Handle app installed
  useEffect(() => {
    const handleAppInstalled = () => {
      setPwaState(prev => ({ 
        ...prev, 
        isInstalled: true, 
        canInstall: false 
      }))
      setDeferredPrompt(null)
      
      // Track installation
      if (typeof window !== 'undefined' && 'gtag' in window) {
        ;(window as any).gtag('event', 'pwa_install', {
          event_category: 'PWA',
          event_label: 'App Installed'
        })
      }
    }

    window.addEventListener('appinstalled', handleAppInstalled)
    
    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setPwaState(prev => ({ ...prev, isOnline: true }))
    }

    const handleOffline = () => {
      setPwaState(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Initialize PWA status
  useEffect(() => {
    checkInstallStatus()
  }, [checkInstallStatus])

  // Install PWA
  const installPWA = useCallback(async () => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        setPwaState(prev => ({ ...prev, canInstall: false }))
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error installing PWA:', error)
      return false
    }
  }, [deferredPrompt])

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported')
      return null
    }

    if (process.env.NODE_ENV === 'development') {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((registration) => registration.unregister()))
      } catch (error) {
        console.warn('Failed to unregister service workers in development:', error)
      }
      return null
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('Service Worker registered:', registration)

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setPwaState(prev => ({ ...prev, updateAvailable: true }))
            }
          })
        }
      })

      setPwaState(prev => ({ ...prev, registration }))
      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return null
    }
  }, [])

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Notifications not supported')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }, [])

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async () => {
    if (!pwaState.registration) {
      console.log('Service Worker not registered')
      return null
    }

    try {
      const permission = await requestNotificationPermission()
      if (!permission) {
        console.log('Notification permission denied')
        return null
      }

      const subscription = await pwaState.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      })

      console.log('Push subscription:', subscription)
      return subscription
    } catch (error) {
      console.error('Error subscribing to push:', error)
      return null
    }
  }, [pwaState.registration, requestNotificationPermission])

  // Send push notification (for testing)
  const sendTestNotification = useCallback(() => {
    if (Notification.permission === 'granted') {
      new Notification('Campus Gem Ministries', {
        body: 'This is a test notification from your church management system.',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: 'test-notification'
      })
    }
  }, [])

  return {
    ...pwaState,
    installPWA,
    registerServiceWorker,
    requestNotificationPermission,
    subscribeToPush,
    sendTestNotification,
    checkInstallStatus
  }
}
