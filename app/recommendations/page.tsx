import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Gift, Heart, UserPlus, Users } from 'lucide-react'

export default function RecommendationsPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="app-page-title">Recommendations</h1>
          <p className="app-page-description mt-1">Pastoral care prompts and follow-up ideas.</p>
        </div>
        <section className="dashboard-panel p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10 dark:bg-brand-400/10 dark:text-brand-300 dark:ring-brand-400/20">
              <Gift className="h-4 w-4" aria-hidden />
            </span>
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              Follow-up starts with the people list. Open a member to call or WhatsApp them in one tap, check the celebrations list for this week&apos;s birthdays and anniversaries, and review RLC visitors who haven&apos;t been contacted yet.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button asChild variant="outline" className="h-11 justify-start sm:h-10 sm:justify-center">
            <Link href="/members">
              <Users className="mr-2 h-4 w-4" aria-hidden />
              Members
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 justify-start sm:h-10 sm:justify-center">
            <Link href="/celebrations">
              <Heart className="mr-2 h-4 w-4" aria-hidden />
              Birthdays &amp; anniversaries
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 justify-start sm:h-10 sm:justify-center">
            <Link href="/admin/rlc/visitors">
              <UserPlus className="mr-2 h-4 w-4" aria-hidden />
              RLC visitors
            </Link>
          </Button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
