// Jest setup file
import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithOtp: jest.fn(() => Promise.resolve({ data: null, error: null })),
      verifyOtp: jest.fn(() => Promise.resolve({ data: null, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
}))

// Mock crypto for tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-1234',
  },
})

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      createObjectStore: jest.fn(),
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          add: jest.fn(),
          get: jest.fn(),
          put: jest.fn(),
          delete: jest.fn(),
          clear: jest.fn(),
        })),
      })),
    },
  })),
}

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
})

// Mock window.location
delete window.location
window.location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
}

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

// Mock fetch — enough shape for route / trailing-slash tests when dev server is not running
global.fetch = jest.fn((input, init) => {
  const url =
    typeof input === 'string'
      ? input
      : input && typeof input === 'object' && 'url' in input
        ? String((input).url)
        : String(input)
  const pathname = (() => {
    try {
      return new URL(url).pathname
    } catch {
      return url
    }
  })()
  const redirectManual = init && init.redirect === 'manual'
  const trailingRoots = ['/visitors', '/members', '/groups', '/attendance', '/celebrations', '/sms']
  const wantsTrailingRedirect =
    redirectManual && trailingRoots.some((r) => pathname === `${r}/`)

  const htmlHeaders = {
    get: (name) => (String(name).toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null),
  }

  if (wantsTrailingRedirect) {
    const base = pathname.replace(/\/$/, '')
    return Promise.resolve({
      ok: false,
      status: 308,
      headers: {
        get: (name) => (String(name).toLowerCase() === 'location' ? `http://localhost:3000${base}` : null),
      },
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  }

  return Promise.resolve({
    ok: true,
    status: 200,
    headers: htmlHeaders,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('<!DOCTYPE html><html><head></head><body></body></html>'),
  })
})
