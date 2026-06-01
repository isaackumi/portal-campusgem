import type { FormTemplateField } from '@/lib/forms/templates'
import { optionalDateOfBirthField } from '@/lib/forms/form-dob-field'

export const CORPORATE_GEM_REGISTRATION_FIELDS: FormTemplateField[] = [
  {
    label: 'Full name',
    field_type: 'short_text',
    required: true,
    prefill_key: 'full_name',
    sort_order: 0,
  },
  {
    label: 'Gender',
    field_type: 'dropdown',
    required: true,
    prefill_key: 'sex',
    options: ['Male', 'Female'],
    sort_order: 1,
  },
  optionalDateOfBirthField(2),
  {
    label: 'Occupation / role',
    field_type: 'short_text',
    required: true,
    prefill_key: 'occupation',
    sort_order: 3,
  },
  {
    label: 'Place of work',
    field_type: 'short_text',
    required: false,
    prefill_key: 'place_of_work',
    sort_order: 4,
  },
  {
    label: 'What can you contribute to Corporate Gem?',
    field_type: 'long_text',
    required: false,
    prefill_key: 'ministry_contribution',
    sort_order: 5,
  },
  {
    label: 'Prayer request',
    field_type: 'long_text',
    required: false,
    prefill_key: 'prayer_request',
    sort_order: 6,
  },
  {
    label: 'Phone number',
    field_type: 'phone',
    required: true,
    prefill_key: 'phone',
    sort_order: 7,
  },
  {
    label: 'WhatsApp number',
    description: 'Leave blank if same as phone — we will use your phone number',
    field_type: 'phone',
    required: false,
    prefill_key: 'whatsapp',
    sort_order: 8,
  },
]
