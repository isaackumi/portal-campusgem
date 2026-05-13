/**
 * Simple authentication utilities for testing
 * This bypasses production auth for development/testing purposes
 */

export interface TestUser {
  id: string
  full_name: string
  role: string
  phone?: string
  auth_uid: string
  membership_id?: string
}

const TEST_USER_KEY = 'campus_gem_test_user'
const LEGACY_TEST_USER_KEY = 'emmanuel_assembly_test_user'

export function setTestUser(user: TestUser): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TEST_USER_KEY, JSON.stringify(user))
    localStorage.removeItem(LEGACY_TEST_USER_KEY)
    window.dispatchEvent(new CustomEvent('testUserChanged', { detail: user }))
  }
}

export function getTestUser(): TestUser | null {
  if (typeof window === 'undefined') return null

  try {
    const userStr =
      localStorage.getItem(TEST_USER_KEY) ?? localStorage.getItem(LEGACY_TEST_USER_KEY)
    if (!userStr) return null
    const user = JSON.parse(userStr) as TestUser
    if (localStorage.getItem(LEGACY_TEST_USER_KEY)) {
      localStorage.setItem(TEST_USER_KEY, userStr)
      localStorage.removeItem(LEGACY_TEST_USER_KEY)
    }
    return user
  } catch {
    return null
  }
}

export function clearTestUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TEST_USER_KEY)
    localStorage.removeItem(LEGACY_TEST_USER_KEY)
    window.dispatchEvent(new CustomEvent('testUserChanged', { detail: null }))
  }
}

export function isTestMode(): boolean {
  return typeof window !== 'undefined' && getTestUser() !== null
}
