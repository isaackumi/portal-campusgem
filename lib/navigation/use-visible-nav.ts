'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/providers'
import type { UserRole } from '@/lib/types'
import {
  canSeeNavItem,
  filterSidebarSections,
  sidebarSettingsNavigation,
  type SidebarNavItem,
  type SidebarNavSection,
} from '@/lib/navigation/sidebar'

export type NavPage = SidebarNavItem & { section: string }

/**
 * The navigation the signed-in user may see. Shared by the sidebar and the header
 * search so both always agree on what exists. Empty until mounted, because the user
 * is only known on the client.
 */
export function useVisibleNav(): {
  sections: SidebarNavSection[]
  settings: SidebarNavItem[]
  /** Every visible item with its section title, settings included. */
  pages: NavPage[]
} {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const role = user?.role as UserRole | undefined
  const extra = user?.permissions

  return useMemo(() => {
    if (!mounted) return { sections: [], settings: [], pages: [] }
    const sections = filterSidebarSections(role, undefined, extra)
    const settings = sidebarSettingsNavigation.filter((item) => canSeeNavItem(role, item, extra))
    const pages: NavPage[] = [
      ...sections.flatMap((section) => section.items.map((item) => ({ ...item, section: section.title }))),
      ...settings.map((item) => ({ ...item, section: 'Settings' })),
    ]
    return { sections, settings, pages }
  }, [mounted, role, extra])
}
