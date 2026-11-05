'use server'

import { headers } from 'next/headers'
import { asSystem } from '@/lib/auth/action-guard'
import { createWindowLimiter, joinMembershipNote, validateCampusJoin } from '@/lib/campus/join'

/**
 * Public campus join link (/join/<slug>). Intentionally public: wrapped in `asSystem`.
 * Looks the person up by phone; an existing person keeps their name and role (only empty
 * fields are filled), a new person becomes a campus_gem member. Lightly rate-limited.
 */

const viewLimiter = createWindowLimiter({ limit: 60, windowMs: 60_000 })
const ipLimiter = createWindowLimiter({ limit: 8, windowMs: 10 * 60_000 })
const phoneLimiter = createWindowLimiter({ limit: 4, windowMs: 10 * 60_000 })

async function clientIp(): Promise<string> {
  try {
    const h = await headers()
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  } catch {
    return 'unknown'
  }
}

export type PublicCampus = { key: string; name: string; label: string }

export async function getPublicCampusAction(key: string): Promise<PublicCampus | null> {
  return asSystem(async () => {
    if (typeof key !== 'string' || !/^[a-z0-9-]{2,64}$/i.test(key)) return null
    if (!viewLimiter.allow(await clientIp())) return null
    try {
      const { findCampusFromConvex } = await import('@/lib/convex/campus-bridge')
      const group = await findCampusFromConvex(key)
      if (!group || !group.is_active) return null
      return { key, name: group.name, label: group.short_code || group.name }
    } catch {
      return null
    }
  })
}

export type CampusJoinResult =
  | { status: 'joined' | 'already' | 'moved'; name: string; label: string }
  | { status: 'needs_move'; from: string; label: string }

export async function submitCampusJoinAction(
  key: string,
  input: unknown,
  confirmMove = false
): Promise<{ data: CampusJoinResult | null; error: string | null }> {
  return asSystem(async () => {
    const { data: clean, error } = validateCampusJoin(input)
    if (!clean) return { data: null, error }
    const ip = await clientIp()
    if (!ipLimiter.allow(ip) || !phoneLimiter.allow(clean.phone)) {
      return { data: null, error: 'Too many tries. Please wait a few minutes and try again.' }
    }
    try {
      const { findCampusFromConvex, joinCampusByPhoneInConvex } = await import('@/lib/convex/campus-bridge')
      const group = typeof key === 'string' ? await findCampusFromConvex(key) : null
      if (!group || !group.is_active) return { data: null, error: 'This join link is no longer active.' }
      const { generateMembershipId, normalizeMembershipId } = await import('@/lib/membershipId')
      const label = group.short_code || group.name
      const result = await joinCampusByPhoneInConvex({
        group_id: group.id,
        full_name: clean.full_name,
        phone: clean.phone,
        whatsapp: clean.whatsapp,
        area_of_residence: clean.hall,
        notes: joinMembershipNote(clean),
        membership_id: normalizeMembershipId(generateMembershipId(clean.phone)),
        auth_uid: crypto.randomUUID(),
        // A public link must never move someone off another campus: anyone can type any
        // phone number here. Moves go through campus leaders, the office or My GEM.
        confirm_move: false,
        protect_leaders: true,
      })
      const first = clean.full_name.split(' ')[0]
      if (result.status === 'blocked_leader' || result.status === 'needs_move') {
        // Same answer for both, and no campus named: don't reveal anything about a number.
        return {
          data: null,
          error: `This number is already with another campus fellowship. To move to ${label}, sign in and change your campus on My GEM, or ask your campus leader.`,
        }
      }
      return {
        data: { status: result.status === 'unchanged' ? 'already' : result.status === 'moved' ? 'moved' : 'joined', name: first, label },
        error: null,
      }
    } catch (err) {
      console.error('[campus-join] failed', err)
      return { data: null, error: 'Something went wrong. Please try again.' }
    }
  })
}
