'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { usePWA } from '@/lib/hooks/use-pwa'

const PWAInstallPrompt = dynamic(
  () =>
    import('@/components/pwa-install-prompt').then((mod) => ({
      default: mod.PWAInstallPrompt,
    })),
  { ssr: false }
)
const PWAInstallButton = dynamic(
  () =>
    import('@/components/pwa-install-prompt').then((mod) => ({
      default: mod.PWAInstallButton,
    })),
  { ssr: false }
)

interface PWAProviderProps {
  children: React.ReactNode
}

export function PWAProvider({ children }: PWAProviderProps) {
  const { registerServiceWorker } = usePWA()

  useEffect(() => {
    // Register service worker
    registerServiceWorker()

    // Add PWA meta tags
    const addPWAMetaTags = () => {
      const existingMeta = document.querySelector('meta[name="theme-color"]')
      if (!existingMeta) {
        const themeColor = document.createElement('meta')
        themeColor.name = 'theme-color'
        themeColor.content = '#1e3a8a'
        document.head.appendChild(themeColor)
      }

      const existingApple = document.querySelector('meta[name="apple-mobile-web-app-capable"]')
      if (!existingApple) {
        const appleCapable = document.createElement('meta')
        appleCapable.name = 'apple-mobile-web-app-capable'
        appleCapable.content = 'yes'
        document.head.appendChild(appleCapable)
      }

      const existingAppleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
      if (!existingAppleStatus) {
        const appleStatus = document.createElement('meta')
        appleStatus.name = 'apple-mobile-web-app-status-bar-style'
        appleStatus.content = 'default'
        document.head.appendChild(appleStatus)
      }

      const existingAppleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')
      if (!existingAppleTitle) {
        const appleTitle = document.createElement('meta')
        appleTitle.name = 'apple-mobile-web-app-title'
        appleTitle.content = 'Campus Gem Ministries'
        document.head.appendChild(appleTitle)
      }
    }

    addPWAMetaTags()

    // Handle online/offline events
    const handleOnline = () => {
      console.log('App is online')
      // Trigger sync if needed
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'ONLINE'
        })
      }
    }

    const handleOffline = () => {
      console.log('App is offline')
      // Show offline indicator
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'OFFLINE'
        })
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Message from service worker:', event.data)

        if (event.data.type === 'CACHE_UPDATED') {
          // Handle cache update
          console.log('Cache updated:', event.data.payload)
        }
      })
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [registerServiceWorker])

  const showInstallUi = process.env.NODE_ENV !== 'development'

  return (
    <>
      {children}
      {showInstallUi ? (
        <>
          <PWAInstallPrompt />
          <PWAInstallButton />
        </>
      ) : null}
    </>
  )
}
