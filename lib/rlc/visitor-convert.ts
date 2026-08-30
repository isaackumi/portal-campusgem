import { generateRlcMembershipId } from '@/lib/membershipId'
import type { ConvertRlcVisitorForm, RlcMembershipType, Visitor } from '@/lib/types'

function optional(value?: string | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function visitorToConvertForm(
  visitor: Visitor,
  membershipType: RlcMembershipType = 'full_member'
): ConvertRlcVisitorForm {
  return {
    rlc_membership_type: membershipType,
    holy_ghost_baptism: false,
    full_name: optional([visitor.first_name, visitor.last_name].filter(Boolean).join(' ')),
    phone: optional(visitor.phone),
    email: optional(visitor.email),
    address: optional(visitor.address),
    dob: optional(visitor.date_of_birth),
    gender: visitor.gender,
    occupation: optional(visitor.occupation),
    place_of_work: optional(visitor.place_of_work),
    marital_status: visitor.marital_status,
    spouse_name: optional(visitor.spouse_name),
    emergency_contact_name: optional(visitor.emergency_contact_name),
    emergency_contact_phone: optional(visitor.emergency_contact_phone),
    emergency_contact_relation: optional(visitor.emergency_contact_relation),
    notes: optional(visitor.notes),
    membership_id: generateRlcMembershipId(visitor.phone),
  }
}
