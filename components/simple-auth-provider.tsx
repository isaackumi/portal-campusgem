'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { AppUser } from '@/lib/types'
import { getTestUser, clearTestUser, TestUser } from '@/lib/auth-utils'

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for test user on mount
    const checkUser = () => {
      const testUser = getTestUser()
      if (testUser) {
        console.log('SimpleAuth: Found test user:', testUser)
        setUser(testUser as AppUser)
      } else {
        console.log('SimpleAuth: No test user found')
        setUser(null)
      }
      setLoading(false)
    }

    checkUser()

    // Listen for localStorage changes (other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'campus_gem_test_user' || e.key === 'emmanuel_assembly_test_user') {
        console.log('SimpleAuth: localStorage changed, checking user')
        checkUser()
      }
    }

    // Listen for custom events (same tab)
    const handleTestUserChange = (e: CustomEvent) => {
      console.log('SimpleAuth: testUserChanged event received:', e.detail)
      if (e.detail) {
        setUser(e.detail as AppUser)
      } else {
        setUser(null)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('testUserChanged', handleTestUserChange as EventListener)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('testUserChanged', handleTestUserChange as EventListener)
    }
  }, [])

  const signOut = async () => {
    // Clear the authentication cookie via API
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Error clearing auth cookie:', error)
    }
    
    // Clear localStorage
    clearTestUser()
    setUser(null)
    
    // Redirect to auth page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth'
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a SimpleAuthProvider')
  }
  return context
}
