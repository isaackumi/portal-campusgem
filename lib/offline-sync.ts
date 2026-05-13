/**
 * Offline sync utilities for the Church Management System
 * Handles IndexedDB storage and background sync for offline functionality
 */

import { Attendance, OfflineQueueItem } from '@/lib/types'

const DB_NAME = 'CampusGemMinistriesDB'
const DB_VERSION = 1
const STORE_NAMES = {
  ATTENDANCE_QUEUE: 'attendanceQueue',
  SYNC_STATUS: 'syncStatus',
  CACHED_DATA: 'cachedData'
} as const

interface SyncStatus {
  lastSync: number
  isOnline: boolean
  pendingItems: number
}

class OfflineSyncManager {
  private db: IDBDatabase | null = null
  private isOnline = navigator.onLine
  private syncInProgress = false

  constructor() {
    this.initDB()
    this.setupEventListeners()
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create attendance queue store
        if (!db.objectStoreNames.contains(STORE_NAMES.ATTENDANCE_QUEUE)) {
          const attendanceStore = db.createObjectStore(STORE_NAMES.ATTENDANCE_QUEUE, {
            keyPath: 'client_uuid',
            autoIncrement: false
          })
          attendanceStore.createIndex('created_at', 'created_at')
          attendanceStore.createIndex('status', 'status')
        }

        // Create sync status store
        if (!db.objectStoreNames.contains(STORE_NAMES.SYNC_STATUS)) {
          db.createObjectStore(STORE_NAMES.SYNC_STATUS, {
            keyPath: 'key',
            autoIncrement: false
          })
        }

        // Create cached data store
        if (!db.objectStoreNames.contains(STORE_NAMES.CACHED_DATA)) {
          db.createObjectStore(STORE_NAMES.CACHED_DATA, {
            keyPath: 'key',
            autoIncrement: false
          })
        }
      }
    })
  }

  private setupEventListeners(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true
      this.updateSyncStatus({ isOnline: true })
      this.syncPendingItems()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.updateSyncStatus({ isOnline: false })
    })

    // Periodic sync when online
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingItems()
      }
    }, 30000) // Sync every 30 seconds
  }

  private async updateSyncStatus(updates: Partial<SyncStatus>): Promise<void> {
    if (!this.db) return

    const transaction = this.db.transaction([STORE_NAMES.SYNC_STATUS], 'readwrite')
    const store = transaction.objectStore(STORE_NAMES.SYNC_STATUS)
    
    const currentStatus = await this.getSyncStatus()
    const newStatus = { ...currentStatus, ...updates }
    
    store.put(newStatus)
  }

  private async getSyncStatus(): Promise<SyncStatus> {
    if (!this.db) return { lastSync: 0, isOnline: this.isOnline, pendingItems: 0 }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAMES.SYNC_STATUS], 'readonly')
      const store = transaction.objectStore(STORE_NAMES.SYNC_STATUS)
      const request = store.get('main')

      request.onsuccess = () => {
        const status = request.result || { lastSync: 0, isOnline: this.isOnline, pendingItems: 0 }
        resolve(status)
      }
      request.onerror = () => {
        resolve({ lastSync: 0, isOnline: this.isOnline, pendingItems: 0 })
      }
    })
  }

  /**
   * Add attendance record to offline queue
   */
  async queueAttendance(attendance: Omit<Attendance, 'id' | 'created_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const queueItem: OfflineQueueItem = {
      id: crypto.randomUUID(),
      client_uuid: attendance.client_uuid || crypto.randomUUID(),
      table_name: 'attendance',
      operation: 'INSERT',
      data: attendance,
      created_at: new Date().toISOString(),
      retry_count: 0
    }

    const transaction = this.db.transaction([STORE_NAMES.ATTENDANCE_QUEUE], 'readwrite')
    const store = transaction.objectStore(STORE_NAMES.ATTENDANCE_QUEUE)
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add(queueItem)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    // Update pending items count
    const pendingCount = await this.getPendingItemsCount()
    await this.updateSyncStatus({ pendingItems: pendingCount })

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncPendingItems()
    }
  }

  /**
   * Get all pending items in the queue
   */
  async getPendingItems(): Promise<OfflineQueueItem[]> {
    if (!this.db) return []

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAMES.ATTENDANCE_QUEUE], 'readonly')
      const store = transaction.objectStore(STORE_NAMES.ATTENDANCE_QUEUE)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve([])
    })
  }

  /**
   * Get count of pending items
   */
  private async getPendingItemsCount(): Promise<number> {
    const items = await this.getPendingItems()
    return items.length
  }

  /**
   * Remove item from queue after successful sync
   */
  private async removeQueueItem(clientUuid: string): Promise<void> {
    if (!this.db) return

    const transaction = this.db.transaction([STORE_NAMES.ATTENDANCE_QUEUE], 'readwrite')
    const store = transaction.objectStore(STORE_NAMES.ATTENDANCE_QUEUE)
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(clientUuid)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Increment retry count for failed item
   */
  private async incrementRetryCount(clientUuid: string): Promise<void> {
    if (!this.db) return

    const transaction = this.db.transaction([STORE_NAMES.ATTENDANCE_QUEUE], 'readwrite')
    const store = transaction.objectStore(STORE_NAMES.ATTENDANCE_QUEUE)
    
    const getRequest = store.get(clientUuid)
    getRequest.onsuccess = () => {
      const item = getRequest.result
      if (item && item.retry_count < 5) {
        item.retry_count += 1
        store.put(item)
      }
    }
  }

  /**
   * Sync pending items to server
   */
  async syncPendingItems(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return

    this.syncInProgress = true
    const pendingItems = await this.getPendingItems()

    if (pendingItems.length === 0) {
      this.syncInProgress = false
      return
    }

    try {
      for (const item of pendingItems) {
        try {
          const response = await fetch('/api/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              table_name: item.table_name,
              operation: item.operation,
              data: item.data,
              client_uuid: item.client_uuid
            })
          })

          if (response.ok) {
            await this.removeQueueItem(item.client_uuid)
          } else {
            await this.incrementRetryCount(item.client_uuid)
          }
        } catch (error) {
          console.error('Sync error for item:', item.client_uuid, error)
          await this.incrementRetryCount(item.client_uuid)
        }
      }

      // Update sync status
      await this.updateSyncStatus({ 
        lastSync: Date.now(),
        pendingItems: await this.getPendingItemsCount()
      })

    } catch (error) {
      console.error('Sync process error:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Cache data for offline access
   */
  async cacheData(key: string, data: any, ttl: number = 300000): Promise<void> {
    if (!this.db) return

    const cacheItem = {
      key,
      data,
      timestamp: Date.now(),
      ttl
    }

    const transaction = this.db.transaction([STORE_NAMES.CACHED_DATA], 'readwrite')
    const store = transaction.objectStore(STORE_NAMES.CACHED_DATA)
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(cacheItem)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get cached data
   */
  async getCachedData(key: string): Promise<any> {
    if (!this.db) return null

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAMES.CACHED_DATA], 'readonly')
      const store = transaction.objectStore(STORE_NAMES.CACHED_DATA)
      const request = store.get(key)

      request.onsuccess = () => {
        const item = request.result
        if (item && (Date.now() - item.timestamp) < item.ttl) {
          resolve(item.data)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => resolve(null)
    })
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    if (!this.db) return

    const transaction = this.db.transaction([STORE_NAMES.CACHED_DATA], 'readwrite')
    const store = transaction.objectStore(STORE_NAMES.CACHED_DATA)
    const request = store.getAll()

    request.onsuccess = () => {
      const items = request.result
      const now = Date.now()
      
      items.forEach(item => {
        if ((now - item.timestamp) >= item.ttl) {
          store.delete(item.key)
        }
      })
    }
  }

  /**
   * Get sync status for UI
   */
  async getStatus(): Promise<Omit<SyncStatus, 'pendingItems'> & { pendingItems: OfflineQueueItem[] }> {
    const syncStatus = await this.getSyncStatus()
    const pendingItems = await this.getPendingItems()
    
    return {
      lastSync: syncStatus.lastSync,
      isOnline: syncStatus.isOnline,
      pendingItems
    }
  }

  /**
   * Force sync all pending items
   */
  async forceSync(): Promise<void> {
    await this.syncPendingItems()
  }

  /**
   * Clear all offline data
   */
  async clearAllData(): Promise<void> {
    if (!this.db) return

    const stores = Object.values(STORE_NAMES)
    
    for (const storeName of stores) {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      store.clear()
    }
  }
}

// Create singleton instance
export const offlineSync = new OfflineSyncManager()

// Export types
export type { SyncStatus, OfflineQueueItem }
