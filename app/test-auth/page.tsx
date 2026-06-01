'use client'

import { useAuth } from '@/components/providers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { setTestUser as setTestUserUtil, clearTestUser as clearTestUserUtil, getTestUser } from '@/lib/auth-utils'

export default function TestAuthPage() {
  const { user, loading } = useAuth()

  const setTestUser = () => {
    const testUser = {
      id: '5f958b2d-d241-4895-9381-c2b5ab8a7f31',
      full_name: 'System Administrator',
      role: 'admin',
      phone: '+233548769251',
      auth_uid: '36cdaf38-a853-45a9-93c8-19bc9e207ec9'
    }
    setTestUserUtil(testUser)
    console.log('Test user set manually')
    window.location.reload()
  }

  const clearTestUser = () => {
    clearTestUserUtil()
    console.log('Test user cleared')
    window.location.reload()
  }

  const checkLocalStorage = () => {
    const testUser = getTestUser()
    console.log('localStorage check:', testUser)
    alert(`Test User: ${testUser ? JSON.stringify(testUser, null, 2) : 'null'}`)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Auth Test Page</CardTitle>
            <CardDescription>
              Debug authentication state and localStorage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-100 rounded-lg">
              <h3 className="font-semibold mb-2">Current Auth State:</h3>
              <p><strong>Loading:</strong> {loading ? 'true' : 'false'}</p>
              <p><strong>User:</strong> {user ? JSON.stringify(user, null, 2) : 'null'}</p>
            </div>

            <div className="space-y-2">
              <Button onClick={setTestUser} className="w-full">
                Set Test User in localStorage
              </Button>
              
              <Button onClick={clearTestUser} variant="outline" className="w-full">
                Clear Test User from localStorage
              </Button>
              
              <Button onClick={checkLocalStorage} variant="secondary" className="w-full">
                Check localStorage Contents
              </Button>
            </div>

            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold mb-2">Instructions:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Click "Set Test User in localStorage"</li>
                <li>Page will reload automatically</li>
                <li>Check if user is now populated</li>
                <li>If not, check browser console for errors</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
