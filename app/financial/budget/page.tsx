'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PieChart, ArrowLeft } from 'lucide-react'

export default function FinancialBudgetPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <Card className="border-violet-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="h-6 w-6 text-violet-600" />
              <CardTitle>Budget</CardTitle>
            </div>
            <CardDescription>Plan income and expenses by ministry or fiscal year.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Placeholder hub so the sidebar link resolves. When you add a budgeting module, mount it here
              without changing navigation.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
