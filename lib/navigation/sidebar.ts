import type { ComponentProps, ComponentType } from 'react'
import {
  ArchiveIcon,
  BarChartIcon,
  CalendarIcon,
  CardStackIcon,
  ChatBubbleIcon,
  CheckCircledIcon,
  CheckboxIcon,
  ClipboardIcon,
  ClockIcon,
  CubeIcon,
  DashboardIcon,
  DesktopIcon,
  EnvelopeClosedIcon,
  FileTextIcon,
  GearIcon,
  GroupIcon,
  HeartIcon,
  HomeIcon,
  IdCardIcon,
  ListBulletIcon,
  LockClosedIcon,
  PersonIcon,
  ReaderIcon,
  TableIcon,
  UploadIcon,
  ViewGridIcon,
} from '@radix-ui/react-icons'
import { canAccessPath, hasPermission, type Permission } from '@/lib/auth/roles'
import type { UserRole } from '@/lib/types'

export type NavIcon = ComponentType<ComponentProps<typeof DashboardIcon>>

export type SidebarNavItem = {
  name: string
  href: string
  icon: NavIcon
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
      { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
      { name: 'Members', href: '/members', icon: PersonIcon },
      { name: 'Groups', href: '/groups', icon: GroupIcon },
      { name: 'Recommendations', href: '/recommendations', icon: HeartIcon },
    ],
  },
  {
    title: 'Attendance',
    items: [
      { name: 'Attendance', href: '/attendance', icon: CalendarIcon },
      { name: 'QR Scanner', href: '/attendance/scanner', icon: ViewGridIcon },
      { name: 'Kiosk', href: '/attendance/kiosk', icon: DesktopIcon },
      { name: 'Manual check-in', href: '/attendance/manual', icon: CheckboxIcon },
      { name: 'Analytics', href: '/attendance/analytics', icon: BarChartIcon },
    ],
  },
  {
    title: 'Camp meeting',
    items: [
      {
        name: 'Overview',
        href: '/admin/camp-meeting',
        icon: DashboardIcon,
        permission: 'camp.manage',
      },
      {
        name: 'Registrations',
        href: '/admin/camp-meeting/registrations',
        icon: PersonIcon,
      },
      {
        name: 'Directory',
        href: '/admin/camp-meeting/directory',
        icon: ClipboardIcon,
        permission: 'camp.manage',
      },
      {
        name: 'Follow-up',
        href: '/admin/camp-meeting/follow-up',
        icon: CheckCircledIcon,
      },
      {
        name: 'Analytics',
        href: '/admin/camp-meeting/analytics',
        icon: BarChartIcon,
        permission: 'camp.manage',
      },
      {
        name: 'Check-in hub',
        href: '/admin/camp-meeting/scan',
        icon: ViewGridIcon,
      },
      {
        name: 'Rooms',
        href: '/admin/camp-meeting/rooms',
        icon: HomeIcon,
        permission: 'camp.manage',
      },
      {
        name: 'Camp years',
        href: '/admin/camp-meeting/years',
        icon: CalendarIcon,
      },
      {
        name: 'Import data',
        href: '/admin/camp-meeting/import',
        icon: UploadIcon,
      },
      {
        name: 'Forms',
        href: '/admin/forms?module=camp_meeting',
        icon: FileTextIcon,
        permission: 'forms.manage',
      },
    ],
  },
  {
    title: 'RLC',
    items: [
      {
        name: 'RLC overview',
        href: '/admin/rlc',
        icon: ReaderIcon,
        permission: 'rlc.view',
      },
      {
        name: 'RLC visitors',
        href: '/admin/rlc/visitors',
        icon: PersonIcon,
        permission: 'rlc.view',
        description: 'Redemption Light guest records and follow-up pipeline',
      },
      {
        name: 'Members',
        href: '/admin/rlc/members',
        icon: GroupIcon,
        permission: 'rlc.view',
      },
      {
        name: 'Follow-up',
        href: '/admin/rlc/follow-up',
        icon: CheckCircledIcon,
        permission: 'rlc.manage',
      },
      {
        name: 'Attendance',
        href: '/admin/rlc/attendance',
        icon: CalendarIcon,
        permission: 'rlc.view',
      },
      {
        name: 'QR scan (optional)',
        href: '/admin/rlc/scan',
        icon: ViewGridIcon,
        permission: 'rlc.manage',
      },
      {
        name: 'Ministry roster',
        href: '/admin/rlc/roster',
        icon: ListBulletIcon,
        permission: 'rlc.view',
      },
      {
        name: 'Visitor slips',
        href: '/admin/rlc/visitors/print',
        icon: FileTextIcon,
        permission: 'rlc.manage',
      },
      {
        name: 'Analytics',
        href: '/admin/rlc/analytics',
        icon: BarChartIcon,
        permission: 'rlc.view',
      },
      {
        name: 'Forms',
        href: '/admin/forms?module=rlc',
        icon: FileTextIcon,
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
        icon: CubeIcon,
      },
      {
        name: 'Corporate Gem',
        href: '/admin/corporate-gem',
        icon: ArchiveIcon,
      },
      {
        name: 'Forms',
        href: '/admin/forms',
        icon: ClipboardIcon,
        permission: 'forms.manage',
      },
    ],
  },
  {
    title: 'Communications',
    items: [
      {
        name: 'Comms center',
        href: '/admin/communications',
        icon: ChatBubbleIcon,
        permission: 'sms.send',
      },
      { name: 'SMS (legacy)', href: '/sms', icon: ChatBubbleIcon, permission: 'sms.send' },
      { name: 'Celebrations', href: '/celebrations', icon: HeartIcon, permission: 'celebrations.view' },
      {
        name: 'Camp bulk',
        href: '/admin/camp-meeting/communications',
        icon: EnvelopeClosedIcon,
        permission: 'camp.manage',
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      { name: 'Donations', href: '/financial/donations', icon: CardStackIcon },
      { name: 'Payments', href: '/financial/payments', icon: IdCardIcon },
      { name: 'Budget', href: '/financial/budget', icon: ClockIcon },
      { name: 'Reports', href: '/financial/reports', icon: TableIcon },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        name: 'Admin hub',
        href: '/admin',
        icon: DashboardIcon,
        roles: ['admin', 'pastor', 'elder', 'finance_officer'],
      },
      { name: 'Users', href: '/admin/users', icon: PersonIcon },
      { name: 'Access & roles', href: '/admin/admins', icon: LockClosedIcon },
      { name: 'Groups', href: '/admin/groups', icon: GroupIcon },
    ],
  },
]

export const sidebarSettingsNavigation: SidebarNavItem[] = [
  { name: 'General', href: '/settings/general', icon: GearIcon },
  { name: 'Security', href: '/settings/security', icon: LockClosedIcon },
]

/** Path used for permission checks (strips query/hash). */
export function navHrefPath(href: string): string {
  return href.split('?')[0].split('#')[0]
}

/**
 * Nav visibility follows the same permission map as middleware, so a link is shown
 * exactly when the page would let the user in. Per-user grants (`extra`) count too.
 */
export function canSeeNavItem(
  role: UserRole | undefined,
  item: SidebarNavItem,
  extra?: readonly string[] | null
): boolean {
  if (!role) return false
  if (item.permission && !hasPermission(role, item.permission, extra)) return false
  if (item.roles && !item.roles.includes(role) && !(extra && extra.length > 0)) return false
  return canAccessPath(role, navHrefPath(item.href), extra)
}

export function filterSidebarSections(
  role: UserRole | undefined,
  sections: SidebarNavSection[] = sidebarNavigationSections,
  extra?: readonly string[] | null
): SidebarNavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canSeeNavItem(role, item, extra)),
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
    return pathname === '/dashboard'
  }

  if (base === '/admin/camp-meeting/follow-up' || base === '/admin/rlc/follow-up') {
    if (pathname !== base) return false
    const wantsMine = expected?.get('mine') === '1'
    const isMine = searchParams?.get('mine') === '1'
    return wantsMine ? isMine : !isMine
  }

  if (base === '/admin/forms') {
    if (pathname !== base) return false
    const wantsModule = expected?.get('module')
    if (!wantsModule) return !searchParams?.get('module')
    return searchParams?.get('module') === wantsModule
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

/**
 * Several items can match one URL (e.g. /admin/camp-meeting and
 * /admin/camp-meeting/registrations); only the most specific one is active.
 */
export function activeNavHref(
  items: readonly SidebarNavItem[],
  pathname: string,
  searchParams?: URLSearchParams | null
): string | null {
  let best: string | null = null
  for (const item of items) {
    if (!isSidebarItemActive(pathname, item.href, searchParams)) continue
    if (!best || navHrefPath(item.href).length > navHrefPath(best).length) best = item.href
  }
  return best
}
