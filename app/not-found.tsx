'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Home,
  ArrowLeft,
  Search,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  Mail,
  Phone
} from 'lucide-react'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
            404
          </h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Page Not Found
          </h2>
          <p className="text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-gray-900">
              Let's Get You Back on Track
            </CardTitle>
            <CardDescription>
              Here are some helpful options to get you where you need to go
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                onClick={() => router.push('/dashboard')}
                className="h-16 flex-col space-y-2 bg-blue-600 hover:bg-blue-700"
              >
                <Home className="h-6 w-6" />
                <span>Go to Dashboard</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => router.back()}
                className="h-16 flex-col space-y-2"
              >
                <ArrowLeft className="h-6 w-6" />
                <span>Go Back</span>
              </Button>
            </div>

            {/* Popular Pages */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Search className="h-5 w-5 mr-2 text-blue-600" />
                Popular Pages
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/members')}
                  className="justify-start h-12 text-left"
                >
                  <span className="text-sm">Members Management</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push('/attendance')}
                  className="justify-start h-12 text-left"
                >
                  <span className="text-sm">Attendance Records</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push('/groups')}
                  className="justify-start h-12 text-left"
                >
                  <span className="text-sm">Groups & Ministries</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push('/visitors')}
                  className="justify-start h-12 text-left"
                >
                  <span className="text-sm">Visitor Management</span>
                </Button>
              </div>
            </div>

            {/* Help Section */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <HelpCircle className="h-5 w-5 mr-2 text-blue-600" />
                Need Help?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email Support</p>
                    <p className="text-xs text-gray-600">support@church.com</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Phone Support</p>
                    <p className="text-xs text-gray-600">+233 XX XXX XXXX</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Refresh Option */}
            <div className="border-t pt-6">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Campus Gem Ministries
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Odorkor Area, Gbawe CP District
          </p>
        </div>
      </div>
    </div>
  )
}
