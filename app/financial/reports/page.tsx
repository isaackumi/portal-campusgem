'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileBarChart, ArrowLeft } from 'lucide-react'

export default function FinancialReportsPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <Card className="border-amber-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileBarChart className="h-6 w-6 text-amber-600" />
              <CardTitle>Financial reports</CardTitle>
            </div>
            <CardDescription>Export-friendly summaries for leadership and auditors.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Use attendance and membership exports from their respective modules until custom reports ship.</p>
            <Button asChild variant="outline">
              <Link href="/attendance/analytics">Attendance analytics</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
