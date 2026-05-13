'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Download, Smartphone, Monitor, Bell, Wifi, WifiOff } from 'lucide-react'
import { usePWA } from '@/lib/hooks/use-pwa'

interface PWAInstallPromptProps {
  onClose?: () => void
  className?: string
}

export function PWAInstallPrompt({ onClose, className }: PWAInstallPromptProps) {
  const {
    isInstalled,
    canInstall,
    isOnline,
    installPWA,
    sendTestNotification,
    requestNotificationPermission
  } = usePWA()

  const [isVisible, setIsVisible] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  // Show prompt if PWA can be installed and isn't already installed
  useEffect(() => {
    if (canInstall && !isInstalled) {
      setIsVisible(true)
    }
  }, [canInstall, isInstalled])

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      const success = await installPWA()
      if (success) {
        setIsVisible(false)
        onClose?.()
      }
    } catch (error) {
      console.error('Installation failed:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  const handleEnableNotifications = async () => {
    await requestNotificationPermission()
    sendTestNotification()
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 ${className}`}>
      <Card className="w-full max-w-md bg-white shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Install Campus Gem Ministries
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Get quick access to your church management system
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-700">
                Access from your home screen
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <Monitor className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-700">
                Works like a native app
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-700">
                Get notifications for updates
              </span>
            </div>
            <div className="flex items-center space-x-3">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}
              <span className="text-sm text-gray-700">
                Works offline
              </span>
            </div>
          </div>

          {/* Status */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isInstalling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Installing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Install App
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleEnableNotifications}
              className="w-full"
            >
              <Bell className="h-4 w-4 mr-2" />
              Enable Notifications
            </Button>
          </div>

          {/* Footer */}
          <p className="text-xs text-gray-500 text-center">
            This will add Campus Gem Ministries to your device for quick access.
          </p>
        </CardContent>
      </Card >
    </div >
  )
}

// Floating install button for when prompt is dismissed
export function PWAInstallButton() {
  const { canInstall, isInstalled, installPWA } = usePWA()
  const [isInstalling, setIsInstalling] = useState(false)

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      await installPWA()
    } catch (error) {
      console.error('Installation failed:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  if (!canInstall || isInstalled) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Button
        onClick={handleInstall}
        disabled={isInstalling}
        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-full w-14 h-14 p-0"
      >
        {isInstalling ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        ) : (
          <Download className="h-5 w-5" />
        )}
      </Button>
    </div>
  )
}
