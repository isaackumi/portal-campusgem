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
  | 'rlc.view'
  | 'rlc.manage'
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
    'rlc.view',
    'rlc.manage',
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
    'rlc.view',
    'rlc.manage',
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
    'rlc.view',
    'rlc.manage',
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
  { prefix: '/admin/rlc/follow-up', permission: 'rlc.manage' },
  { prefix: '/admin/rlc', permission: 'rlc.view' },
  { prefix: '/admin/admins', permission: 'admins.manage' },
  { prefix: '/admin/users', permission: 'users.manage' },
  { prefix: '/admin/groups', permission: 'groups.manage' },
  { prefix: '/admin/campus-activities', permission: 'groups.manage' },
  { prefix: '/admin/corporate-gem', permission: 'groups.manage' },
  { prefix: '/admin/communications', permission: 'sms.send' },
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
  { prefix: '/visitors/add', permission: 'rlc.manage' },
  { prefix: '/visitors', permission: 'rlc.view' },
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
  'rlc.view': 'View RLC (mother church)',
  'rlc.manage': 'Manage RLC visitors & members',
  'users.manage': 'Manage users',
  'admins.manage': 'Manage administrators',
  'financial.view': 'View financials',
  'financial.manage': 'Manage financials',
}

export const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[]

/** Permissions grouped by area, for the access management UI. */
export const PERMISSION_GROUPS: Array<{ label: string; permissions: Permission[] }> = [
  { label: 'General', permissions: ['dashboard.view', 'celebrations.view', 'sms.send', 'forms.manage'] },
  { label: 'Members & visitors', permissions: ['members.view', 'members.manage', 'visitors.view', 'visitors.manage'] },
  { label: 'Groups', permissions: ['groups.view', 'groups.manage'] },
  { label: 'Attendance', permissions: ['attendance.view', 'attendance.record', 'attendance.manage'] },
  { label: 'Camp meeting', permissions: ['camp.view', 'camp.manage', 'camp.payments', 'camp.settings'] },
  { label: 'RLC', permissions: ['rlc.view', 'rlc.manage'] },
  { label: 'Finance', permissions: ['financial.view', 'financial.manage'] },
  { label: 'Administration', permissions: ['users.manage', 'admins.manage'] },
]

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && value in PERMISSION_LABELS
}

/** Keep only known permission strings (drops stale / unknown values). */
export function sanitizePermissions(values: readonly unknown[] | null | undefined): Permission[] {
  if (!values) return []
  return Array.from(new Set(values.filter(isPermission)))
}

/** Serialize extra permissions for the `chms-perms` cookie. */
export function encodePermissionsCookie(values: readonly unknown[] | null | undefined): string {
  return sanitizePermissions(values).join(',')
}

export function decodePermissionsCookie(value: string | null | undefined): Permission[] {
  return value ? sanitizePermissions(value.split(',')) : []
}

export function permissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ? [...ROLE_PERMISSIONS[role]] : []
}

/** Role permissions plus any per-user grants. */
export function effectivePermissions(
  role: UserRole | null | undefined,
  extra?: readonly unknown[] | null
): Permission[] {
  const base = role && isUserRole(role) ? ROLE_PERMISSIONS[role] : []
  return Array.from(new Set([...base, ...sanitizePermissions(extra)]))
}

export function isStaffRole(role: string | null | undefined): boolean {
  return Boolean(role && STAFF_ROLES.includes(role as UserRole))
}

export function hasPermission(
  role: UserRole | null | undefined,
  permission: Permission,
  extra?: readonly unknown[] | null
): boolean {
  if (role && isUserRole(role) && ROLE_PERMISSIONS[role].includes(permission)) return true
  return sanitizePermissions(extra).includes(permission)
}

export function canAccessPath(
  role: UserRole | null | undefined,
  pathname: string,
  extra?: readonly unknown[] | null
): boolean {
  if (!role || !isUserRole(role)) return false
  const path = pathname.split('?')[0].split('#')[0]
  const match = ROUTE_PERMISSIONS.find((rule) => path.startsWith(rule.prefix))
  if (!match) return true
  return hasPermission(role, match.permission, extra)
}

export function requiredPermissionForPath(pathname: string): Permission | null {
  const match = ROUTE_PERMISSIONS.find((rule) => pathname.startsWith(rule.prefix))
  return match?.permission ?? null
}

/** Only allow same-origin relative redirects after login. */
export function safeRedirectPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  if (raw === '/auth' || raw.startsWith('/auth?') || raw.startsWith('/auth/')) return fallback
  return raw
}
