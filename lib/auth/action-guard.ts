import 'server-only'

import { AsyncLocalStorage } from 'node:async_hooks'
import { cache } from 'react'
import type { AppUser } from '@/lib/types'
import { hasPermission, type Permission } from '@/lib/auth/roles'
import { getSessionUser } from '@/lib/auth/server-session'

/**
 * Server actions are public HTTP endpoints: anyone can call them, whatever the UI shows.
 * Every staff action starts with `await guard(...)`.
 *
 * Trust scope: once an entry point has been authorised (or is an intentionally public
 * entry point wrapped in `asSystem`), the helpers it calls internally are trusted, so
 * e.g. a public camp registration can still create the directory user it needs.
 */
const trustedScope = new AsyncLocalStorage<true>()

/** One session lookup per request, however many guarded calls run. */
const sessionUser = cache(async (): Promise<AppUser | null> => getSessionUser())

export async function optionalSessionUser(): Promise<AppUser | null> {
  try {
    return await sessionUser()
  } catch {
    return null
  }
}

/**
 * Require a signed-in user holding `permission` (or any of several). Throws otherwise.
 * Returns the user, or null when running inside a trusted scope.
 */
export async function guard(permission: Permission | Permission[]): Promise<AppUser | null> {
  if (trustedScope.getStore()) return null
  const user = await sessionUser()
  if (!user) throw new Error('Your session has expired. Sign in again.')
  const needed = Array.isArray(permission) ? permission : [permission]
  if (!needed.some((p) => hasPermission(user.role, p, user.permissions))) {
    throw new Error('You do not have permission to do this.')
  }
  // Nested actions called from here run on this authorisation.
  trustedScope.enterWith(true)
  return user
}

/** Run an intentionally public entry point (or cron job) with internal helpers trusted. */
export function asSystem<T>(fn: () => Promise<T>): Promise<T> {
  return trustedScope.run(true, fn)
}
