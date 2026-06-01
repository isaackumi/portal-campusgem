'use client'

import { useRouter } from 'next/navigation'
import { BrandMark } from '@/components/brand-mark'
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
  Phone,
} from 'lucide-react'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="mb-2 text-6xl font-semibold tracking-tight text-slate-900">404</h1>
          <h2 className="mb-2 text-2xl font-semibold text-slate-700">Page not found</h2>
          <p className="text-slate-600">The page you&apos;re looking for doesn&apos;t exist or was moved.</p>
        </div>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-slate-900">Let&apos;s get you back on track</CardTitle>
            <CardDescription>Quick links to common areas of the portal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Button onClick={() => router.push('/dashboard')} className="h-16 flex-col gap-2">
                <Home className="h-6 w-6" />
                <span>Go to dashboard</span>
              </Button>

              <Button variant="outline" onClick={() => router.back()} className="h-16 flex-col gap-2">
                <ArrowLeft className="h-6 w-6" />
                <span>Go back</span>
              </Button>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="mb-4 flex items-center font-semibold text-slate-900">
                <Search className="mr-2 h-5 w-5 text-amber-500" />
                Popular pages
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { label: 'Members', href: '/members' },
                  { label: 'Attendance', href: '/attendance' },
                  { label: 'Groups', href: '/groups' },
                  { label: 'Visitors', href: '/visitors' },
                ].map((item) => (
                  <Button
                    key={item.href}
                    variant="ghost"
                    onClick={() => router.push(item.href)}
                    className="h-12 justify-start text-left"
                  >
                    <span className="text-sm">{item.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="mb-4 flex items-center font-semibold text-slate-900">
                <HelpCircle className="mr-2 h-5 w-5 text-amber-500" />
                Need help?
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <Mail className="h-5 w-5 text-slate-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Email support</p>
                    <p className="text-xs text-slate-600">support@church.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <Phone className="h-5 w-5 text-slate-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Phone support</p>
                    <p className="text-xs text-slate-600">+233 XX XXX XXXX</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh page
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex items-center justify-center gap-3 text-center">
          <BrandMark size="sm" />
          <div>
            <p className="text-sm text-slate-600">Campus Gem Ministries</p>
            <p className="text-xs text-slate-400">Kokomlemle, Accra</p>
          </div>
        </div>
      </div>
    </div>
  )
}
