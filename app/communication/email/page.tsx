'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, ArrowLeft, MessageSquare } from 'lucide-react'

export default function CommunicationEmailPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              <CardTitle>Email</CardTitle>
            </div>
            <CardDescription>Bulk and transactional email from the church office.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              For urgent outreach to members and guests, SMS is available today. Email broadcasts are often
              coordinated through your provider (Google Workspace, etc.).
            </p>
            <Button asChild>
              <Link href="/sms">
                <MessageSquare className="mr-2 h-4 w-4" />
                Open SMS
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
