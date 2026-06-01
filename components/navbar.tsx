'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from './providers'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BrandMark, BrandTitle } from '@/components/brand-mark'
import {
  Menu,
  X,
  User,
  LogOut,
  Settings,
  Bell,
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Members', href: '/members', icon: Users },
  { name: 'Attendance', href: '/attendance', icon: Calendar },
  { name: 'Donations', href: '/financial/donations', icon: DollarSign, roles: ['admin', 'pastor', 'elder', 'finance_officer'] },
  { name: 'Messages', href: '/sms', icon: MessageSquare, roles: ['admin', 'pastor', 'elder', 'finance_officer'] },
]

export function Navbar() {
  const { user, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const filteredNavigation = navigation.filter(item => {
    if (!item.roles) return true
    return user?.role && item.roles.includes(user.role)
  })

  if (!user) return null

  return (
    <nav className="border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex shrink-0 items-center">
              <Link href="/dashboard" className="flex items-center gap-3">
                <BrandMark size="sm" />
                <BrandTitle light compact={false} className="hidden sm:block" />
              </Link>
            </div>

            <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
            </Button>

            {/* Profile dropdown */}
            <div className="relative">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-slate-900">
                      {user.full_name}
                    </p>
                    <p className="text-xs capitalize text-slate-500">
                      {user.role.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Link href="/profile">
                    <Button variant="ghost" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Button>
                  </Link>

                  {user.role === 'admin' && (
                    <Link href="/admin">
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Admin
                      </Button>
                    </Link>
                  )}

                  <Button variant="ghost" size="sm" onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-500 hover:text-slate-700"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="sm:hidden">
          <Card className="mx-4 mt-2 p-4">
            <div className="space-y-4">
              {/* User info */}
              <div className="flex items-center space-x-3 pb-4 border-b">
                <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">{user.full_name}</p>
                  <p className="text-sm capitalize text-slate-500">
                    {user.role.replace('_', ' ')}
                  </p>
                </div>
              </div>

              {/* Mobile navigation */}
              <div className="space-y-2">
                {filteredNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="h-4 w-4 mr-3" />
                    {item.name}
                  </Link>
                ))}
              </div>

              {/* Mobile actions */}
              <div className="pt-4 border-t space-y-2">
                <Link href="/profile" className="block">
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                </Link>

                {user.role === 'admin' && (
                  <Link href="/admin" className="block">
                    <Button variant="ghost" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Admin Panel
                    </Button>
                  </Link>
                )}

                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </nav>
  )
}
