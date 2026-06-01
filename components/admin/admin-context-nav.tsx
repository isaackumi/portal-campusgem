'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  { href: '/admin/admins', label: 'Admins', match: (path: string) => path === '/admin/admins' },
  { href: '/admin/groups', label: 'Groups', match: (path: string) => path === '/admin/groups' },
]

export function AdminContextNav() {
  const pathname = usePathname()

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm sm:mb-6">
      <HorizontalScrollStrip innerClassName="gap-1.5 px-2 py-2 sm:flex-wrap sm:overflow-visible">
        {adminLinks.map((link) => {
          const isActive = link.match(pathname)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                horizontalScrollItemClass,
                'rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors sm:py-2',
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
