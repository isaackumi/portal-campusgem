import type { ChurchFormField } from '@/lib/types'
import {
  CAMP_MEETING_REGISTRATION_CATEGORY,
  DEFAULT_EAGLES_CAMP_MEETING_GROUP_NAME,
} from '@/lib/constants/camp-meeting'
import {
  CORPORATE_GEM_REGISTRATION_CATEGORY,
  STUDENT_REGISTRATION_CATEGORY,
} from '@/lib/constants/corporate-gem'
import { CAMP_MEETING_REGISTRATION_FIELDS } from '@/lib/forms/camp-meeting-registration-fields'
import { CORPORATE_GEM_REGISTRATION_FIELDS } from '@/lib/forms/corporate-gem-registration-fields'
import { STUDENT_REGISTRATION_FIELDS } from '@/lib/forms/student-registration-fields'

export const CAMPUS_MEMBER_REGISTRATION_CATEGORY = 'campus_member_registration'
export const OUTREACH_SIGNUP_CATEGORY = 'outreach_signup'
export {
  STUDENT_REGISTRATION_CATEGORY,
  CORPORATE_GEM_REGISTRATION_CATEGORY,
  CAMP_MEETING_REGISTRATION_CATEGORY,
}

export type FormTemplateId =
  | 'blank'
  | 'campus_registration'
  | 'student_registration'
  | 'corporate_gem_registration'
  | 'camp_meeting_registration'
  | 'outreach_signup'

export type FormTemplateField = {
  label: string
  description?: string
  field_type: ChurchFormField['field_type']
  required: boolean
  options?: string[]
  prefill_key?: string
  sort_order: number
}

export type FormTemplate = {
  id: FormTemplateId
  label: string
  description: string
  category: string
  enable_profile_lookup: boolean
  capture_respondent_location: boolean
  defaultTitle: (groupName?: string) => string
  defaultDescription: (groupName?: string) => string
  fields: FormTemplateField[]
}

export const CAMPUS_REGISTRATION_FIELDS: FormTemplateField[] = [
  { label: 'First name', field_type: 'short_text', required: true, prefill_key: 'first_name', sort_order: 0 },
  { label: 'Last name', field_type: 'short_text', required: true, prefill_key: 'last_name', sort_order: 1 },
  {
    label: 'Phone number',
    description: 'Ghana mobile number — used to find your previous camp records',
    field_type: 'phone',
    required: true,
    prefill_key: 'phone',
    sort_order: 2,
  },
  { label: 'Email', field_type: 'email', required: false, prefill_key: 'email', sort_order: 3 },
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

const OUTREACH_SIGNUP_FIELDS: FormTemplateField[] = [
  {
    label: 'Full name',
    field_type: 'short_text',
    required: true,
    prefill_key: 'full_name',
    sort_order: 0,
  },
  {
    label: 'Phone number',
    description: 'We use this to avoid duplicate sign-ups and load your details if you joined us before',
    field_type: 'phone',
    required: true,
    prefill_key: 'phone',
    sort_order: 1,
  },
  { label: 'Email', field_type: 'email', required: false, prefill_key: 'email', sort_order: 2 },
  {
    label: 'Area / neighbourhood',
    field_type: 'short_text',
    required: false,
    prefill_key: 'residence',
    sort_order: 3,
  },
  {
    label: 'How did you hear about us?',
    field_type: 'dropdown',
    required: false,
    options: ['Friend', 'Social media', 'Campus visit', 'Church service', 'Other'],
    sort_order: 4,
  },
  {
    label: 'Anything else you want us to know?',
    field_type: 'long_text',
    required: false,
    sort_order: 5,
  },
]

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: 'blank',
    label: 'Blank form',
    description: 'Start with no questions — add your own in the editor.',
    category: 'general',
    enable_profile_lookup: false,
    capture_respondent_location: false,
    defaultTitle: () => 'New form',
    defaultDescription: () => '',
    fields: [],
  },
  {
    id: 'campus_registration',
    label: 'Campus member registration',
    description: 'Full onboarding with education, residence, and camp prefill keys.',
    category: CAMPUS_MEMBER_REGISTRATION_CATEGORY,
    enable_profile_lookup: false,
    capture_respondent_location: false,
    defaultTitle: (groupName) => (groupName ? `${groupName} — Member registration` : 'Member registration'),
    defaultDescription: (groupName) =>
      groupName
        ? `Join ${groupName} at Campus Gem Ministries. Fill in your details below.`
        : 'Campus member registration form.',
    fields: CAMPUS_REGISTRATION_FIELDS,
  },
  {
    id: 'student_registration',
    label: 'Student registration',
    description:
      'Full name, university, gender, program, level, hall, ministry & prayer, phone, WhatsApp, location & comments.',
    category: STUDENT_REGISTRATION_CATEGORY,
    enable_profile_lookup: false,
    capture_respondent_location: false,
    defaultTitle: (groupName) => (groupName ? `${groupName} — Student sign-up` : 'Student registration'),
    defaultDescription: (groupName) =>
      groupName
        ? `Register as a student with ${groupName}. Your university is prefilled from this campus.`
        : 'Student registration for campus fellowship.',
    fields: STUDENT_REGISTRATION_FIELDS,
  },
  {
    id: 'camp_meeting_registration',
    label: 'Camp meeting registration',
    description:
      'Camp sign-up with phone lookup, education & age, optional location and comments.',
    category: CAMP_MEETING_REGISTRATION_CATEGORY,
    enable_profile_lookup: true,
    capture_respondent_location: false,
    defaultTitle: (groupName) =>
      groupName
        ? `${groupName} registration`
        : `${DEFAULT_EAGLES_CAMP_MEETING_GROUP_NAME} registration`,
    defaultDescription: (groupName) =>
      groupName
        ? `Register for ${groupName}.`
        : `Register for ${DEFAULT_EAGLES_CAMP_MEETING_GROUP_NAME}.`,
    fields: CAMP_MEETING_REGISTRATION_FIELDS,
  },
  {
    id: 'corporate_gem_registration',
    label: 'Corporate Gem registration',
    description: 'Workers and graduates — join Corporate Gem after campus.',
    category: CORPORATE_GEM_REGISTRATION_CATEGORY,
    enable_profile_lookup: false,
    capture_respondent_location: false,
    defaultTitle: (groupName) => (groupName ? `${groupName} — Corporate Gem` : 'Corporate Gem registration'),
    defaultDescription: () =>
      'For graduates and working professionals joining Corporate Gem Ministries.',
    fields: CORPORATE_GEM_REGISTRATION_FIELDS,
  },
  {
    id: 'outreach_signup',
    label: 'Outreach / event sign-up',
    description: 'Short sign-up with phone lookup and optional GPS location capture.',
    category: OUTREACH_SIGNUP_CATEGORY,
    enable_profile_lookup: false,
    capture_respondent_location: true,
    defaultTitle: (groupName) => (groupName ? `${groupName} — Sign up` : 'Outreach sign-up'),
    defaultDescription: (groupName) =>
      groupName
        ? `Register your interest for ${groupName}.`
        : 'Sign up for this outreach or event.',
    fields: OUTREACH_SIGNUP_FIELDS,
  },
]

export function getFormTemplate(id: FormTemplateId): FormTemplate {
  return FORM_TEMPLATES.find((t) => t.id === id) ?? FORM_TEMPLATES[0]
}
