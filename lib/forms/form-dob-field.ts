import type { FormTemplateField } from '@/lib/forms/templates'

/** Optional DOB — gradually enriches directory profiles when matched by phone. */
export function optionalDateOfBirthField(sort_order: number): FormTemplateField {
  return {
    label: 'Date of birth',
    description:
      'Optional — must be your real birth date (not today). Campers must be at least 10 years old.',
    field_type: 'date',
    required: false,
    prefill_key: 'date_of_birth',
    sort_order,
  }
}
