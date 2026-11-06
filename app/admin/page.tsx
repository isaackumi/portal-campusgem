'use client'

import Link from 'next/link'
import { Briefcase, Building2, Calendar, ChevronRight, Church, ClipboardList, Cake, Group, Shield, Users } from 'lucide-react'
import { useAuth } from '@/components/providers'
import { canAccessPath } from '@/lib/auth/roles'
import { PageHeader } from '@/components/layout/page-header'

const adminSections = [
  {
    href: '/admin/rlc',
    title: 'Redemption Light Chapel',
    description: 'Mother church — visitors, members, follow-up, attendance, and analytics.',
    icon: Church,
  },
  {
    href: '/admin/camp-meeting',
    title: 'Camp Meeting',
    description: 'Dashboard, registrations, check-in, and camp operations.',
    icon: Calendar,
  },
  {
    href: '/admin/camp-meeting/years',
    title: 'Camp Years',
    description: 'Create camp years and import historical registration data.',
    icon: Calendar,
  },
  {
    href: '/admin/campus-activities',
    title: 'Campus & Activities',
    description: 'Campus fellowships and church-wide events with members and scoped forms.',
    icon: Building2,
  },
  {
    href: '/admin/corporate-gem',
    title: 'Corporate Gem',
    description: 'Graduates and professionals — members, leaders, and registration forms.',
    icon: Briefcase,
  },
  {
    href: '/admin/forms',
    title: 'Forms Hub',
    description: 'Build outreach forms, publish links, and review responses centrally.',
    icon: ClipboardList,
  },
  {
    href: '/admin/birthdays',
    title: 'Birthdays',
    description: 'Upcoming Campus Gem member birthdays — today, this week, or browse by month.',
    icon: Cake,
  },
  {
    href: '/admin/users',
    title: 'User Management',
    description: 'Manage church user accounts and roles.',
    icon: Users,
  },
  {
    href: '/admin/admins',
    title: 'Admin Management',
    description: 'Manage administrator access.',
    icon: Shield,
  },
  {
    href: '/admin/groups',
    title: 'Group Management',
    description: 'Manage campuses, activities, ministries, and small groups.',
    icon: Group,
  },
]

export default function AdminPage() {
  const { user } = useAuth()
  // Only list areas this person can open (role + per-user grants).
  const sections = adminSections.filter((section) => canAccessPath(user?.role, section.href, user?.permissions))

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        className="mb-0"
        title="Administration"
        description="Choose an area to manage church operations and camp meeting data."
      />

      <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link
              key={section.href}
              href={section.href}
              className="dashboard-panel flex min-h-[72px] items-center gap-3 p-3 transition-[box-shadow,border-color] hover:border-neutral-300 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:hover:border-white/[0.12] sm:gap-4 sm:p-5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-500 dark:text-neutral-400">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="app-section-title block">{section.title}</span>
                <span className="app-meta line-clamp-2 block">{section.description}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
