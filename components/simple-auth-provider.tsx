'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppUser } from '@/lib/types'
import { getTestUser, clearTestUser, setTestUser, TestUser } from '@/lib/auth-utils'
import { hasPermission, type Permission } from '@/lib/auth/roles'

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  /** True when the signed-in user holds `permission` via role or per-user grant. */
  can: (permission: Permission) => boolean
  /** Re-read the user from the server (role / permission changes). */
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/** Re-validate at most this often when the tab regains focus. */
const FOCUS_REFRESH_MS = 60_000

function sameUser(a: TestUser | null, b: TestUser | null): boolean {
  if (!a || !b) return a === b
  return (
    a.id === b.id &&
    a.role === b.role &&
    a.full_name === b.full_name &&
    (a.permissions ?? []).join(',') === (b.permissions ?? []).join(',')
  )
}

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const lastRefresh = useRef(0)

  const refresh = useCallback(async () => {
    lastRefresh.current = Date.now()
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' })
      if (res.status === 401) {
        // Session cookie missing or user removed: drop the stale local copy.
        if (getTestUser()) clearTestUser()
        setUser(null)
        return
      }
      if (!res.ok) {
        // Can't verify and nothing cached: clear the cookie so /auth doesn't bounce back here.
        if (!getTestUser()) await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
        return
      }
      const data = (await res.json()) as { user?: TestUser | null }
      if (data.user && !sameUser(getTestUser(), data.user)) {
        setTestUser(data.user)
      }
    } catch {
      // Offline / transient: keep the cached user.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const cached = getTestUser()
    setUser(cached ? (cached as AppUser) : null)
    // Render immediately from cache; the server check below corrects role changes.
    if (cached) setLoading(false)
    void refresh()

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'campus_gem_test_user' || e.key === 'emmanuel_assembly_test_user') {
        const next = getTestUser()
        setUser(next ? (next as AppUser) : null)
      }
    }

    const handleTestUserChange = (e: CustomEvent) => {
      setUser(e.detail ? (e.detail as AppUser) : null)
    }

    const handleFocus = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastRefresh.current < FOCUS_REFRESH_MS) return
      if (!getTestUser()) return
      void refresh()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('testUserChanged', handleTestUserChange as EventListener)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('testUserChanged', handleTestUserChange as EventListener)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [refresh])

  const can = useCallback(
    (permission: Permission) =>
      Boolean(user && hasPermission(user.role, permission, user.permissions)),
    [user]
  )

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Error clearing auth cookie:', error)
    }
    clearTestUser()
    setUser(null)
    if (typeof window !== 'undefined') {
      window.location.href = '/auth'
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, can, refresh, signOut }),
    [user, loading, can, refresh, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a SimpleAuthProvider')
  }
  return context
}
