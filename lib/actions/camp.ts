'use server'

import {
  CampRegistrationForm,
  CampYear,
  CampRegistration,
  CampInteraction,
  CampCommunication,
} from '@/lib/types'
import { revalidatePath } from 'next/cache'

function requireConvexEnv(): void {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is required for camp data')
  }
}

export async function getActiveCampYear(): Promise<{ data: CampYear | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { fetchActiveCampYearFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchActiveCampYearFromConvex()
    return { data, error: null }
  } catch (error: unknown) {
    console.error('Error fetching active camp year from Convex:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch active camp year from Convex',
    }
  }
}

export async function getOpenRegistrationCampYear(): Promise<{
  data: CampYear | null
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { fetchRegistrationYearFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchRegistrationYearFromConvex()
    return { data, error: null }
  } catch (error: unknown) {
    console.error('Error fetching open registration camp year from Convex:', error)
    return {
      data: null,
      error:
        error instanceof Error ? error.message : 'Failed to fetch open registration camp year from Convex',
    }
  }
}

export async function getCampYearById(yearId: string): Promise<{ data: CampYear | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { fetchCampYearByIdFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchCampYearByIdFromConvex(yearId)
    if (!data) return { data: null, error: 'Not found' }
    return { data, error: null }
  } catch (error: unknown) {
    console.error('Error fetching camp year from Convex:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch camp year',
    }
  }
}

export async function lookupCampRegistrationByPhone(
  phone: string,
  campYearId?: string
): Promise<{
  found: boolean
  already_registered_this_year: boolean
  previous_registrations: number
  profile: CampRegistration | null
  current_year_registration: CampRegistration | null
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { lookupCamperByPhoneFromConvex } = await import('@/lib/convex/camp-bridge')
    const result = await lookupCamperByPhoneFromConvex(phone, campYearId)
    return { ...result, error: null }
  } catch (error: unknown) {
    return {
      found: false,
      already_registered_this_year: false,
      previous_registrations: 0,
      profile: null,
      current_year_registration: null,
      error: error instanceof Error ? error.message : 'Failed to look up registration',
    }
  }
}

export async function getCampYearByYear(year: number): Promise<{ data: CampYear | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { fetchCampYearByYearFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchCampYearByYearFromConvex(year)
    if (!data) return { data: null, error: 'Not found' }
    return { data, error: null }
  } catch (error: unknown) {
    console.error('Error fetching camp year from Convex:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch camp year',
    }
  }
}

export async function registerCamper(formData: CampRegistrationForm): Promise<{
  success: boolean
  data?: CampRegistration
  error?: string
}> {
  requireConvexEnv()
  try {
    const { registerCamperViaConvex } = await import('@/lib/convex/camp-bridge')
    const updatedReg = await registerCamperViaConvex(formData)
    revalidatePath('/admin/camp-meeting')
    return { success: true, data: updatedReg }
  } catch (error: unknown) {
    console.error('Registration error (Convex):', error)
    const message = error instanceof Error ? error.message : 'Registration failed. Please try again.'
    return { success: false, error: message }
  }
}

export async function backfillCampCheckInCodes(campYearId: string): Promise<{
  data: { updated: number } | null
  error: string | null
}> {
  requireConvexEnv()
  const secret = process.env.CAMP_CONVEX_SERVER_SECRET
  if (!secret) {
    return { data: null, error: 'Server secret not configured for camp code backfill.' }
  }
  try {
    const { getConvexHttpClient } = await import('@/lib/convex/http-client')
    const { api } = await import('@/convex/_generated/api')
    const client = getConvexHttpClient()
    const result = (await client.mutation(api.camp.backfillCampCheckInCodesWithSecret, {
      secret,
      camp_year_id: campYearId,
    })) as { updated: number }
    revalidatePath('/admin/camp-meeting')
    revalidatePath('/admin/camp-meeting/registrations')
    revalidatePath('/admin/camp-meeting/scan')
    return { data: result, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to assign camp codes',
    }
  }
}

export async function getCampRegistrations(campYearId: string): Promise<{
  data: CampRegistration[] | null
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { fetchRegistrationsFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchRegistrationsFromConvex(campYearId)
    return { data, error: null }
  } catch (error: unknown) {
    console.error('Error in getCampRegistrations (Convex):', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch registrations',
    }
  }
}

export async function getCamperDirectory(): Promise<{
  data: import('@/lib/types').CampCamperDirectoryRow[]
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { fetchCamperDirectoryFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchCamperDirectoryFromConvex()
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Failed to load camper directory',
    }
  }
}

export async function getCampRegistrationById(
  id: string
): Promise<{ data: CampRegistration | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { fetchRegistrationFromConvex, fetchInteractionsFromConvex } = await import(
      '@/lib/convex/camp-bridge'
    )
    const data = await fetchRegistrationFromConvex(id)
    if (!data) return { data: null, error: 'Not found' }
    const interactions = await fetchInteractionsFromConvex(id)
    return { data: { ...data, interactions }, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load registration',
    }
  }
}

export async function patchCampRegistration(
  id: string,
  patch: Partial<CampRegistration> & Record<string, unknown>
): Promise<{ data: CampRegistration | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { fetchRegistrationFromConvex, patchRegistrationInConvex } = await import(
      '@/lib/convex/camp-bridge'
    )
    const previous = await fetchRegistrationFromConvex(id)
    const data = await patchRegistrationInConvex(id, patch)
    revalidatePath('/admin/camp-meeting')
    revalidatePath('/admin/camp-meeting/follow-up')

    const nextAssignee =
      patch.assigned_to === undefined
        ? undefined
        : patch.assigned_to === null
          ? null
          : String(patch.assigned_to)
    if (nextAssignee && nextAssignee !== previous?.assigned_to) {
      const { notifyFollowUpAssignment } = await import(
        '@/lib/services/camp-follow-up-notifications'
      )
      const { fetchCampYearByIdFromConvex } = await import('@/lib/convex/camp-bridge')
      const year = data.camp_year_id
        ? await fetchCampYearByIdFromConvex(data.camp_year_id)
        : null
      await notifyFollowUpAssignment({
        assigneeUserId: nextAssignee,
        camperName: data.full_name,
        registrationId: data.id,
        campYearId: data.camp_year_id,
        campYearLabel: year ? String(year.year) : undefined,
      })
    }

    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update registration',
    }
  }
}

export async function getCampCommunications(
  campYearId: string
): Promise<{ data: CampCommunication[] | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { fetchCampCommunicationsFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchCampCommunicationsFromConvex(campYearId)
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load communications',
    }
  }
}

export async function recordCampCommunication(
  communication: Omit<CampCommunication, 'id' | 'created_at'>
): Promise<{ data: CampCommunication | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { logCampCommunicationInConvex } = await import('@/lib/convex/camp-bridge')
    const data = await logCampCommunicationInConvex(communication)
    revalidatePath('/admin/camp-meeting/communications')
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to log communication',
    }
  }
}

export async function appendCampInteraction(data: {
  registration_id: string
  performed_by: string
  interaction_type: CampInteraction['interaction_type']
  notes?: string
}): Promise<{ data: CampInteraction | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { addInteractionInConvex } = await import('@/lib/convex/camp-bridge')
    const row = await addInteractionInConvex(data)
    return { data: row, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to add interaction',
    }
  }
}

export async function loadCampActivitiesForYear(
  campYearId: string
): Promise<{ data: unknown[] | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { fetchCampActivitiesFromConvex } = await import('@/lib/convex/camp-bridge')
    const raw = await fetchCampActivitiesFromConvex(campYearId)
    const data = raw.map((doc: unknown) => {
      const r = doc as Record<string, unknown>
      return { id: String(r._id ?? ''), ...r }
    })
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load activities',
    }
  }
}

export async function createCampActivityRecord(activity: Record<string, unknown>): Promise<{
  data: unknown | null
  error: string | null
}> {
  requireConvexEnv()
  const campYearId = String(activity.camp_year_id ?? '')
  try {
    const { createCampActivityInConvex } = await import('@/lib/convex/camp-bridge')
    const { camp_year_id: _c, ...rest } = activity
    const data = await createCampActivityInConvex(campYearId, rest as Record<string, unknown>)
    revalidatePath('/admin/camp-meeting/activities')
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to create activity',
    }
  }
}

export async function updateCampActivityRecord(
  id: string,
  patch: Record<string, unknown>
): Promise<{ data: unknown | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { updateCampActivityInConvex } = await import('@/lib/convex/camp-bridge')
    const data = await updateCampActivityInConvex(id, patch)
    revalidatePath('/admin/camp-meeting/activities')
    return { data, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update activity',
    }
  }
}

export async function deleteCampActivityRecord(id: string): Promise<{ error: string | null }> {
  requireConvexEnv()
  try {
    const { deleteCampActivityInConvex } = await import('@/lib/convex/camp-bridge')
    await deleteCampActivityInConvex(id)
    revalidatePath('/admin/camp-meeting/activities')
    return { error: null }
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? error.message : 'Failed to delete activity',
    }
  }
}

export async function createCampYear(yearData: {
  year: number
  theme: string
  start_date: string
  end_date: string
  is_active: boolean
  registration_open: boolean
  flyer_image_url?: string | null
  venue?: string
}): Promise<{ success: boolean; data?: CampYear; error?: string }> {
  requireConvexEnv()
  try {
    const { createCampYearInConvex } = await import('@/lib/convex/camp-bridge')
    const data = await createCampYearInConvex(yearData)
    revalidatePath('/admin/camp-meeting/years')
    return { success: true, data }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create camp year',
    }
  }
}

export async function updateCampYear(
  yearId: string,
  yearData: {
    theme: string
    start_date: string
    end_date: string
    is_active: boolean
    registration_open: boolean
    flyer_image_url?: string | null
    venue?: string
  }
): Promise<{ success: boolean; data?: CampYear; error?: string }> {
  requireConvexEnv()
  try {
    const { updateCampYearInConvex } = await import('@/lib/convex/camp-bridge')
    const data = await updateCampYearInConvex(yearId, yearData)
    revalidatePath('/admin/camp-meeting/years')
    return { success: true, data }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update camp year',
    }
  }
}

export async function toggleCampYearRegistration(
  yearId: string,
  currentStatus: boolean
): Promise<{ success: boolean; error?: string }> {
  requireConvexEnv()
  try {
    const { toggleCampYearRegistrationInConvex } = await import('@/lib/convex/camp-bridge')
    await toggleCampYearRegistrationInConvex(yearId, currentStatus)
    revalidatePath('/admin/camp-meeting/years')
    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle',
    }
  }
}

export async function setActiveCampYear(yearId: string): Promise<{ success: boolean; error?: string }> {
  requireConvexEnv()
  try {
    const { setActiveCampYearInConvex } = await import('@/lib/convex/camp-bridge')
    await setActiveCampYearInConvex(yearId)
    revalidatePath('/admin/camp-meeting/years')
    revalidatePath('/admin/camp-meeting')
    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set active year',
    }
  }
}

export async function deactivateCampYear(yearId: string): Promise<{ success: boolean; error?: string }> {
  requireConvexEnv()
  try {
    const { deactivateCampYearInConvex } = await import('@/lib/convex/camp-bridge')
    await deactivateCampYearInConvex(yearId)
    revalidatePath('/admin/camp-meeting/years')
    revalidatePath('/admin/camp-meeting')
    revalidatePath(`/admin/camp-meeting/years/${yearId}`)
    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate camp year',
    }
  }
}

export async function clearActiveCampYear(): Promise<{ success: boolean; error?: string }> {
  requireConvexEnv()
  try {
    const { clearActiveCampYearInConvex } = await import('@/lib/convex/camp-bridge')
    await clearActiveCampYearInConvex()
    revalidatePath('/admin/camp-meeting/years')
    revalidatePath('/admin/camp-meeting')
    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear active year',
    }
  }
}

export async function bulkPatchCampRegistrations(args: {
  registration_ids: string[]
  assigned_to?: string
  follow_up_status?: 'pending' | 'in_progress' | 'completed'
}): Promise<{ updated: number; error: string | null }> {
  requireConvexEnv()
  try {
    const { bulkPatchRegistrationsInConvex, fetchRegistrationFromConvex, fetchCampYearByIdFromConvex } =
      await import('@/lib/convex/camp-bridge')
    const registrations =
      args.assigned_to && args.registration_ids.length > 0
        ? (
            await Promise.all(args.registration_ids.map((id) => fetchRegistrationFromConvex(id)))
          ).filter((registration): registration is CampRegistration => registration != null)
        : []
    const updated = await bulkPatchRegistrationsInConvex(args)
    revalidatePath('/admin/camp-meeting')
    revalidatePath('/admin/camp-meeting/follow-up')

    if (args.assigned_to && updated > 0) {
      const { notifyFollowUpAssignment } = await import(
        '@/lib/services/camp-follow-up-notifications'
      )
      const campYearId = registrations[0]?.camp_year_id
      const year = campYearId ? await fetchCampYearByIdFromConvex(campYearId) : null
      await notifyFollowUpAssignment({
        assigneeUserId: args.assigned_to,
        assignedCount: updated,
        sampleNames: registrations.map((registration) => registration.full_name).slice(0, 5),
        campYearId,
        campYearLabel: year ? String(year.year) : undefined,
      })
    }

    return { updated, error: null }
  } catch (error: unknown) {
    return {
      updated: 0,
      error: error instanceof Error ? error.message : 'Failed to update registrations',
    }
  }
}

export async function getAllCampYears(): Promise<{ data: CampYear[] | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { fetchAllCampYearsFromConvex } = await import('@/lib/convex/camp-bridge')
    const data = await fetchAllCampYearsFromConvex()
    return { data, error: null }
  } catch (error: unknown) {
    console.error('Error fetching camp years (Convex):', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch camp years',
    }
  }
}

export async function promoteCampRegistrant(
  registrationId: string,
  args: {
    role: 'admin' | 'pastor' | 'elder' | 'finance_officer' | 'member' | 'visitor'
    birth_month?: number
    birth_day?: number
    birth_year?: number
  }
): Promise<{ data: CampRegistration | null; error: string | null }> {
  requireConvexEnv()
  try {
    const { promoteCampRegistrantInConvex } = await import('@/lib/convex/camp-bridge')
    const { registration } = await promoteCampRegistrantInConvex({
      registration_id: registrationId,
      role: args.role,
      birth_month: args.birth_month,
      birth_day: args.birth_day,
      birth_year: args.birth_year,
    })
    revalidatePath('/admin/camp-meeting')
    revalidatePath(`/admin/camp-meeting/registrations/${registrationId}`)
    return { data: registration, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to promote registrant',
    }
  }
}

export async function syncCampRegistrationDobToMember(registrationId: string): Promise<{
  data: boolean
  error: string | null
}> {
  requireConvexEnv()
  try {
    const { fetchRegistrationFromConvex } = await import('@/lib/convex/camp-bridge')
    const { fetchMemberByUserIdFromConvex, patchMemberInConvex } = await import('@/lib/convex/core-bridge')
    const { memberDobIsoFromCampRegistration } = await import('@/lib/camp/birthday')
    const reg = await fetchRegistrationFromConvex(registrationId)
    if (!reg) return { data: false, error: 'Registration not found' }
    if (!reg.user_id) return { data: false, error: 'Registration is not linked to a directory user yet.' }
    const dob = memberDobIsoFromCampRegistration({
      date_of_birth: reg.date_of_birth,
      birth_month: reg.birth_month,
      birth_day: reg.birth_day,
    })
    if (!dob) return { data: false, error: 'No birthday data on this registration.' }
    const member = await fetchMemberByUserIdFromConvex(reg.user_id)
    if (!member) return { data: false, error: 'Linked user has no member profile.' }
    await patchMemberInConvex(member.id, { dob })
    revalidatePath('/admin/camp-meeting')
    revalidatePath(`/admin/camp-meeting/registrations/${registrationId}`)
    revalidatePath('/dashboard')
    return { data: true, error: null }
  } catch (error: unknown) {
    return {
      data: false,
      error: error instanceof Error ? error.message : 'Failed to sync birthday',
    }
  }
}
