'use client'

import { useState, useEffect } from 'react'
import { DashboardPanel } from '@/components/dashboard/panel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Wifi, 
  WifiOff, 
  RefreshCw as Sync, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Users,
  Calendar,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SyncStatus {
  isOnline: boolean
  pendingItems: number
  lastSync: Date | null
  isSyncing: boolean
  errors: string[]
}

interface OfflineQueueItem {
  id: string
  type: 'attendance' | 'member' | 'visitor'
  action: 'create' | 'update' | 'delete'
  data: any
  timestamp: Date
  retries: number
}

export function OfflineSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    pendingItems: 0,
    lastSync: null,
    isSyncing: false,
    errors: []
  })

  const [pendingItems, setPendingItems] = useState<OfflineQueueItem[]>([])
  const { toast } = useToast()

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }))
      toast({
        title: "Back Online",
        description: "Connection restored. Syncing data...",
      })
      void syncPendingItems()
    }

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }))
      toast({
        title: "Offline Mode",
        description: "Working offline. Changes will sync when online.",
        variant: "default"
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load pending items from localStorage
    loadPendingItems()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
    // Intentionally mount-once; toast is a stable module dispatcher
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load pending items from localStorage
  const loadPendingItems = () => {
    try {
      const stored = localStorage.getItem('offlineQueue')
      if (stored) {
        const items = JSON.parse(stored) as OfflineQueueItem[]
        setPendingItems(items)
        setSyncStatus(prev => ({ ...prev, pendingItems: items.length }))
      }

      const lastSync = localStorage.getItem('lastSync')
      if (lastSync) {
        setSyncStatus(prev => ({ ...prev, lastSync: new Date(lastSync) }))
      }
    } catch (error) {
      console.error('Error loading pending items:', error)
    }
  }

  // Save pending items to localStorage
  const savePendingItems = (items: OfflineQueueItem[]) => {
    try {
      localStorage.setItem('offlineQueue', JSON.stringify(items))
      setPendingItems(items)
      setSyncStatus(prev => ({ ...prev, pendingItems: items.length }))
    } catch (error) {
      console.error('Error saving pending items:', error)
    }
  }

  // Add item to offline queue
  const addToOfflineQueue = (item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retries'>) => {
    const newItem: OfflineQueueItem = {
      ...item,
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      retries: 0
    }

    const updatedItems = [...pendingItems, newItem]
    savePendingItems(updatedItems)

    if (syncStatus.isOnline) {
      syncPendingItems()
    }
  }

  // Sync pending items
  const syncPendingItems = async () => {
    if (!syncStatus.isOnline || pendingItems.length === 0) {
      return
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true, errors: [] }))

    const errors: string[] = []
    const remainingItems: OfflineQueueItem[] = []

    for (const item of pendingItems) {
      try {
        await syncItem(item)
      } catch (error) {
        console.error(`Error syncing item ${item.id}:`, error)
        
        if (item.retries < 3) {
          // Retry later
          remainingItems.push({
            ...item,
            retries: item.retries + 1
          })
        } else {
          // Max retries reached
          errors.push(`Failed to sync ${item.type}: ${error}`)
        }
      }
    }

    // Update pending items
    savePendingItems(remainingItems)
    
    // Update last sync time
    localStorage.setItem('lastSync', new Date().toISOString())
    
    setSyncStatus(prev => ({
      ...prev,
      isSyncing: false,
      lastSync: new Date(),
      errors
    }))

    if (errors.length === 0 && remainingItems.length === 0) {
      toast({
        title: "Sync Complete",
        description: "All offline changes have been synchronized.",
      })
    } else if (errors.length > 0) {
      toast({
        title: "Sync Issues",
        description: `${errors.length} items failed to sync. Check the sync status for details.`,
        variant: "destructive"
      })
    }
  }

  // Sync individual item
  const syncItem = async (item: OfflineQueueItem) => {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    let url = ''
    let method = 'POST'

    switch (item.type) {
      case 'attendance':
        url = `${baseUrl}/rest/v1/attendance`
        break
      case 'member':
        if (item.action === 'update') {
          url = `${baseUrl}/rest/v1/members?id=eq.${item.data.id}`
          method = 'PATCH'
        } else {
          url = `${baseUrl}/rest/v1/members`
        }
        break
      case 'visitor':
        url = `${baseUrl}/rest/v1/visitors`
        break
      default:
        throw new Error(`Unknown item type: ${item.type}`)
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey!,
        'Authorization': `Bearer ${apiKey}`
      },
      body: method === 'PATCH' ? JSON.stringify(item.data) : JSON.stringify(item.data)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }

  // Manual sync trigger
  const handleManualSync = () => {
    if (syncStatus.isOnline) {
      syncPendingItems()
    } else {
      toast({
        title: "Offline",
        description: "Cannot sync while offline. Please check your internet connection.",
        variant: "destructive"
      })
    }
  }

  // Clear errors
  const clearErrors = () => {
    setSyncStatus(prev => ({ ...prev, errors: [] }))
  }

  // Get status badge variant
  const getStatusVariant = () => {
    if (syncStatus.isOnline && syncStatus.pendingItems === 0) return 'success' as const
    if (syncStatus.isOnline) return 'warning' as const
    return 'danger' as const
  }

  // Get status text
  const getStatusText = () => {
    if (!syncStatus.isOnline) {
      return 'Offline'
    } else if (syncStatus.pendingItems === 0) {
      return 'Synced'
    } else if (syncStatus.isSyncing) {
      return 'Syncing...'
    } else {
      return `${syncStatus.pendingItems} Pending`
    }
  }

  return (
    <DashboardPanel
      title="Offline sync"
      action={
        <Badge variant={getStatusVariant()}>
          {syncStatus.isOnline ? (
            <Wifi className="h-3 w-3" aria-hidden />
          ) : (
            <WifiOff className="h-3 w-3" aria-hidden />
          )}
          {getStatusText()}
        </Badge>
      }
    >
      <div className="space-y-4 py-3">
        <dl className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-neutral-400" aria-hidden />
            <dt className="text-[13px] text-neutral-500 dark:text-neutral-400">Last sync</dt>
            <dd className="text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
              {syncStatus.lastSync ? syncStatus.lastSync.toLocaleTimeString() : 'Never'}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-neutral-400" aria-hidden />
            <dt className="text-[13px] text-neutral-500 dark:text-neutral-400">Pending</dt>
            <dd className="text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
              {syncStatus.pendingItems}
            </dd>
          </div>
        </dl>

        {/* Pending Items */}
        {pendingItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-neutral-700 dark:text-neutral-300">Pending Changes:</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {pendingItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs bg-neutral-50 dark:bg-neutral-800 rounded-md p-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-neutral-500 dark:text-neutral-400" />
                    <span className="capitalize">{item.type}</span>
                    <span className="text-neutral-500 dark:text-neutral-400">•</span>
                    <span className="capitalize">{item.action}</span>
                  </div>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {item.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {pendingItems.length > 5 && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                  +{pendingItems.length - 5} more items
                </p>
              )}
            </div>
          </div>
        )}

        {/* Errors */}
        {syncStatus.errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Sync Errors
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearErrors}
                className="text-xs h-6 px-2"
              >
                Clear
              </Button>
            </div>
            <div className="space-y-1">
              {syncStatus.errors.slice(0, 3).map((error, index) => (
                <p key={index} className="text-xs text-red-600 bg-red-50 rounded-md p-2">
                  {error}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleManualSync}
            disabled={!syncStatus.isOnline || syncStatus.isSyncing}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            {syncStatus.isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Sync className="h-4 w-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardPanel>
  )
}
