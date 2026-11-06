import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { BarChart3, FileBarChart, Users } from 'lucide-react'

export default function FinancialReportsPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="app-page-title">Financial reports</h1>
          <p className="app-page-description mt-1">Summaries for leadership and auditors.</p>
        </div>
        <section className="dashboard-panel p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 dark:text-neutral-400">
              <FileBarChart className="h-4 w-4" aria-hidden />
            </span>
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              Custom financial reports are coming soon. Until then, attendance and membership exports are available from their own pages.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button asChild variant="outline" className="h-11 justify-start sm:h-10 sm:justify-center">
            <Link href="/attendance/analytics">
              <BarChart3 className="mr-2 h-4 w-4" aria-hidden />
              Attendance analytics
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 justify-start sm:h-10 sm:justify-center">
            <Link href="/members">
              <Users className="mr-2 h-4 w-4" aria-hidden />
              Members
            </Link>
          </Button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
