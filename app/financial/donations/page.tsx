'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HeartHandshake, ArrowLeft } from 'lucide-react'

export default function FinancialDonationsPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <Card className="border-emerald-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-6 w-6 text-emerald-600" />
              <CardTitle>Donations</CardTitle>
            </div>
            <CardDescription>
              Track tithes, offerings, and special gifts. Full ledger workflows can be wired to your accounting
              tools here when you are ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              This screen replaces the old broken navigation target so staff no longer land on a 404. Use{' '}
              <strong>Camp → Payments</strong> for camp meeting fees, or coordinate with finance for CSV exports
              from your bank.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/financial/payments">Payments</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/financial/reports">Reports</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
