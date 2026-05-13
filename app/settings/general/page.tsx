'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, ArrowLeft } from 'lucide-react'

export default function SettingsGeneralPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-slate-600" />
              <CardTitle>General settings</CardTitle>
            </div>
            <CardDescription>Church name, locale, and defaults will live here.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>This route is wired so the sidebar no longer 404s. Extend with your preferences UI when ready.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
