import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Cake,
  Calendar,
  CheckSquare,
  Church,
  ClipboardList,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Gift,
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
import { canAccessPath, hasPermission, type Permission } from '@/lib/auth/roles'
import type { UserRole } from '@/lib/types'

export type SidebarNavItem = {
  name: string
  href: string
  icon: LucideIcon
  roles?: UserRole[]
  permission?: Permission
  description?: string
}

export type SidebarNavSection = {
  title: string
  items: SidebarNavItem[]
}

/** Lean sidebar IA — deep links live on each module dashboard. */
export const sidebarNavigationSections: SidebarNavSection[] = [
  {
    title: 'Main',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Members', href: '/members', icon: Users },
      { name: 'Visitors', href: '/visitors', icon: UserPlus },
      { name: 'Groups', href: '/groups', icon: Group },
      { name: 'Recommendations', href: '/recommendations', icon: Gift },
    ],
  },
  {
    title: 'Attendance',
    items: [
      { name: 'Attendance', href: '/attendance', icon: Calendar },
      { name: 'QR Scanner', href: '/attendance/scanner', icon: QrCode },
      { name: 'Kiosk', href: '/attendance/kiosk', icon: Monitor },
      { name: 'Manual check-in', href: '/attendance/manual', icon: CheckSquare },
      { name: 'Analytics', href: '/attendance/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Camp meeting',
    items: [
      {
        name: 'Overview',
        href: '/admin/camp-meeting',
        icon: LayoutDashboard,
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        name: 'Registrations',
        href: '/admin/camp-meeting/registrations',
        icon: Users,
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        name: 'Directory',
        href: '/admin/camp-meeting/directory',
        icon: ClipboardList,
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        name: 'Follow-up',
        href: '/admin/camp-meeting/follow-up',
        icon: UserCheck,
        roles: ['admin', 'pastor', 'elder', 'finance_officer'],
      },
      {
        name: 'Analytics',
        href: '/admin/camp-meeting/analytics',
        icon: BarChart3,
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        name: 'Check-in scan',
        href: '/admin/camp-meeting/scan',
        icon: QrCode,
        roles: ['admin', 'pastor', 'elder'],
      },
      {
        name: 'Camp years',
        href: '/admin/camp-meeting/years',
        icon: Calendar,
        roles: ['admin'],
      },
      {
        name: 'Import data',
        href: '/admin/camp-meeting/import',
        icon: Upload,
        roles: ['admin', 'pastor', 'elder'],
      },
    ],
  },
  {
    title: 'Redemption Light',
    items: [
      {
        name: 'RLC overview',
        href: '/admin/rlc',
        icon: Church,
        permission: 'rlc.view',
      },
      {
        name: 'Visitors',
        href: '/admin/rlc/visitors',
        icon: UserPlus,
        permission: 'rlc.view',
      },
      {
        name: 'Members',
        href: '/admin/rlc/members',
        icon: Users,
        permission: 'rlc.view',
      },
      {
        name: 'Follow-up',
        href: '/admin/rlc/follow-up',
        icon: UserCheck,
        permission: 'rlc.manage',
      },
      {
        name: 'Analytics',
        href: '/admin/rlc/analytics',
        icon: BarChart3,
        permission: 'rlc.view',
      },
    ],
  },
  {
    title: 'Outreach',
    items: [
      {
        name: 'Campus activities',
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
        name: 'Forms',
        href: '/admin/forms',
        icon: ClipboardList,
        roles: ['admin', 'pastor', 'elder'],
      },
    ],
  },
  {
    title: 'Communications',
    items: [
      { name: 'SMS', href: '/sms', icon: MessageSquare },
      { name: 'Celebrations', href: '/celebrations', icon: Cake },
      {
        name: 'Email',
        href: '/communication/email',
        icon: Mail,
        roles: ['admin', 'pastor', 'elder', 'finance_officer'],
      },
      {
        name: 'Notifications',
        href: '/communication/notifications',
        icon: Bell,
        roles: ['admin', 'pastor', 'elder', 'finance_officer'],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        name: 'Admin hub',
        href: '/admin',
        icon: LayoutDashboard,
        roles: ['admin', 'pastor', 'elder', 'finance_officer'],
      },
      { name: 'Users', href: '/admin/users', icon: Users, roles: ['admin'] },
      { name: 'Admins', href: '/admin/admins', icon: Shield, roles: ['admin'] },
      { name: 'Groups', href: '/admin/groups', icon: Group, roles: ['admin', 'pastor', 'elder'] },
    ],
  },
  {
    title: 'Finance',
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
  if (item.permission && !hasPermission(role, item.permission)) return false
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

  if (base === '/admin/rlc/follow-up') {
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
