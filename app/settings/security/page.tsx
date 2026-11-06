import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Shield, ShieldCheck, Users } from 'lucide-react'

export default function SettingsSecurityPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="app-page-title">Security</h1>
          <p className="app-page-description mt-1">Sessions, sign-in and access.</p>
        </div>
        <section className="dashboard-panel p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 dark:text-neutral-400">
              <Shield className="h-4 w-4" aria-hidden />
            </span>
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              People sign in with their phone number or membership ID, and stay signed in with a secure session cookie. Role or permission changes apply on their next page load, with no need to sign out.
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
