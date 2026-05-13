'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, ArrowLeft } from 'lucide-react'

export default function CommunicationNotificationsPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <Card className="border-indigo-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-6 w-6 text-indigo-600" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Where automated and manual notices are configured.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Camp meeting SMS and email templates are managed under Camp admin. If you do not see that link,
              ask an administrator for the <strong>camp.settings</strong> role.
            </p>
            <Button asChild variant="outline">
              <Link href="/admin/camp-meeting/notifications">Camp notification settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
