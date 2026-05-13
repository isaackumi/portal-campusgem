'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, ArrowLeft } from 'lucide-react'

export default function FinancialPaymentsPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <Card className="border-sky-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-sky-600" />
              <CardTitle>Payments</CardTitle>
            </div>
            <CardDescription>
              General church payments and reconciliation — separate from camp registration fees.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              For <strong>Camp Meeting</strong> fee tracking and QR check-in, use{' '}
              <Link className="font-medium text-primary underline" href="/admin/camp-meeting/payments">
                Admin → Camp → Payments
              </Link>
              .
            </p>
            <Button asChild variant="outline">
              <Link href="/admin/camp-meeting/payments">Open camp payments</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
