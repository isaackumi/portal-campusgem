'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { canAccessPath } from '@/lib/auth/roles'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  User,
  Group,
  MessageSquare,
  Bell,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Monitor,
  CheckSquare,
  DollarSign,
  CreditCard,
  Clock,
  FileText,
  Mail,
  Shield,
  Zap,
  Target,
  TrendingUp,
  Gift,
  Cake,
  ClipboardList,
  Upload,
  UserCheck,
  Building2,
  Briefcase,
} from 'lucide-react'

interface SidebarProps {
  className?: string
}

type NavItem = {
  name: string
  href: string
  icon: typeof LayoutDashboard
  roles?: string[]
  description?: string
}

const navigationSections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'CORE MANAGEMENT',
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard
      },
      {
        name: 'Members',
        href: '/members',
        icon: Users
      },
      {
        name: 'Visitors',
        href: '/visitors',
        icon: UserPlus
      },
      {
        name: 'Groups',
        href: '/groups',
        icon: Group
      }
    ]
  },
  {
    title: 'ATTENDANCE SYSTEM',
    items: [
      {
        name: 'QR Scanner',
        href: '/attendance/scanner',
        icon: QrCode
      },
      {
        name: 'Kiosk Mode',
        href: '/attendance/kiosk',
        icon: Monitor
      },
      {
        name: 'Manual Check-in',
        href: '/attendance/manual',
        icon: CheckSquare
      },
      {
        name: 'Bulk Attendance',
        href: '/attendance/bulk',
        icon: Users
      },
      {
        name: 'Attendance Analytics',
        href: '/attendance/analytics',
        icon: BarChart3
      }
    ]
  },
  {
    title: 'FORMS & OUTREACH',
    items: [
      {
        name: 'Campus & Activities',
        href: '/admin/campus-activities',
        icon: Building2,
        roles: ['admin', 'pastor', 'elder']
      },
      {
        name: 'Corporate Gem',
        href: '/admin/corporate-gem',
        icon: Briefcase,
        roles: ['admin', 'pastor', 'elder']
      },
      {
        name: 'Forms Hub',
        href: '/admin/forms',
        icon: ClipboardList,
        roles: ['admin', 'pastor', 'elder']
      }
    ]
  },
  {
    title: 'COMMUNICATIONS',
    items: [
      {
        name: 'SMS Management',
        href: '/sms',
        icon: MessageSquare
      },
      {
        name: 'Birthdays & Anniversaries',
        href: '/celebrations',
        icon: Cake
      }
    ]
  },
  {
    title: 'CAMP MEETING',
    items: [
      {
        name: 'Camp Dashboard',
        href: '/admin/camp-meeting',
        icon: Calendar,
        roles: ['admin', 'pastor', 'elder']
      },
      {
        name: 'Camper Directory',
        href: '/admin/camp-meeting/directory',
        icon: Users,
        roles: ['admin', 'pastor', 'elder']
      },
      {
        name: 'Registrations',
        href: '/admin/camp-meeting/registrations',
        icon: Users,
        roles: ['admin', 'pastor', 'elder']
      },
      {
        name: 'Camp Activities',
        href: '/admin/camp-meeting/activities',
        icon: ClipboardList,
        roles: ['admin', 'pastor', 'elder']
      },
      {
        name: 'Analytics',
        href: '/admin/camp-meeting/analytics',
        icon: BarChart3,
        roles: ['admin', 'pastor', 'elder']
      },
      {
        name: 'Follow-up Management',
        href: '/admin/camp-meeting/follow-up',
        icon: UserCheck,
        roles: ['admin', 'pastor', 'elder']
      },
      {
        name: 'My follow-ups',
        href: '/admin/camp-meeting/follow-up?mine=1',
        icon: UserCheck,
        roles: ['admin', 'pastor', 'elder', 'finance_officer']
      },
      {
        name: 'Bulk Communications',
        href: '/admin/camp-meeting/communications',
        icon: MessageSquare,
        roles: ['admin', 'pastor', 'elder']
      },
      {
        name: 'Payment Management',
        href: '/admin/camp-meeting/payments',
        icon: DollarSign,
        roles: ['admin', 'pastor', 'elder', 'finance_officer']
      },
      {
        name: 'Notification Settings',
        href: '/admin/camp-meeting/notifications',
        icon: Bell,
        roles: ['admin']
      },
      {
        name: 'Camp Years Management',
        href: '/admin/camp-meeting/years',
        icon: Calendar,
        roles: ['admin'],
        description: 'Manage all camp years'
      },
      {
        name: 'Historical Import',
        href: '/admin/camp-meeting/import',
        icon: Upload,
        roles: ['admin', 'pastor', 'elder']
      },
      {
        name: 'QR Scanner',
        href: '/admin/camp-meeting/scan',
        icon: QrCode,
        roles: ['admin', 'pastor', 'elder']
      }
    ]
  },
  {
    title: 'ADMINISTRATION',
    items: [
      {
        name: 'Admin Overview',
        href: '/admin',
        icon: LayoutDashboard
      },
      {
        name: 'User Management',
        href: '/admin/users',
        icon: Users
      },
      {
        name: 'Admin Management',
        href: '/admin/admins',
        icon: Shield
      },
      {
        name: 'Group Management',
        href: '/admin/groups',
        icon: Group
      }
    ]
  },
  {
    title: 'FINANCIAL',
    items: [
      {
        name: 'Donations',
        href: '/financial/donations',
        icon: DollarSign
      },
      {
        name: 'Payments',
        href: '/financial/payments',
        icon: CreditCard
      },
      {
        name: 'Budget',
        href: '/financial/budget',
        icon: Clock
      },
      {
        name: 'Reports',
        href: '/financial/reports',
        icon: FileText
      }
    ]
  },
  {
    title: 'COMMUNICATION',
    items: [
      {
        name: 'SMS',
        href: '/sms',
        icon: MessageSquare,
        roles: ['admin', 'pastor', 'elder', 'finance_officer']
      },
      {
        name: 'Email',
        href: '/communication/email',
        icon: Mail,
        roles: ['admin', 'pastor', 'elder', 'finance_officer']
      },
      {
        name: 'Notifications',
        href: '/communication/notifications',
        icon: Bell,
        roles: ['admin', 'pastor', 'elder', 'finance_officer']
      }
    ]
  },
]

const settingsNavigation = [
  {
    name: 'General',
    href: '/settings/general',
    icon: Settings
  },
  {
    name: 'Security',
    href: '/settings/security',
    icon: Shield
  }
]

export function Sidebar({ className }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Ensure consistent rendering between server and client
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    await signOut()
    router.push('/auth')
  }

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    return pathname.startsWith(href)
  }

  // Memoize filtered items to ensure consistency
  const filteredSections = useMemo(() => {
    if (!mounted) {
      // Return all items on server to avoid hydration mismatch
      return navigationSections
    }
    
    return navigationSections.map(section => ({
      ...section,
      items: section.items.filter((item) => {
        if (!user?.role) return true
        if (item.roles && !item.roles.includes(user.role)) return false
        return canAccessPath(user.role, item.href)
      })
    }))
  }, [mounted, user?.role])

  return (
    <div className={cn(
      'flex flex-col h-full bg-blue-900 transition-all duration-300',
      collapsed ? 'w-16' : 'w-72',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-blue-800">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="h-6 w-6 text-slate-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                Campus Gem Ministries
              </h1>
              <p className="text-sm text-white">Campus Ministry</p>
              <p className="text-xs text-yellow-400">Kokomlemle, Accra</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 text-blue-200 hover:text-white hover:bg-blue-800"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="p-6 border-b border-blue-800">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-slate-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.full_name || 'System Administrator'}
              </p>
              <p className="text-xs text-blue-200 truncate">
                {user?.role?.replace('_', ' ') || 'Admin'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto overscroll-contain">
        {filteredSections.map((section) => (
          <div key={section.title} className="space-y-2">
            {!collapsed && (
              <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider px-3">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = isActiveRoute(item.href)
                return (
                  <Button
                    key={item.name}
                    variant="ghost"
                    className={cn(
                      'w-full justify-start px-3 py-2 h-auto',
                      collapsed && 'px-2',
                      isActive
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'text-blue-100 hover:text-white hover:bg-blue-800'
                    )}
                    onClick={() => router.push(item.href)}
                  >
                    <Icon className={cn('h-4 w-4', !collapsed && 'mr-3')} />
                    {!collapsed && <span className="text-sm">{item.name}</span>}
                  </Button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings Section */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-blue-800 space-y-2">
          <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider px-3">
            SETTINGS
          </h3>
          <div className="space-y-1">
            {settingsNavigation.map((item) => {
              const Icon = item.icon
              const isActive = isActiveRoute(item.href)

              return (
                <Button
                  key={item.name}
                  variant="ghost"
                  className={cn(
                    'w-full justify-start px-3 py-2 h-auto',
                    isActive
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'text-blue-100 hover:text-white hover:bg-blue-800'
                  )}
                  onClick={() => router.push(item.href)}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  <span className="text-sm">{item.name}</span>
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {/* Recommendations Button */}
      {!collapsed && (
        <div className="p-4">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start px-3 py-2 h-auto"
            onClick={() => router.push('/recommendations')}
          >
            <Gift className="h-4 w-4 mr-3 text-yellow-400" />
            <span className="text-sm">Recommendations</span>
          </Button>
        </div>
      )}

      {/* Logout Button */}
      <div className="p-4 border-t border-blue-800">
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-blue-100 hover:text-white hover:bg-blue-800',
            collapsed ? 'px-2' : 'px-3'
          )}
          onClick={handleLogout}
        >
          <LogOut className={cn('h-4 w-4', !collapsed && 'mr-3')} />
          {!collapsed && <span className="text-sm">Logout</span>}
        </Button>
      </div>
    </div>
  )
}

// Mobile sidebar component
export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  // Ensure consistent rendering between server and client
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    await signOut()
    router.push('/auth')
  }

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    return pathname.startsWith(href)
  }

  // Memoize filtered items to ensure consistency
  const filteredSections = useMemo(() => {
    if (!mounted) {
      // Return all items on server to avoid hydration mismatch
      return navigationSections
    }
    
    return navigationSections.map(section => ({
      ...section,
      items: section.items.filter((item) => {
        if (!user?.role) return true
        if (item.roles && !item.roles.includes(user.role)) return false
        return canAccessPath(user.role, item.href)
      })
    }))
  }, [mounted, user?.role])

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="lg:hidden p-2 text-slate-600"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-blue-900 shadow-xl flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b border-blue-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
                  <LayoutDashboard className="h-6 w-6 text-slate-900" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    Campus Gem Ministries
                  </h1>
                  <p className="text-sm text-white">Campus Ministry</p>
                  <p className="text-xs text-yellow-400">Kokomlemle, Accra</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="p-2 text-blue-200 hover:text-white hover:bg-blue-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* User Info */}
            <div className="p-6 border-b border-blue-800">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-slate-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.full_name || 'System Administrator'}
                  </p>
                  <p className="text-xs text-blue-200 truncate">
                    {user?.role?.replace('_', ' ') || 'Admin'}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto overscroll-contain">
              {filteredSections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider px-3">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon
                      const isActive = isActiveRoute(item.href)
                      return (
                        <Button
                          key={item.name}
                          variant="ghost"
                          className={cn(
                            'w-full justify-start px-3 py-2 h-auto',
                            isActive
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'text-blue-100 hover:text-white hover:bg-blue-800'
                          )}
                          onClick={() => {
                            router.push(item.href)
                            setOpen(false)
                          }}
                        >
                          <Icon className="h-4 w-4 mr-3" />
                          <span className="text-sm">{item.name}</span>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Recommendations Button */}
            <div className="p-4">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start px-3 py-2 h-auto"
                onClick={() => {
                  router.push('/recommendations')
                  setOpen(false)
                }}
              >
                <Gift className="h-4 w-4 mr-3 text-yellow-400" />
                <span className="text-sm">Recommendations</span>
              </Button>
            </div>

            {/* Logout */}
            <div className="p-4 border-t border-blue-800">
              <Button
                variant="ghost"
                className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-800 px-3"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-3" />
                <span className="text-sm">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar