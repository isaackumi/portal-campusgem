/**
 * Map between Firestore documents (camelCase) and app types (snake_case).
 * Firestore stores camelCase; the rest of the app uses snake_case.
 */

import type { Member, AppUser, Attendance, Group } from '@/lib/types'

type DocData = Record<string, any>

function ts(v: any): string | undefined {
  if (v == null) return undefined
  if (typeof v?.toDate === 'function') return v.toDate().toISOString()
  if (typeof v === 'string') return v
  return undefined
}

/** Firestore member doc -> Member */
export function toMember(id: string, data: DocData): Member {
  return {
    id,
    user_id: data.userId ?? data.user_id ?? '',
    dob: data.dob,
    gender: data.gender,
    address: data.address,
    emergency_contacts: data.emergencyContacts ?? data.emergency_contacts ?? [],
    profile_photo: data.profilePhoto ?? data.profile_photo,
    documents: data.documents ?? [],
    status: data.status ?? 'active',
    notes: data.notes,
    created_at: ts(data.createdAt) ?? ts(data.created_at) ?? '',
    updated_at: ts(data.updatedAt) ?? ts(data.updated_at) ?? '',
  }
}

/** Member (app) -> Firestore fields (camelCase) */
export function toFirestoreMember(m: Partial<Member>): DocData {
  const d: DocData = {}
  if (m.user_id !== undefined) d.userId = m.user_id
  if (m.dob !== undefined) d.dob = m.dob
  if (m.gender !== undefined) d.gender = m.gender
  if (m.address !== undefined) d.address = m.address
  if (m.emergency_contacts !== undefined) d.emergencyContacts = m.emergency_contacts
  if (m.profile_photo !== undefined) d.profilePhoto = m.profile_photo
  if (m.documents !== undefined) d.documents = m.documents
  if (m.status !== undefined) d.status = m.status
  if (m.notes !== undefined) d.notes = m.notes
  return d
}

/** Firestore user doc -> AppUser */
export function toAppUser(id: string, data: DocData): AppUser {
  return {
    id,
    auth_uid: data.authUid ?? data.auth_uid,
    membership_id: data.membershipId ?? data.membership_id ?? '',
    phone: data.phone,
    email: data.email,
    full_name: data.fullName ?? data.full_name ?? '',
    role: data.role ?? 'member',
    join_year: data.joinYear ?? data.join_year ?? new Date().getFullYear(),
    created_at: ts(data.createdAt) ?? ts(data.created_at) ?? '',
    updated_at: ts(data.updatedAt) ?? ts(data.updated_at) ?? '',
  }
}

/** Firestore attendance doc -> Attendance */
export function toAttendance(id: string, data: DocData): Attendance {
  return {
    id,
    member_id: data.memberId ?? data.member_id,
    dependant_id: data.dependantId ?? data.dependant_id,
    service_date: data.serviceDate ?? data.service_date,
    service_type: data.serviceType ?? data.service_type,
    check_in_time: ts(data.checkInTime) ?? ts(data.check_in_time) ?? '',
    method: data.method ?? 'qr',
    metadata: data.metadata ?? {},
    client_uuid: data.clientUuid ?? data.client_uuid,
    created_by: data.createdBy ?? data.created_by,
    checked_in_by: data.checkedInBy ?? data.checked_in_by,
    created_at: ts(data.createdAt) ?? ts(data.created_at) ?? '',
  }
}

/** Attendance (app) -> Firestore fields */
export function toFirestoreAttendance(a: Partial<Attendance>): DocData {
  const d: DocData = {}
  if (a.member_id !== undefined) d.memberId = a.member_id
  if (a.dependant_id !== undefined) d.dependantId = a.dependant_id
  if (a.service_date !== undefined) d.serviceDate = a.service_date
  if (a.service_type !== undefined) d.serviceType = a.service_type
  if (a.check_in_time !== undefined) d.checkInTime = a.check_in_time
  if (a.method !== undefined) d.method = a.method
  if (a.metadata !== undefined) d.metadata = a.metadata
  if (a.client_uuid !== undefined) d.clientUuid = a.client_uuid
  if (a.created_by !== undefined) d.createdBy = a.created_by
  if (a.checked_in_by !== undefined) d.checkedInBy = a.checked_in_by
  return d
}

/** Firestore group doc -> Group */
export function toGroup(id: string, data: DocData): Group {
  return {
    id,
    name: data.name ?? '',
    description: data.description,
    group_type: data.groupType ?? data.group_type ?? 'ministry',
    leader_id: data.leaderId ?? data.leader_id,
    co_leader_id: data.coLeaderId ?? data.co_leader_id,
    meeting_schedule: data.meetingSchedule ?? data.meeting_schedule,
    meeting_location: data.meetingLocation ?? data.meeting_location,
    is_active: data.isActive ?? data.is_active ?? true,
    max_members: data.maxMembers ?? data.max_members,
    is_open: data.isOpen ?? data.is_open,
    requires_approval: data.requiresApproval ?? data.requires_approval,
    created_at: ts(data.createdAt) ?? ts(data.created_at) ?? '',
    updated_at: ts(data.updatedAt) ?? ts(data.updated_at) ?? '',
  }
}
