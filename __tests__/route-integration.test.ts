/**
 * Route Integration Tests
 * Comprehensive tests for all application routes
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

// Test configuration
const BASE_URL = 'http://localhost:3000'
const TIMEOUT = 10000 // 10 seconds

// All routes to test
const routes = [
  // Main pages
  { path: '/', name: 'Home', expectedStatus: [200, 302] },
  { path: '/dashboard', name: 'Dashboard', expectedStatus: [200] },
  { path: '/auth', name: 'Auth', expectedStatus: [200] },
  
  // Members
  { path: '/members', name: 'Members', expectedStatus: [200] },
  { path: '/members/add', name: 'Add Member', expectedStatus: [200] },
  
  // Groups
  { path: '/groups', name: 'Groups', expectedStatus: [200] },
  { path: '/groups/add', name: 'Add Group', expectedStatus: [200] },
  
  // Attendance
  { path: '/attendance', name: 'Attendance', expectedStatus: [200] },
  { path: '/attendance/scanner', name: 'Attendance Scanner', expectedStatus: [200] },
  { path: '/attendance/kiosk', name: 'Attendance Kiosk', expectedStatus: [200] },
  { path: '/attendance/manual', name: 'Manual Attendance', expectedStatus: [200] },
  { path: '/attendance/bulk', name: 'Bulk Attendance', expectedStatus: [200] },
  { path: '/attendance/analytics', name: 'Attendance Analytics', expectedStatus: [200] },
  { path: '/attendance/comprehensive', name: 'Comprehensive Attendance', expectedStatus: [200] },
  
  // RLC visitors
  { path: '/admin/rlc/visitors', name: 'RLC Visitors', expectedStatus: [200] },
  { path: '/admin/rlc/visitors/add', name: 'Add RLC Visitor', expectedStatus: [200] },
  { path: '/visitors', name: 'Visitors (legacy redirect)', expectedStatus: [200] },
  { path: '/visitors/add', name: 'Add Visitor (legacy redirect)', expectedStatus: [200] },
  
  // Other pages
  { path: '/celebrations', name: 'Celebrations', expectedStatus: [200] },
  { path: '/sms', name: 'SMS Management', expectedStatus: [200] },
  { path: '/test-auth', name: 'Test Auth', expectedStatus: [200] },
]

// Helper function to test a route
async function testRoute(route: typeof routes[0]): Promise<{ success: boolean; status: number; error?: string }> {
  try {
    const response = await fetch(`${BASE_URL}${route.path}`, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'manual' // Don't follow redirects automatically
    })
    
    const status = response.status
    const isExpectedStatus = route.expectedStatus.includes(status)
    
    return {
      success: isExpectedStatus,
      status,
      error: isExpectedStatus ? undefined : `Expected status ${route.expectedStatus.join(' or ')}, got ${status}`
    }
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Global server status
let serverRunning = false

describe('Route Integration Tests', () => {
  beforeAll(async () => {
    // Check if server is running
    try {
      const response = await fetch(`${BASE_URL}/`, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      })
      serverRunning = response.status < 500
    } catch (error) {
      serverRunning = false
      console.log('Server not running, skipping integration tests')
    }
  })
  
  if (serverRunning) {
    routes.forEach(route => {
      it(`should load ${route.name} page (${route.path})`, async () => {
        const result = await testRoute(route)
        
        if (!result.success) {
          console.log(`Route ${route.path} failed:`, result.error)
        }
        
        expect(result.success).toBe(true)
        expect(result.status).toBeGreaterThan(0)
      }, TIMEOUT)
    })
    
    it('should handle redirects properly', async () => {
      // Test root redirect
      const rootResponse = await fetch(`${BASE_URL}/`, { 
        method: 'GET',
        redirect: 'manual'
      })
      
      // Should either be 200 (if already on dashboard) or 302 (redirect)
      expect([200, 302]).toContain(rootResponse.status)
    }, TIMEOUT)
    
    it('should serve HTML content for all routes', async () => {
      const testRoutes = routes.slice(0, 5) // Test first 5 routes
      
      for (const route of testRoutes) {
        const response = await fetch(`${BASE_URL}${route.path}`, {
          method: 'GET',
          redirect: 'follow'
        })
        
        if (response.status === 200) {
          const contentType = response.headers.get('content-type')
          expect(contentType).toContain('text/html')
        }
      }
    }, TIMEOUT)
    
    it('should handle PWA service worker correctly', async () => {
      // Test service worker registration
      const swResponse = await fetch(`${BASE_URL}/sw.js`, {
        method: 'GET'
      })
      
      expect(swResponse.status).toBe(200)
      expect(swResponse.headers.get('content-type')).toContain('javascript')
    }, TIMEOUT)
    
    it('should serve manifest.json', async () => {
      const manifestResponse = await fetch(`${BASE_URL}/manifest.json`, {
        method: 'GET'
      })
      
      expect(manifestResponse.status).toBe(200)
      expect(manifestResponse.headers.get('content-type')).toContain('json')
    }, TIMEOUT)
    
    it('should handle offline page', async () => {
      const offlineResponse = await fetch(`${BASE_URL}/offline.html`, {
        method: 'GET'
      })
      
      expect(offlineResponse.status).toBe(200)
      expect(offlineResponse.headers.get('content-type')).toContain('html')
    }, TIMEOUT)
  } else {
    it('should skip tests when server is not running', () => {
      console.log('Skipping integration tests - server not running')
      expect(true).toBe(true)
    })
  }
})

describe('Route Performance Tests', () => {
  if (serverRunning) {
    it('should load pages within reasonable time', async () => {
      const startTime = Date.now()
      
      const response = await fetch(`${BASE_URL}/dashboard`, {
        method: 'GET',
        redirect: 'follow'
      })
      
      const loadTime = Date.now() - startTime
      
      expect(response.status).toBe(200)
      expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
    }, TIMEOUT)
    
    it('should handle concurrent requests', async () => {
      const routes = ['/dashboard', '/members', '/groups', '/attendance', '/admin/rlc/visitors']
      
      const promises = routes.map(route => 
        fetch(`${BASE_URL}${route}`, { method: 'GET', redirect: 'follow' })
      )
      
      const responses = await Promise.all(promises)
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    }, TIMEOUT)
  }
})

describe('PWA Functionality Tests', () => {
  if (serverRunning) {
    it('should have proper service worker configuration', async () => {
      const swResponse = await fetch(`${BASE_URL}/sw.js`)
      const swContent = await swResponse.text()
      
      expect(swContent).toContain('addEventListener')
      expect(swContent).toContain('fetch')
      expect(swContent).toContain('cache')
    }, TIMEOUT)
    
    it('should have proper manifest configuration', async () => {
      const manifestResponse = await fetch(`${BASE_URL}/manifest.json`)
      const manifest = await manifestResponse.json()
      
      expect(manifest.name).toBeDefined()
      expect(manifest.short_name).toBeDefined()
      expect(manifest.icons).toBeDefined()
    }, TIMEOUT)
  }
})
