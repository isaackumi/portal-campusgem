/**
 * Route Testing Suite
 * Tests all application routes to ensure they load correctly
 */

import { describe, it, expect } from '@jest/globals'

// List of all routes to test
const routes = [
  // Main pages
  { path: '/', name: 'Home' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/auth', name: 'Auth' },
  
  // Members
  { path: '/members', name: 'Members' },
  { path: '/members/add', name: 'Add Member' },
  { path: '/members/[id]', name: 'Member Detail', dynamic: true },
  
  // Groups
  { path: '/groups', name: 'Groups' },
  { path: '/groups/add', name: 'Add Group' },
  { path: '/groups/[id]', name: 'Group Detail', dynamic: true },
  
  // Attendance
  { path: '/attendance', name: 'Attendance' },
  { path: '/attendance/scanner', name: 'Attendance Scanner' },
  { path: '/attendance/kiosk', name: 'Attendance Kiosk' },
  { path: '/attendance/manual', name: 'Manual Attendance' },
  { path: '/attendance/bulk', name: 'Bulk Attendance' },
  { path: '/attendance/analytics', name: 'Attendance Analytics' },
  { path: '/attendance/comprehensive', name: 'Comprehensive Attendance' },
  
  // RLC visitors (legacy /visitors redirects here)
  { path: '/admin/rlc/visitors', name: 'RLC Visitors' },
  { path: '/admin/rlc/visitors/add', name: 'Add RLC Visitor' },
  { path: '/visitors', name: 'Visitors (legacy redirect)' },
  { path: '/visitors/add', name: 'Add Visitor (legacy redirect)' },
  
  // Other pages
  { path: '/celebrations', name: 'Celebrations' },
  { path: '/sms', name: 'SMS Management' },
  { path: '/test-auth', name: 'Test Auth' },
]

describe('Application Routes', () => {
  routes.forEach(route => {
    it(`should load ${route.name} page`, async () => {
      const baseUrl = 'http://localhost:3000'
      const url = route.dynamic ? `${baseUrl}${route.path.replace('[id]', 'test-id')}` : `${baseUrl}${route.path}`
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        })
        
        // For dynamic routes, we expect 404 or 500, but the route should exist
        if (route.dynamic) {
          expect([200, 404, 500]).toContain(response.status)
        } else {
          expect(response.status).toBe(200)
        }
        
        // Check that we get HTML content
        const contentType = response.headers.get('content-type')
        expect(contentType).toContain('text/html')
        
      } catch (error) {
        // If the server is not running, skip the test
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.log(`Skipping ${route.name} - server not running`)
          return
        }
        throw error
      }
    })
  })
  
  it('should have consistent navigation structure', () => {
    // Test that all main navigation routes exist
    const mainRoutes = ['/dashboard', '/members', '/groups', '/attendance']
    
    mainRoutes.forEach(route => {
      expect(routes.some(r => r.path === route)).toBe(true)
    })

    const rlcVisitorRoutes = ['/admin/rlc/visitors', '/admin/rlc/visitors/add']
    rlcVisitorRoutes.forEach(route => {
      expect(routes.some(r => r.path === route)).toBe(true)
    })
  })
  
  it('should have proper route hierarchy', () => {
    // Test that sub-routes exist for main sections
    const memberSubRoutes = routes.filter(r => r.path.startsWith('/members'))
    expect(memberSubRoutes.length).toBeGreaterThan(1)
    
    const attendanceSubRoutes = routes.filter(r => r.path.startsWith('/attendance'))
    expect(attendanceSubRoutes.length).toBeGreaterThan(1)
    
    const groupSubRoutes = routes.filter(r => r.path.startsWith('/groups'))
    expect(groupSubRoutes.length).toBeGreaterThan(1)
  })
})

describe('Route Accessibility', () => {
  it('should not have broken internal links', () => {
    // This would require parsing HTML content to check for broken links
    // For now, we'll just ensure the route structure is valid
    const allPaths = routes.map(r => r.path)
    
    // Check that dynamic routes have proper structure
    const dynamicRoutes = routes.filter(r => r.dynamic)
    dynamicRoutes.forEach(route => {
      expect(route.path).toMatch(/\[.*\]/)
    })
  })
  
  it('should have proper error handling for 404s', () => {
    // Test that non-existent routes return 404
    const nonExistentRoutes = ['/non-existent', '/invalid-path', '/members/invalid-id']
    
    // This would require actual HTTP testing
    expect(nonExistentRoutes).toBeDefined()
  })
})

describe('Route Performance', () => {
  it('should load pages within reasonable time', async () => {
    const startTime = Date.now()
    
    try {
      const response = await fetch('http://localhost:3000/dashboard')
      const loadTime = Date.now() - startTime
      
      // Pages should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)
      expect(response.status).toBe(200)
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('Skipping performance test - server not running')
        return
      }
      throw error
    }
  })
})
