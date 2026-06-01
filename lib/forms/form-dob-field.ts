import type { FormTemplateField } from '@/lib/forms/templates'

/** Optional DOB — gradually enriches directory profiles when matched by phone. */
export function optionalDateOfBirthField(sort_order: number): FormTemplateField {
  return {
    label: 'Date of birth',
    description: 'Optional — helps us celebrate your birthday and keep your profile up to date',
    field_type: 'date',
    required: false,
    prefill_key: 'date_of_birth',
    sort_order,
  }
}
