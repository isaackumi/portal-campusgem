import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  Church,
  ClipboardList,
  Group,
  LayoutDashboard,
  QrCode,
  UserPlus,
  Users,
} from 'lucide-react'
import { canAccessPath, hasPermission, type Permission } from '@/lib/auth/roles'
import { RLC_NAME } from '@/lib/constants/rlc'
import type { UserRole } from '@/lib/types'

export type LandingSection = {
  id: string
  title: string
  description: string
  destinations: LandingDestination[]
}

export type LandingDestination = {
  href: string
  title: string
  description: string
  icon: LucideIcon
  accent: 'amber' | 'sky' | 'emerald' | 'violet' | 'slate'
  public?: boolean
  roles?: UserRole[]
  permission?: Permission
}

export const landingSections: LandingSection[] = [
  {
    id: 'public',
    title: 'Register & visit',
    description: 'Open to everyone — no staff sign-in required.',
    destinations: [
      {
        href: '/camp-meeting/register',
        title: 'Camp Meeting',
        description: 'Register for the annual Campus Gem camp meeting.',
        icon: Calendar,
        accent: 'amber',
        public: true,
      },
      {
        href: '/rlc/visit',
        title: RLC_NAME,
        description: 'First-time visitor welcome and check-in at our mother church.',
        icon: Church,
        accent: 'sky',
        public: true,
      },
    ],
  },
  {
    id: 'ministry',
    title: 'Ministry portals',
    description: 'Staff sign-in required. Jump straight to your workspace.',
    destinations: [
      {
        href: '/dashboard',
        title: 'Dashboard',
        description: 'Overview of members, attendance, and recent activity.',
        icon: LayoutDashboard,
        accent: 'slate',
      },
      {
        href: '/admin/rlc',
        title: 'RLC workspace',
        description: 'Visitors, members, follow-up, and chapel analytics.',
        icon: Church,
        accent: 'sky',
        permission: 'rlc.view',
      },
      {
        href: '/admin/camp-meeting',
        title: 'Camp meeting',
        description: 'Registrations, directory, check-in, and camp operations.',
        icon: Calendar,
        accent: 'amber',
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        href: '/members',
        title: 'Members',
        description: 'Church membership records and profiles.',
        icon: Users,
        accent: 'emerald',
      },
      {
        href: '/visitors',
        title: 'Visitors',
        description: 'Track guests and follow-up across ministries.',
        icon: UserPlus,
        accent: 'violet',
      },
      {
        href: '/groups',
        title: 'Groups',
        description: 'Campuses, fellowships, ministries, and small groups.',
        icon: Group,
        accent: 'emerald',
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operations & outreach',
    description: 'Attendance, forms, and specialized outreach programs.',
    destinations: [
      {
        href: '/attendance',
        title: 'Attendance',
        description: 'Services, check-in, kiosk, and attendance analytics.',
        icon: BarChart3,
        accent: 'slate',
      },
      {
        href: '/attendance/scanner',
        title: 'QR scanner',
        description: 'Fast check-in with the attendance QR scanner.',
        icon: QrCode,
        accent: 'slate',
      },
      {
        href: '/admin/campus-activities',
        title: 'Campus activities',
        description: 'Campus fellowships and church-wide events.',
        icon: Building2,
        accent: 'emerald',
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        href: '/admin/corporate-gem',
        title: 'Corporate Gem',
        description: 'Graduates and professionals outreach.',
        icon: Briefcase,
        accent: 'violet',
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        href: '/admin/forms',
        title: 'Forms hub',
        description: 'Build forms, publish links, and review responses.',
        icon: ClipboardList,
        accent: 'amber',
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        href: '/admin',
        title: 'Administration',
        description: 'Central hub for users, groups, and church settings.',
        icon: LayoutDashboard,
        accent: 'slate',
        roles: ['admin', 'pastor', 'elder', 'finance_officer'],
      },
    ],
  },
]

const accentStyles: Record<LandingDestination['accent'], { icon: string; ring: string }> = {
  amber: { icon: 'bg-amber-100 text-amber-900', ring: 'group-hover:ring-amber-200' },
  sky: { icon: 'bg-sky-100 text-sky-900', ring: 'group-hover:ring-sky-200' },
  emerald: { icon: 'bg-emerald-100 text-emerald-900', ring: 'group-hover:ring-emerald-200' },
  violet: { icon: 'bg-violet-100 text-violet-900', ring: 'group-hover:ring-violet-200' },
  slate: { icon: 'bg-slate-100 text-slate-900', ring: 'group-hover:ring-slate-200' },
}

export function landingAccentStyles(accent: LandingDestination['accent']) {
  return accentStyles[accent]
}

export function canSeeLandingDestination(role: UserRole, item: LandingDestination): boolean {
  if (item.public) return true
  if (item.permission && !hasPermission(role, item.permission)) return false
  if (item.roles && !item.roles.includes(role)) return false
  return canAccessPath(role, item.href.split('?')[0])
}

export function filterLandingSections(
  role: UserRole | undefined,
  sections: LandingSection[] = landingSections
): LandingSection[] {
  return sections
    .map((section) => ({
      ...section,
      destinations: section.destinations.filter((item) => {
        if (item.public) return true
        if (!role) return true
        return canSeeLandingDestination(role, item)
      }),
    }))
    .filter((section) => section.destinations.length > 0)
}

export function landingHref(href: string, isSignedIn: boolean): string {
  if (isSignedIn) return href
  return `/auth?redirect=${encodeURIComponent(href)}`
}
