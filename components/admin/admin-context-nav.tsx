'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const adminLinks = [
  { href: '/admin', label: 'Overview', match: (path: string) => path === '/admin' },
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
  { href: '/admin/corporate-gem', label: 'Corporate Gem', match: (path: string) => path === '/admin/corporate-gem' },
  { href: '/admin/forms', label: 'Forms', match: (path: string) => path.startsWith('/admin/forms') },
  { href: '/admin/users', label: 'Users', match: (path: string) => path === '/admin/users' },
  { href: '/admin/admins', label: 'Admins', match: (path: string) => path === '/admin/admins' },
  { href: '/admin/groups', label: 'Groups', match: (path: string) => path === '/admin/groups' },
]

export function AdminContextNav() {
  const pathname = usePathname()

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
      <div className="flex flex-wrap gap-1">
        {adminLinks.map((link) => {
          const isActive = link.match(pathname)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              {link.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
