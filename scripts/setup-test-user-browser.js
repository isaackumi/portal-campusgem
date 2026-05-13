// Browser script to set up test user for client-side authentication
// Run this in the browser console to set up authentication

// Test user data (matching the TestUser interface)
const testUser = {
  id: "5f958b2d-d241-4895-9381-c2b5ab8a7f31",
  full_name: "System Administrator",
  role: "admin",
  phone: "+233548769251",
  auth_uid: "test-auth-uid-12345"
}

// Set up authentication in localStorage using the correct key
localStorage.setItem('campus_gem_test_user', JSON.stringify(testUser))

// Also set up Supabase session for compatibility
localStorage.setItem('sb-access-token', 'test-token-12345')
localStorage.setItem('sb-refresh-token', 'test-refresh-token-12345')

console.log('✅ Test user setup complete!')
console.log('User:', testUser)
console.log('Key used: campus_gem_test_user')

// Dispatch the custom event to notify the auth provider
window.dispatchEvent(new CustomEvent('testUserChanged', { detail: testUser }))

// Reload the page to apply changes
window.location.reload()