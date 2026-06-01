'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
      syncPendingItems()
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
  }, [toast])

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
    if (syncStatus.isOnline && syncStatus.pendingItems === 0) {
      return 'default' // green
    } else if (syncStatus.isOnline && syncStatus.pendingItems > 0) {
      return 'secondary' // yellow
    } else {
      return 'destructive' // red
    }
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
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {syncStatus.isOnline ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}
              Offline Sync
            </CardTitle>
            <CardDescription>
              Manage offline data synchronization
            </CardDescription>
          </div>
          <Badge variant={getStatusVariant()}>
            {getStatusText()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <span className="text-slate-600">Last Sync:</span>
            <span className="font-medium">
              {syncStatus.lastSync 
                ? syncStatus.lastSync.toLocaleTimeString()
                : 'Never'
              }
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <span className="text-slate-600">Pending:</span>
            <span className="font-medium">{syncStatus.pendingItems}</span>
          </div>
        </div>

        {/* Pending Items */}
        {pendingItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-slate-700">Pending Changes:</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {pendingItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-slate-500" />
                    <span className="capitalize">{item.type}</span>
                    <span className="text-slate-500">•</span>
                    <span className="capitalize">{item.action}</span>
                  </div>
                  <span className="text-slate-500">
                    {item.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {pendingItems.length > 5 && (
                <p className="text-xs text-slate-500 text-center">
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
                <p key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
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
      </CardContent>
    </Card>
  )
}
