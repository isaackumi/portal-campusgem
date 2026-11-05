'use server'

import { guard } from '@/lib/auth/action-guard'

/**
 * "My campus" on /me. Self-scoped: these only ever read or move the SESSION user; no user
 * id is accepted from the browser.
 */

type Result<T> = { data: T | null; error: string | null }

export type MyCampusView = {
  current: { group_id: string; name: string; label: string; role: string } | null
  options: Array<{ id: string; name: string; label: string }>
}

export async function getMyCampusAction(): Promise<Result<MyCampusView>> {
  const user = await guard('dashboard.view')
  try {
    if (!user) throw new Error('Sign in again.')
    const b = await import('@/lib/convex/campus-bridge')
    const [current, campuses] = await Promise.all([b.currentCampusForUserFromConvex(user.id), b.listCampusesFromConvex()])
    return {
      data: {
        current: current
          ? { group_id: current.group_id, name: current.name, label: current.short_code || current.name, role: current.role }
          : null,
        options: campuses.map((c) => ({ id: c.id, name: c.name, label: c.short_code || c.name })),
      },
      error: null,
    }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Could not load your campus' }
  }
}

export async function setMyCampusAction(
  groupId: string,
  confirmMove = false
): Promise<Result<{ status: 'added' | 'unchanged' | 'moved' | 'needs_move'; from?: string }>> {
  const user = await guard('dashboard.view')
  try {
    if (!user) throw new Error('Sign in again.')
    const b = await import('@/lib/convex/campus-bridge')
    const current = await b.currentCampusForUserFromConvex(user.id)
    // Leaving a leadership seat is an admin decision, not a self-service one.
    if (current && current.group_id !== groupId && current.role !== 'member' && current.role !== 'volunteer') {
      return { data: null, error: `You serve as ${current.role.replace('_', '-')} at ${current.short_code || current.name}. Ask an administrator to move you.` }
    }
    const result = await b.placeUserOnCampusInConvex({
      group_id: String(groupId),
      user_id: user.id,
      role: 'member',
      confirm_move: Boolean(confirmMove),
      keep_existing_role: true,
      protect_leaders: true,
    })
    if (result.status === 'blocked_leader') {
      return { data: null, error: 'Ask an administrator to move you.' }
    }
    if (result.status === 'needs_move') {
      return { data: { status: 'needs_move', from: result.from.short_code || result.from.name }, error: null }
    }
    return { data: { status: result.status, from: result.from?.short_code || result.from?.name }, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Could not change your campus' }
  }
}
