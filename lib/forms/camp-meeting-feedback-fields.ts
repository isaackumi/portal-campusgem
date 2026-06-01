import type { FormTemplateField } from '@/lib/forms/templates'

/** Post–camp meeting review / feedback (share after the event). */
export const CAMP_MEETING_FEEDBACK_FIELDS: FormTemplateField[] = [
  {
    label: 'Full name',
    field_type: 'short_text',
    required: true,
    prefill_key: 'full_name',
    sort_order: 0,
  },
  {
    label: 'Phone number',
    description: 'Ghana mobile — used to match your registration',
    field_type: 'phone',
    required: true,
    prefill_key: 'phone',
    sort_order: 1,
  },
  {
    label: 'Email',
    field_type: 'email',
    required: false,
    prefill_key: 'email',
    sort_order: 2,
  },
  {
    label: 'Overall experience',
    field_type: 'dropdown',
    required: true,
    options: ['Excellent', 'Good', 'Fair', 'Poor'],
    sort_order: 3,
  },
  {
    label: 'What did you enjoy most?',
    field_type: 'long_text',
    required: false,
    sort_order: 4,
  },
  {
    label: 'How can we improve next time?',
    field_type: 'long_text',
    required: false,
    sort_order: 5,
  },
  {
    label: 'Would you attend again?',
    field_type: 'radio',
    required: true,
    options: ['Yes', 'Maybe', 'No'],
    sort_order: 6,
  },
  {
    label: 'Anything else you want us to know?',
    field_type: 'long_text',
    required: false,
    sort_order: 7,
  },
]
