import type { ChurchFormField } from '@/lib/types'

export const CAMPUS_MEMBER_REGISTRATION_CATEGORY = 'campus_member_registration'

export const CAMPUS_MEMBER_REGISTRATION_FIELDS: Array<{
  label: string
  description?: string
  field_type: ChurchFormField['field_type']
  required: boolean
  options?: string[]
  prefill_key?: string
  sort_order: number
}> = [
  {
    label: 'First name',
    field_type: 'short_text',
    required: true,
    prefill_key: 'first_name',
    sort_order: 0,
  },
  {
    label: 'Last name',
    field_type: 'short_text',
    required: true,
    prefill_key: 'last_name',
    sort_order: 1,
  },
  {
    label: 'Phone number',
    description: 'Ghana mobile number — used to find your previous camp records',
    field_type: 'phone',
    required: true,
    prefill_key: 'phone',
    sort_order: 2,
  },
  {
    label: 'Email',
    field_type: 'email',
    required: false,
    prefill_key: 'email',
    sort_order: 3,
  },
  {
    label: 'Sex',
    field_type: 'dropdown',
    required: true,
    prefill_key: 'sex',
    options: ['Male', 'Female'],
    sort_order: 4,
  },
  {
    label: 'Residence / area',
    field_type: 'short_text',
    required: true,
    prefill_key: 'residence',
    sort_order: 5,
  },
  {
    label: 'School / work address',
    field_type: 'long_text',
    required: false,
    prefill_key: 'address_school_work',
    sort_order: 6,
  },
  {
    label: 'Education level',
    field_type: 'dropdown',
    required: true,
    prefill_key: 'education_level',
    options: [
      'JHS 1',
      'JHS 2',
      'JHS 3',
      'SHS 1',
      'SHS 2',
      'SHS 3',
      'COMPLETED SHS',
      'LEVEL 100',
      'LEVEL 200',
      'LEVEL 300',
      'LEVEL 400',
      'GRADUATED',
      'POSTGRADUATE',
    ],
    sort_order: 7,
  },
  {
    label: 'Age bracket',
    field_type: 'dropdown',
    required: true,
    prefill_key: 'age_bracket',
    options: ['1-12', '13-19', '20-29', '30-39', '40-49', '50+'],
    sort_order: 8,
  },
  {
    label: 'Parent / guardian name',
    field_type: 'short_text',
    required: false,
    prefill_key: 'parent_name',
    sort_order: 9,
  },
  {
    label: 'Parent / guardian phone',
    field_type: 'phone',
    required: false,
    prefill_key: 'parent_contact',
    sort_order: 10,
  },
]
