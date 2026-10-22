'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { canAccessPath } from '@/lib/auth/roles'
import { HorizontalScrollStrip, horizontalScrollItemClass } from '@/components/ui/horizontal-scroll-strip'
import { cn } from '@/lib/utils'

const adminLinks = [
  { href: '/admin', label: 'Overview', match: (path: string) => path === '/admin' },
  {
    href: '/admin/rlc',
    label: 'RLC',
    match: (path: string) => path.startsWith('/admin/rlc'),
  },
  {
    href: '/admin/camp-meeting',
    label: 'Camp',
    match: (path: string) => path.startsWith('/admin/camp-meeting'),
  },
  {
    href: '/admin/campus-activities',
    label: 'Campus',
    match: (path: string) => path === '/admin/campus-activities',
  },
  {
    href: '/admin/corporate-gem',
    label: 'Corporate Gem',
    match: (path: string) => path === '/admin/corporate-gem',
  },
  { href: '/admin/forms', label: 'Forms', match: (path: string) => path.startsWith('/admin/forms') },
  { href: '/admin/users', label: 'Users', match: (path: string) => path === '/admin/users' },
  { href: '/admin/admins', label: 'Access & roles', match: (path: string) => path === '/admin/admins' },
  { href: '/admin/groups', label: 'Groups', match: (path: string) => path === '/admin/groups' },
]

export function AdminContextNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  // Only show tabs the user can actually open (role + per-user grants).
  const links = adminLinks.filter((link) => canAccessPath(user?.role, link.href, user?.permissions))

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800 sm:mb-6">
      <HorizontalScrollStrip innerClassName="gap-1.5 px-2 py-2 sm:flex-wrap sm:overflow-visible">
        {links.map((link) => {
          const isActive = link.match(pathname)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                horizontalScrollItemClass,
                'rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors sm:py-2',
                isActive
                  ? 'bg-brand-700/10 text-brand-700 dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-white'
              )}
            >
              {link.label}
            </Link>
          )
        })}
      </HorizontalScrollStrip>
    </div>
  )
}
