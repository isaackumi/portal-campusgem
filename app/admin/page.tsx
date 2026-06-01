'use client'

import Link from 'next/link'
import { Briefcase, Building2, Calendar, Church, ClipboardList, Group, Shield, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Administration</h1>
        <p className="mt-1 text-muted-foreground">
          Choose an area to manage church operations and camp meeting data.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {adminSections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 text-primary" />
                    {section.title}
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-sm font-medium text-primary">Open</span>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
