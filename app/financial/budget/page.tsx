import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { FileBarChart, PieChart } from 'lucide-react'

export default function FinancialBudgetPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="app-page-title">Budget</h1>
          <p className="app-page-description mt-1">Plan income and expenses by ministry or year.</p>
        </div>
        <section className="dashboard-panel p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10 dark:bg-brand-400/10 dark:text-brand-300 dark:ring-brand-400/20">
              <PieChart className="h-4 w-4" aria-hidden />
            </span>
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              Budget planning is coming soon. This page will hold income and expense plans by ministry and fiscal year.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button asChild variant="outline" className="h-11 justify-start sm:h-10 sm:justify-center">
            <Link href="/financial/reports">
              <FileBarChart className="mr-2 h-4 w-4" aria-hidden />
              Financial reports
            </Link>
          </Button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
