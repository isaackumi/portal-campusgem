import type { ChurchForm } from '@/lib/types'
import { CAMP_MEETING_REGISTRATION_CATEGORY } from '@/lib/constants/camp-meeting'

/** Camp meeting forms always use phone lookup; other forms only when admin enables it. */
export function formHasProfileLookup(form: Pick<ChurchForm, 'category' | 'enable_profile_lookup'>): boolean {
  if (form.category === CAMP_MEETING_REGISTRATION_CATEGORY) return true
  return Boolean(form.enable_profile_lookup)
}

export function isCampMeetingRegistrationForm(form: Pick<ChurchForm, 'category'>): boolean {
  return form.category === CAMP_MEETING_REGISTRATION_CATEGORY
}
