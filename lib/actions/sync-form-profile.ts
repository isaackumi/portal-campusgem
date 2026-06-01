'use server'

import type { ChurchFormField } from '@/lib/types'
import { memberDobIsoFromCampRegistration } from '@/lib/camp/birthday'
import { buildPrefillMapFromFormValues } from '@/lib/forms/extract-prefill-values'
import { ensureDirectoryUserFromCampContact } from '@/lib/actions/ensure-camp-directory-user'

/**
 * After a public form submit, enrich directory profiles when we can match by phone.
 * Fills missing member DOB and links camp registrations when applicable.
 */
export async function syncDirectoryProfileFromFormSubmit(input: {
  fields: ChurchFormField[]
  values: Record<string, unknown>
  respondent_phone?: string
  respondent_name?: string
  respondent_email?: string
  camp_registration_id?: string
}): Promise<{ updated: boolean; error: string | null }> {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return { updated: false, error: null }
  }

  const prefill = buildPrefillMapFromFormValues(input.fields, input.values)
  const phone = (
    input.respondent_phone?.trim() ||
    String(prefill.get('phone') ?? '').trim() ||
    String(prefill.get('parent_contact') ?? '').trim()
  )
  if (!phone) return { updated: false, error: null }

  const fullName =
    input.respondent_name?.trim() ||
    String(prefill.get('full_name') ?? '').trim() ||
    [prefill.get('first_name'), prefill.get('last_name')].filter(Boolean).join(' ').trim()
  if (!fullName) return { updated: false, error: null }

  const email =
    input.respondent_email?.trim() || String(prefill.get('email') ?? '').trim() || undefined
  const dobRaw = String(prefill.get('date_of_birth') ?? '').trim()
  const dobIso = dobRaw
    ? memberDobIsoFromCampRegistration({ date_of_birth: dobRaw })
    : undefined

  try {
    const { data: ensured, error: ensureError } = await ensureDirectoryUserFromCampContact({
      full_name: fullName,
      phone,
      email,
      registrationId: input.camp_registration_id,
    })
    if (ensureError || !ensured?.userId) {
      return { updated: false, error: ensureError }
    }

    if (!dobIso) return { updated: Boolean(ensured.created), error: null }

    const { fetchMemberByUserIdFromConvex, patchMemberInConvex } = await import(
      '@/lib/convex/core-bridge'
    )
    const member = await fetchMemberByUserIdFromConvex(ensured.userId)
    if (!member) return { updated: Boolean(ensured.created), error: null }

    if (member.dob?.trim()) {
      return { updated: Boolean(ensured.created), error: null }
    }

    await patchMemberInConvex(member.id, { dob: dobIso })
    return { updated: true, error: null }
  } catch (error: unknown) {
    return {
      updated: false,
      error: error instanceof Error ? error.message : 'Profile sync failed',
    }
  }
}
