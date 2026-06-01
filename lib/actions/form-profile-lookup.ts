'use server'

import { lookupCampRegistrationByPhone } from '@/lib/actions/camp'
import {
  appUserToPrefillProfile,
  applyProfilePrefill,
  campRegistrationToPrefillProfile,
  type FormPrefillProfile,
} from '@/lib/forms/prefill'
import { isCampMeetingRegistrationForm } from '@/lib/forms/profile-lookup'
import type { ChurchFormField } from '@/lib/types'
import { isValidPhone } from '@/lib/phone'

export type FormProfileLookupResult = {
  found: boolean
  source: 'camp' | 'directory' | null
  profile: FormPrefillProfile | null
  display_name?: string
  already_submitted: boolean
  already_registered_this_year?: boolean
  submitted_at?: string
  error: string | null
}

export async function checkFormSubmissionByPhone(
  slug: string,
  phone: string
): Promise<{ already_submitted: boolean; submitted_at: string | null; error: string | null }> {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return { already_submitted: false, submitted_at: null, error: 'Forms are not configured' }
  }
  if (!isValidPhone(phone)) {
    return { already_submitted: false, submitted_at: null, error: null }
  }
  try {
    const { checkFormSubmissionByPhoneFromConvex } = await import('@/lib/convex/forms-bridge')
    const result = await checkFormSubmissionByPhoneFromConvex(slug, phone)
    return {
      already_submitted: result.already_submitted,
      submitted_at: result.submitted_at ? new Date(result.submitted_at).toISOString() : null,
      error: null,
    }
  } catch (error: unknown) {
    return {
      already_submitted: false,
      submitted_at: null,
      error: error instanceof Error ? error.message : 'Could not verify submission status',
    }
  }
}

export async function lookupFormProfileByPhone(
  slug: string,
  phone: string,
  currentValues: Record<string, unknown>
): Promise<FormProfileLookupResult & { values?: Record<string, unknown>; filledCount?: number }> {
  if (!isValidPhone(phone)) {
    return {
      found: false,
      source: null,
      profile: null,
      already_submitted: false,
      error: 'Enter a valid Ghana phone number',
    }
  }

  const submission = await checkFormSubmissionByPhone(slug, phone)

  let fields: ChurchFormField[] = []
  let campYearId: string | undefined
  let isCampForm = false
  try {
    const { getPublishedFormBySlugFromConvex } = await import('@/lib/convex/forms-bridge')
    const published = await getPublishedFormBySlugFromConvex(slug)
    fields = published?.fields ?? []
    campYearId = published?.form.camp_year_id
    isCampForm = isCampMeetingRegistrationForm(published?.form ?? { category: 'general' })
  } catch {
    fields = []
  }

  const camp = await lookupCampRegistrationByPhone(phone, campYearId)
  if (camp.error) {
    return {
      found: false,
      source: null,
      profile: null,
      already_submitted: submission.already_submitted,
      submitted_at: submission.submitted_at ?? undefined,
      error: camp.error,
    }
  }

  const alreadyRegisteredThisYear = Boolean(camp.already_registered_this_year)
  const blocked =
    submission.already_submitted || (isCampForm && alreadyRegisteredThisYear)

  let profile: FormPrefillProfile | null = null
  let source: 'camp' | 'directory' | null = null
  let display_name: string | undefined

  if (camp.profile) {
    profile = campRegistrationToPrefillProfile(camp.profile)
    source = 'camp'
    display_name = camp.profile.full_name
  } else if (process.env.CAMP_CONVEX_SERVER_SECRET) {
    try {
      const { findUserByPhoneFromConvex } = await import('@/lib/convex/core-bridge')
      const user = await findUserByPhoneFromConvex(phone)
      if (user) {
        const { fetchMemberByUserIdFromConvex } = await import('@/lib/convex/core-bridge')
        const member = await fetchMemberByUserIdFromConvex(user.id)
        profile = appUserToPrefillProfile(user, member)
        source = 'directory'
        display_name = user.full_name
      }
    } catch {
      // directory lookup optional
    }
  }

  if (!profile) {
    return {
      found: false,
      source: null,
      profile: null,
      already_submitted: blocked,
      already_registered_this_year: isCampForm ? alreadyRegisteredThisYear : undefined,
      submitted_at: submission.submitted_at ?? undefined,
      error: null,
    }
  }

  const phoneField = fields.find((f) => f.field_type === 'phone' || f.prefill_key === 'phone')
  const { values, filledCount } = applyProfilePrefill(
    fields,
    profile,
    phoneField ? { ...currentValues, [phoneField.id]: phone } : currentValues
  )

  return {
    found: true,
    source,
    profile,
    display_name,
    already_submitted: blocked,
    already_registered_this_year: isCampForm ? alreadyRegisteredThisYear : undefined,
    submitted_at: submission.submitted_at ?? undefined,
    values,
    filledCount,
    error: null,
  }
}
