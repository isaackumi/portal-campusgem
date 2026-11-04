import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Settings, ShieldCheck, Users } from 'lucide-react'

export default function SettingsGeneralPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="app-page-title">General settings</h1>
          <p className="app-page-description mt-1">Church name, locale and defaults.</p>
        </div>
        <section className="dashboard-panel p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10 dark:bg-brand-400/10 dark:text-brand-300 dark:ring-brand-400/20">
              <Settings className="h-4 w-4" aria-hidden />
            </span>
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              Church-wide preferences will appear here. Account access and roles are managed under Access &amp; roles.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button asChild variant="outline" className="h-11 justify-start sm:h-10 sm:justify-center">
            <Link href="/admin/admins">
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
              Access &amp; roles
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 justify-start sm:h-10 sm:justify-center">
            <Link href="/admin/users">
              <Users className="mr-2 h-4 w-4" aria-hidden />
              Users
            </Link>
          </Button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
