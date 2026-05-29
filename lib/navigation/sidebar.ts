import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Cake,
  Calendar,
  CheckSquare,
  ClipboardList,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Group,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Monitor,
  QrCode,
  Settings,
  Shield,
  Upload,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { canAccessPath } from '@/lib/auth/roles'
import type { UserRole } from '@/lib/types'

export type SidebarNavItem = {
  name: string
  href: string
  icon: LucideIcon
  roles?: UserRole[]
  description?: string
}

export type SidebarNavSection = {
  title: string
  items: SidebarNavItem[]
}

export const sidebarNavigationSections: SidebarNavSection[] = [
  {
    title: 'CORE MANAGEMENT',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Members', href: '/members', icon: Users },
      { name: 'Visitors', href: '/visitors', icon: UserPlus },
      { name: 'Groups', href: '/groups', icon: Group },
    ],
  },
  {
    title: 'ATTENDANCE SYSTEM',
    items: [
      { name: 'Attendance Hub', href: '/attendance', icon: Calendar },
      { name: 'QR Scanner', href: '/attendance/scanner', icon: QrCode },
      { name: 'Kiosk Mode', href: '/attendance/kiosk', icon: Monitor },
      { name: 'Manual Check-in', href: '/attendance/manual', icon: CheckSquare },
      { name: 'Bulk Attendance', href: '/attendance/bulk', icon: Users },
      { name: 'Attendance Analytics', href: '/attendance/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'FORMS & OUTREACH',
    items: [
      {
        name: 'Campus & Activities',
        href: '/admin/campus-activities',
        icon: Building2,
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        name: 'Corporate Gem',
        href: '/admin/corporate-gem',
        icon: Briefcase,
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        name: 'Forms Hub',
        href: '/admin/forms',
        icon: ClipboardList,
        roles: ['admin', 'pastor', 'elder'],
      },
    ],
  },
  {
    title: 'COMMUNICATIONS',
    items: [
      { name: 'SMS Management', href: '/sms', icon: MessageSquare },
      { name: 'Birthdays & Anniversaries', href: '/celebrations', icon: Cake },
      { name: 'Email', href: '/communication/email', icon: Mail, roles: ['admin', 'pastor', 'elder', 'finance_officer'] },
      {
        name: 'Notifications',
        href: '/communication/notifications',
        icon: Bell,
        roles: ['admin', 'pastor', 'elder', 'finance_officer'],
      },
    ],
  },
  {
    title: 'CAMP MEETING',
    items: [
      { name: 'Camp Dashboard', href: '/admin/camp-meeting', icon: Calendar, roles: ['admin', 'pastor', 'elder'] },
      {
        name: 'Camper Directory',
        href: '/admin/camp-meeting/directory',
        icon: Users,
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        name: 'Registrations',
        href: '/admin/camp-meeting/registrations',
        icon: Users,
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        name: 'Camp Activities',
        href: '/admin/camp-meeting/activities',
        icon: ClipboardList,
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        name: 'Analytics',
        href: '/admin/camp-meeting/analytics',
        icon: BarChart3,
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        name: 'Follow-up Management',
        href: '/admin/camp-meeting/follow-up',
        icon: UserCheck,
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        name: 'My follow-ups',
        href: '/admin/camp-meeting/follow-up?mine=1',
        icon: UserCheck,
        roles: ['admin', 'pastor', 'elder', 'finance_officer'],
      },
      {
        name: 'Bulk Communications',
        href: '/admin/camp-meeting/communications',
        icon: MessageSquare,
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        name: 'Payment Management',
        href: '/admin/camp-meeting/payments',
        icon: DollarSign,
        roles: ['admin', 'pastor', 'elder', 'finance_officer'],
      },
      {
        name: 'Notification Settings',
        href: '/admin/camp-meeting/notifications',
        icon: Bell,
        roles: ['admin'],
      },
      {
        name: 'Camp Years Management',
        href: '/admin/camp-meeting/years',
        icon: Calendar,
        roles: ['admin'],
        description: 'Manage all camp years',
      },
      {
        name: 'Historical Import',
        href: '/admin/camp-meeting/import',
        icon: Upload,
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        name: 'QR Scanner',
        href: '/admin/camp-meeting/scan',
        icon: QrCode,
        roles: ['admin', 'pastor', 'elder'],
      },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { name: 'Admin Overview', href: '/admin', icon: LayoutDashboard, roles: ['admin', 'pastor', 'elder', 'finance_officer'] },
      { name: 'User Management', href: '/admin/users', icon: Users, roles: ['admin'] },
      { name: 'Admin Management', href: '/admin/admins', icon: Shield, roles: ['admin'] },
      { name: 'Group Management', href: '/admin/groups', icon: Group, roles: ['admin', 'pastor', 'elder'] },
    ],
  },
  {
    title: 'FINANCIAL',
    items: [
      { name: 'Donations', href: '/financial/donations', icon: DollarSign },
      { name: 'Payments', href: '/financial/payments', icon: CreditCard },
      { name: 'Budget', href: '/financial/budget', icon: Clock },
      { name: 'Reports', href: '/financial/reports', icon: FileText },
    ],
  },
]

export const sidebarSettingsNavigation: SidebarNavItem[] = [
  { name: 'General', href: '/settings/general', icon: Settings },
  { name: 'Security', href: '/settings/security', icon: Shield },
]

/** Path used for permission checks (strips query/hash). */
export function navHrefPath(href: string): string {
  return href.split('?')[0].split('#')[0]
}

export function canSeeNavItem(role: UserRole | undefined, item: SidebarNavItem): boolean {
  if (!role) return true
  if (item.roles && !item.roles.includes(role)) return false
  return canAccessPath(role, navHrefPath(item.href))
}

export function filterSidebarSections(
  role: UserRole | undefined,
  sections: SidebarNavSection[] = sidebarNavigationSections
): SidebarNavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canSeeNavItem(role, item)),
    }))
    .filter((section) => section.items.length > 0)
}

export function isSidebarItemActive(
  pathname: string,
  href: string,
  searchParams?: URLSearchParams | null
): boolean {
  const base = navHrefPath(href)
  const expected = href.includes('?') ? new URLSearchParams(href.split('?')[1]) : null

  if (base === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/'
  }

  if (base === '/admin/camp-meeting/follow-up') {
    if (pathname !== base) return false
    const wantsMine = expected?.get('mine') === '1'
    const isMine = searchParams?.get('mine') === '1'
    return wantsMine ? isMine : !isMine
  }

  if (expected && expected.size > 0) {
    if (pathname !== base) return false
    let matches = true
    expected.forEach((value, key) => {
      if (searchParams?.get(key) !== value) matches = false
    })
    return matches
  }

  if (pathname === base) return true
  return pathname.startsWith(`${base}/`)
}
