import {
  CAMP_MEETING_FEEDBACK_CATEGORY,
  CAMP_MEETING_REGISTRATION_CATEGORY,
} from '@/lib/constants/camp-meeting'
import type { ChurchForm } from '@/lib/types'

export type FormModule = 'rlc' | 'camp_meeting' | 'outreach'

export const FORM_MODULE_LABELS: Record<FormModule, string> = {
  rlc: 'Redemption Light Chapel',
  camp_meeting: 'Camp meeting',
  outreach: 'Outreach & campus',
}

export const RLC_FORMS_CATEGORY = 'rlc'
export const DEFAULT_RLC_FORMS_GROUP_NAME = 'Redemption Light Chapel'
export const RLC_FORMS_GROUP_TYPE = 'rlc' as const

export function isFormModule(value: string | null | undefined): value is FormModule {
  return value === 'rlc' || value === 'camp_meeting' || value === 'outreach'
}

export function inferFormModule(
  form: Pick<ChurchForm, 'module' | 'camp_year_id' | 'category'>
): FormModule {
  if (form.module === 'rlc' || form.module === 'camp_meeting' || form.module === 'outreach') {
    return form.module
  }
  if (form.camp_year_id) return 'camp_meeting'
  if (
    form.category === CAMP_MEETING_REGISTRATION_CATEGORY ||
    form.category === CAMP_MEETING_FEEDBACK_CATEGORY
  ) {
    return 'camp_meeting'
  }
  if (form.category === RLC_FORMS_CATEGORY) return 'rlc'
  return 'outreach'
}

export function formMatchesModule(
  form: Pick<ChurchForm, 'module' | 'camp_year_id' | 'category'>,
  module: FormModule
): boolean {
  return inferFormModule(form) === module
}
