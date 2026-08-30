import { phoneLast9 } from '@/lib/rlc/camp-bridge'
import type { CampRegistration, Member, Visitor } from '@/lib/types'

export type CampRlcImportStatus = 'available' | 'rlc_visitor' | 'rlc_member'

export type CampBulkImportCandidate = {
  registration: CampRegistration
  status: CampRlcImportStatus
  linked_id?: string
}

export function classifyCampRegistrationForRlc(
  registration: CampRegistration,
  visitors: Visitor[],
  members: Member[]
): { status: CampRlcImportStatus; linked_id?: string } {
  const regPhone = phoneLast9(registration.phone)

  for (const member of members) {
    const congregation = member.congregation
    if (congregation !== 'rlc' && congregation !== 'both') continue
    const memberPhone = phoneLast9(member.user?.phone)
    if (regPhone && memberPhone && regPhone === memberPhone) {
      return { status: 'rlc_member', linked_id: member.id }
    }
  }

  for (const visitor of visitors) {
    if (visitor.congregation !== 'rlc' || visitor.is_active === false) continue
    if (visitor.source_camp_registration_id === registration.id) {
      return { status: 'rlc_visitor', linked_id: visitor.id }
    }
    const visitorPhone = phoneLast9(visitor.phone ?? visitor.secondary_phone)
    if (regPhone && visitorPhone && regPhone === visitorPhone) {
      return { status: 'rlc_visitor', linked_id: visitor.id }
    }
  }

  return { status: 'available' }
}

export function buildCampBulkImportCandidates(
  registrations: CampRegistration[],
  visitors: Visitor[],
  members: Member[]
): CampBulkImportCandidate[] {
  return registrations
    .map((registration) => {
      const { status, linked_id } = classifyCampRegistrationForRlc(registration, visitors, members)
      return { registration, status, linked_id }
    })
    .sort((a, b) => a.registration.full_name.localeCompare(b.registration.full_name))
}

export function filterCampBulkImportCandidates(
  rows: CampBulkImportCandidate[],
  args: { query?: string; onlyAvailable?: boolean }
): CampBulkImportCandidate[] {
  let list = rows
  if (args.onlyAvailable !== false) {
    list = list.filter((row) => row.status === 'available')
  }

  const needle = args.query?.trim().toLowerCase() ?? ''
  if (!needle) return list

  return list.filter((row) => {
    const reg = row.registration
    const hay = [reg.full_name, reg.phone, reg.email, reg.role].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(needle)
  })
}
