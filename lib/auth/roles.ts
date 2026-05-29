import type { UserRole } from '@/lib/types'

export const USER_ROLES: UserRole[] = [
  'admin',
  'pastor',
  'elder',
  'finance_officer',
  'member',
  'visitor',
]

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  pastor: 'Pastor',
  elder: 'Elder',
  finance_officer: 'Finance Officer',
  member: 'Member',
  visitor: 'Visitor',
}

export type Permission =
  | 'dashboard.view'
  | 'members.view'
  | 'members.manage'
  | 'visitors.view'
  | 'visitors.manage'
  | 'groups.view'
  | 'groups.manage'
  | 'attendance.view'
  | 'attendance.record'
  | 'attendance.manage'
  | 'sms.send'
  | 'celebrations.view'
  | 'camp.view'
  | 'camp.manage'
  | 'camp.payments'
  | 'camp.settings'
  | 'forms.manage'
  | 'users.manage'
  | 'admins.manage'
  | 'financial.view'
  | 'financial.manage'

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'dashboard.view',
    'members.view',
    'members.manage',
    'visitors.view',
    'visitors.manage',
    'groups.view',
    'groups.manage',
    'attendance.view',
    'attendance.record',
    'attendance.manage',
    'sms.send',
    'celebrations.view',
    'camp.view',
    'camp.manage',
    'camp.payments',
    'camp.settings',
    'forms.manage',
    'users.manage',
    'admins.manage',
    'financial.view',
    'financial.manage',
  ],
  pastor: [
    'dashboard.view',
    'members.view',
    'members.manage',
    'visitors.view',
    'visitors.manage',
    'groups.view',
    'groups.manage',
    'attendance.view',
    'attendance.record',
    'attendance.manage',
    'sms.send',
    'celebrations.view',
    'camp.view',
    'camp.manage',
    'camp.payments',
    'forms.manage',
    'financial.view',
  ],
  elder: [
    'dashboard.view',
    'members.view',
    'visitors.view',
    'visitors.manage',
    'groups.view',
    'groups.manage',
    'attendance.view',
    'attendance.record',
    'attendance.manage',
    'sms.send',
    'celebrations.view',
    'camp.view',
    'camp.manage',
    'forms.manage',
    'financial.view',
  ],
  finance_officer: [
    'dashboard.view',
    'members.view',
    'attendance.view',
    'camp.view',
    'camp.payments',
    'financial.view',
    'financial.manage',
  ],
  member: [
    'dashboard.view',
    'groups.view',
    'attendance.view',
    'attendance.record',
    'celebrations.view',
  ],
  visitor: ['dashboard.view', 'attendance.view'],
}

const ROUTE_PERMISSIONS: Array<{ prefix: string; permission: Permission }> = [
  { prefix: '/admin/admins', permission: 'admins.manage' },
  { prefix: '/admin/users', permission: 'users.manage' },
  { prefix: '/admin/groups', permission: 'groups.manage' },
  { prefix: '/admin/campus-activities', permission: 'groups.manage' },
  { prefix: '/admin/corporate-gem', permission: 'groups.manage' },
  { prefix: '/admin/camp-meeting/years', permission: 'camp.settings' },
  { prefix: '/admin/camp-meeting/notifications', permission: 'camp.settings' },
  { prefix: '/admin/camp-meeting/payments', permission: 'camp.payments' },
  { prefix: '/admin/camp-meeting/communications', permission: 'camp.manage' },
  { prefix: '/admin/camp-meeting/import', permission: 'camp.manage' },
  { prefix: '/admin/camp-meeting/follow-up', permission: 'camp.manage' },
  { prefix: '/admin/camp-meeting/registrations', permission: 'camp.manage' },
  { prefix: '/admin/camp-meeting/scan', permission: 'camp.manage' },
  { prefix: '/admin/camp-meeting/activities', permission: 'camp.manage' },
  { prefix: '/admin/forms', permission: 'forms.manage' },
  { prefix: '/admin/camp-meeting', permission: 'camp.view' },
  { prefix: '/members/add', permission: 'members.manage' },
  { prefix: '/members', permission: 'members.view' },
  { prefix: '/visitors/add', permission: 'visitors.manage' },
  { prefix: '/visitors', permission: 'visitors.view' },
  { prefix: '/groups/add', permission: 'groups.manage' },
  { prefix: '/groups', permission: 'groups.view' },
  { prefix: '/attendance', permission: 'attendance.view' },
  { prefix: '/sms', permission: 'sms.send' },
  { prefix: '/celebrations', permission: 'celebrations.view' },
  { prefix: '/financial', permission: 'financial.view' },
  { prefix: '/communication', permission: 'dashboard.view' },
  { prefix: '/settings', permission: 'dashboard.view' },
  { prefix: '/recommendations', permission: 'dashboard.view' },
  { prefix: '/dashboard', permission: 'dashboard.view' },
]

export function isUserRole(value: string | null | undefined): value is UserRole {
  return Boolean(value && USER_ROLES.includes(value as UserRole))
}

/** Roles that can be assigned when elevating access from camp / user management. */
export const STAFF_ROLES: UserRole[] = ['admin', 'pastor', 'elder', 'finance_officer']

export const PERMISSION_LABELS: Record<Permission, string> = {
  'dashboard.view': 'View dashboard',
  'members.view': 'View members',
  'members.manage': 'Manage members',
  'visitors.view': 'View visitors',
  'visitors.manage': 'Manage visitors',
  'groups.view': 'View groups',
  'groups.manage': 'Manage groups',
  'attendance.view': 'View attendance',
  'attendance.record': 'Record attendance',
  'attendance.manage': 'Manage attendance',
  'sms.send': 'Send SMS',
  'celebrations.view': 'View celebrations',
  'camp.view': 'View camp meeting',
  'camp.manage': 'Manage camp meeting',
  'camp.payments': 'Manage camp payments',
  'camp.settings': 'Camp settings',
  'forms.manage': 'Manage forms',
  'users.manage': 'Manage users',
  'admins.manage': 'Manage administrators',
  'financial.view': 'View financials',
  'financial.manage': 'Manage financials',
}

export function permissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ? [...ROLE_PERMISSIONS[role]] : []
}

export function isStaffRole(role: string | null | undefined): boolean {
  return Boolean(role && STAFF_ROLES.includes(role as UserRole))
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function canAccessPath(role: UserRole | null | undefined, pathname: string): boolean {
  if (!role || !isUserRole(role)) return false
  const path = pathname.split('?')[0].split('#')[0]
  const match = ROUTE_PERMISSIONS.find((rule) => path.startsWith(rule.prefix))
  if (!match) return true
  return hasPermission(role, match.permission)
}

export function requiredPermissionForPath(pathname: string): Permission | null {
  const match = ROUTE_PERMISSIONS.find((rule) => pathname.startsWith(rule.prefix))
  return match?.permission ?? null
}
