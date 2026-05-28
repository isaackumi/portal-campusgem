import type { ChurchFormField } from '@/lib/types'
import { CAMPUS_REGISTRATION_FIELDS } from '@/lib/forms/templates'

export const CAMPUS_MEMBER_REGISTRATION_CATEGORY = 'campus_member_registration'

export const CAMPUS_MEMBER_REGISTRATION_FIELDS: Array<{
  label: string
  description?: string
  field_type: ChurchFormField['field_type']
  required: boolean
  options?: string[]
  prefill_key?: string
  sort_order: number
}> = CAMPUS_REGISTRATION_FIELDS
