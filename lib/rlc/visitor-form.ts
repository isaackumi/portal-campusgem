import { RLC_SERVICES } from '@/lib/constants/rlc'
import type { CreateVisitorForm, Visitor } from '@/lib/types'

export function serviceAttendedToSelectValue(stored?: string): string {
  if (!stored) return 'sunday_service'
  const byLabel = RLC_SERVICES.find((s) => s.label === stored)
  if (byLabel) return byLabel.value
  const byValue = RLC_SERVICES.find((s) => s.value === stored)
  if (byValue) return byValue.value
  return stored
}

export function serviceSelectValueToLabel(value?: string): string {
  if (!value) return ''
  return RLC_SERVICES.find((s) => s.value === value)?.label ?? value
}

export function visitorToForm(visitor: Visitor): CreateVisitorForm {
  return {
    first_name: visitor.first_name,
    middle_name: visitor.middle_name,
    last_name: visitor.last_name,
    phone: visitor.phone,
    secondary_phone: visitor.secondary_phone,
    whatsapp: visitor.whatsapp ?? visitor.phone,
    email: visitor.email,
    address: visitor.address,
    hometown: visitor.hometown,
    area_of_residence: visitor.area_of_residence,
    school_or_workplace: visitor.school_or_workplace,
    place_of_work: visitor.place_of_work,
    visit_date: visitor.visit_date,
    service_attended: serviceAttendedToSelectValue(visitor.service_attended),
    how_heard_about_church: visitor.how_heard_about_church,
    invited_by_member_ids: visitor.invited_by_member_ids ?? [],
    assigned_follow_up_member_id: visitor.assigned_follow_up_member_id,
    follow_up_notes: visitor.follow_up_notes,
    follow_up_date: visitor.follow_up_date,
    follow_up_status: visitor.follow_up_status,
    pipeline_status: visitor.pipeline_status,
    source: visitor.source,
    gender: visitor.gender,
    date_of_birth: visitor.date_of_birth,
    occupation: visitor.occupation,
    marital_status: visitor.marital_status,
    spouse_name: visitor.spouse_name,
    children_count: visitor.children_count,
    emergency_contact_name: visitor.emergency_contact_name,
    emergency_contact_phone: visitor.emergency_contact_phone,
    emergency_contact_relation: visitor.emergency_contact_relation,
    prayer_request: visitor.prayer_request,
    notes: visitor.notes,
    is_first_timer: visitor.is_first_timer,
    interested_in_baptism: visitor.interested_in_baptism,
    interested_in_membership: visitor.interested_in_membership,
  }
}
