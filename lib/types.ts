/**
 * Type definitions for the Church Management System
 */

export type UserRole = 'admin' | 'pastor' | 'elder' | 'finance_officer' | 'member' | 'visitor'
export type MemberStatus = 'active' | 'visitor' | 'transferred' | 'inactive'
export type AttendanceMethod = 'qr' | 'kiosk' | 'admin' | 'pin' | 'mobile'
export type ServiceType = 'sunday_service' | 'midweek_service' | 'prayer_meeting' | 'youth_service' | 'children_service' | 'special_event'

export interface AppUser {
  id: string
  auth_uid?: string
  membership_id: string
  phone?: string
  secondary_phone?: string
  email?: string
  full_name: string
  first_name?: string
  middle_name?: string
  last_name?: string
  role: UserRole
  join_year: number
  occupation?: string
  place_of_work?: string
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | 'separated'
  spouse_name?: string
  anniversary_date?: string
  children_count?: number
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
  created_at: string
  updated_at: string
}

export interface Member {
  id: string
  user_id: string
  dob?: string
  gender?: 'male' | 'female' | 'other'
  address?: string
  emergency_contacts: EmergencyContact[]
  profile_photo?: string
  documents: Document[]
  status: MemberStatus
  notes?: string
  date_of_baptism?: string
  holy_ghost_baptism?: boolean
  date_of_holy_ghost_baptism?: string
  previous_church?: string
  reason_for_leaving?: string
  special_skills?: string[]
  interests?: string[]
  profile_photo_url?: string
  is_visitor?: boolean
  visitor_since?: string
  visitor_converted_to_member?: boolean
  created_at: string
  updated_at: string
  // Joined data
  user?: AppUser
  dependants?: Dependant[]
  group_memberships?: GroupMembership[]
}

export interface EmergencyContact {
  name: string
  relation: string
  phone: string
}

export interface Document {
  name: string
  type: string
  url: string
  uploaded_at: string
}

export interface Dependant {
  id: string
  member_id: string
  first_name: string
  middle_name?: string
  last_name?: string
  relationship: 'child' | 'spouse' | 'sibling' | 'parent' | 'guardian' | 'other'
  dob?: string
  gender?: 'male' | 'female'
  phone?: string
  email?: string
  occupation?: string
  is_member?: boolean
  membership_id?: string
  notes?: string
  created_at: string
  updated_at: string
  // Joined data
  member?: Member
}

export interface Group {
  id: string
  name: string
  description?: string
  group_type:
    | 'campus'
    | 'activity'
    | 'ministry'
    | 'fellowship'
    | 'age_group'
    | 'special_interest'
    | 'leadership'
  leader_id?: string
  co_leader_id?: string
  meeting_schedule?: string
  meeting_location?: string
  is_active: boolean
  max_members?: number
  /** Whether new members can join without an invite (stored in Firestore as isOpen) */
  is_open?: boolean
  /** If true, leader/admin must approve new members */
  requires_approval?: boolean
  created_at: string
  updated_at: string
  // Joined data
  leader?: AppUser
  co_leader?: AppUser
  members?: GroupMembership[]
}

export interface GroupMembership {
  id: string
  group_id: string
  member_id: string
  role: 'leader' | 'co_leader' | 'executive' | 'member' | 'volunteer'
  joined_date: string
  is_active: boolean
  notes?: string
  created_at: string
  // Joined data
  group?: Group
  member?: Member
}

export interface Visitor {
  id: string
  first_name: string
  last_name?: string
  phone?: string
  email?: string
  address?: string
  visit_date: string
  service_attended?: string
  how_heard_about_church?: string
  invited_by_member_id?: string
  follow_up_notes?: string
  follow_up_date?: string
  follow_up_completed: boolean
  converted_to_member: boolean
  converted_member_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined data
  invited_by?: Member
  converted_member?: Member
}

export interface Attendance {
  id: string
  member_id?: string
  dependant_id?: string
  service_date: string
  service_type?: ServiceType
  check_in_time: string
  method: AttendanceMethod
  metadata: Record<string, any>
  client_uuid?: string
  created_by?: string
  checked_in_by?: string
  created_at: string
  // Enhanced fields
  is_duplicate?: boolean
  departments?: string[]
  age_category?: 'adult' | 'child'
  gender?: 'male' | 'female'
  status?: 'present' | 'absent' | 'late'
  notes?: string
  // Joined data
  member?: Member
  dependant?: Dependant
  creator?: AppUser
  checked_in_user?: AppUser
}

export interface Department {
  id: string
  name: string
  description?: string
  department_type: 'ministry' | 'service' | 'fellowship' | 'leadership' | 'support'
  leader_id?: string
  co_leader_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined data
  leader?: AppUser
  co_leader?: AppUser
  members?: DepartmentMembership[]
}

export interface DepartmentMembership {
  id: string
  department_id: string
  member_id: string
  role: 'leader' | 'co_leader' | 'executive' | 'member' | 'volunteer'
  joined_date: string
  is_active: boolean
  notes?: string
  created_at: string
  // Joined data
  department?: Department
  member?: Member
}

export interface AbsenteeRecord {
  id: string
  member_id: string
  service_date: string
  service_type: string
  reason?: string
  follow_up_required: boolean
  follow_up_notes?: string
  follow_up_completed: boolean
  follow_up_date?: string
  follow_up_by?: string
  sms_sent: boolean
  sms_sent_at?: string
  created_at: string
  updated_at: string
  // Joined data
  member?: Member
  follow_up_user?: AppUser
}

export interface AttendanceActivity {
  id: string
  type: 'check_in' | 'check_out' | 'bulk_attendance' | 'absentee_marked' | 'follow_up'
  member_id?: string
  service_date: string
  service_type: string
  description: string
  metadata?: Record<string, any>
  created_by: string
  created_at: string
  // Joined data
  member?: Member
  created_user?: AppUser
}

export interface Donation {
  id: string
  member_id: string
  amount: number
  donation_type: string
  description?: string
  donation_date: string
  payment_method?: string
  reference_number?: string
  created_by?: string
  created_at: string
  // Joined data
  member?: Member
  creator?: AppUser
}

export interface Pledge {
  id: string
  member_id: string
  amount: number
  pledge_type: string
  description?: string
  pledge_date: string
  due_date?: string
  status: 'pending' | 'fulfilled' | 'partial' | 'cancelled'
  created_at: string
  // Joined data
  member?: Member
}

export interface Expense {
  id: string
  amount: number
  category: string
  description?: string
  expense_date: string
  receipt_url?: string
  approved_by?: string
  created_by?: string
  created_at: string
  // Joined data
  approver?: AppUser
  creator?: AppUser
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  subject: string
  content: string
  message_type: 'general' | 'announcement' | 'prayer_request' | 'urgent'
  is_read: boolean
  sent_at: string
  read_at?: string
  // Joined data
  sender?: AppUser
  recipient?: AppUser
}

export interface PrayerRequest {
  id: string
  member_id: string
  title: string
  description: string
  category?: string
  status: 'active' | 'answered' | 'closed'
  is_anonymous: boolean
  created_at: string
  updated_at: string
  // Joined data
  member?: Member
}

export interface Equipment {
  id: string
  name: string
  description?: string
  category?: string
  serial_number?: string
  purchase_date?: string
  purchase_price?: number
  current_condition: 'excellent' | 'good' | 'fair' | 'poor' | 'broken'
  assigned_to?: string
  location?: string
  maintenance_notes?: string
  created_at: string
  updated_at: string
  // Joined data
  assignee?: AppUser
}

export interface AuditLog {
  id: string
  user_id?: string
  action: string
  table_name: string
  record_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
  // Joined data
  user?: AppUser
}

export interface QRToken {
  id: string
  member_id: string
  token: string
  expires_at: string
  used_at?: string
  created_at: string
  // Joined data
  member?: Member
}

export interface SyncQueueItem {
  id: string
  client_uuid: string
  table_name: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  data: Record<string, any>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
  retry_count: number
  created_at: string
  processed_at?: string
}

export interface Heartbeat {
  id: string
  service_name: string
  status: string
  last_ping: string
  metadata: Record<string, any>
}

// Form types
export interface CreateUserForm {
  // Personal Information
  first_name: string
  middle_name?: string
  last_name: string
  phone: string
  secondary_phone?: string
  email?: string
  role: UserRole
  
  // Professional Information
  occupation?: string
  place_of_work?: string
  
  // Family Information
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | 'separated'
  spouse_name?: string
  children_count?: number
  
  // Contact Information
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
  
  // Spiritual Information
  dob?: string
  gender?: 'male' | 'female' | 'other'
  date_of_baptism?: string
  holy_ghost_baptism?: boolean
  date_of_holy_ghost_baptism?: string
  previous_church?: string
  reason_for_leaving?: string
  
  // Additional Information
  special_skills?: string[]
  interests?: string[]
  notes?: string
  
  // System fields
  join_year?: number
  membership_id?: string
  is_visitor?: boolean
}

export interface UpdateProfileForm {
  // Personal Information
  first_name?: string
  middle_name?: string
  last_name?: string
  phone?: string
  secondary_phone?: string
  email?: string
  
  // Professional Information
  occupation?: string
  place_of_work?: string
  
  // Family Information
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | 'separated'
  spouse_name?: string
  children_count?: number
  
  // Contact Information
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
  
  // Spiritual Information
  dob?: string
  gender?: 'male' | 'female' | 'other'
  date_of_baptism?: string
  holy_ghost_baptism?: boolean
  date_of_holy_ghost_baptism?: string
  previous_church?: string
  reason_for_leaving?: string
  
  // Additional Information
  special_skills?: string[]
  interests?: string[]
  notes?: string
  profile_photo_url?: string
}

export interface CreateVisitorForm {
  first_name: string
  last_name?: string
  phone?: string
  email?: string
  address?: string
  visit_date: string
  service_attended?: string
  how_heard_about_church?: string
  invited_by_member_id?: string
  follow_up_notes?: string
  follow_up_date?: string
}

export interface CreateDependantForm {
  member_id: string
  first_name: string
  middle_name?: string
  last_name?: string
  relationship: 'child' | 'spouse' | 'sibling' | 'parent' | 'guardian' | 'other'
  dob?: string
  gender?: 'male' | 'female'
  phone?: string
  email?: string
  occupation?: string
  is_member?: boolean
  notes?: string
}

export interface AttendanceForm {
  member_id?: string
  dependant_id?: string
  service_type: ServiceType
  method: AttendanceMethod
  metadata?: Record<string, any>
}

export interface DonationForm {
  member_id: string
  amount: number
  donation_type: string
  description?: string
  donation_date: string
  payment_method?: string
  reference_number?: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  page_size: number
  total_pages: number
}

// Search and filter types
export interface SearchFilters {
  query?: string
  role?: UserRole
  status?: MemberStatus
  join_year?: number
  page?: number
  page_size?: number
}

export interface AttendanceFilters {
  service_date?: string
  service_type?: ServiceType
  method?: AttendanceMethod
  member_id?: string
  page?: number
  page_size?: number
}

// Dashboard data types
export interface DashboardStats {
  total_members: number
  active_members: number
  visitors: number
  today_attendance: number
  weekly_attendance: number
  monthly_donations: number
  pending_pledges: number
  prayer_requests: number
  upcoming_birthdays: number
  upcoming_anniversaries: number
  groups_count: number
  recent_visitors: number
  attendance_rate: number
  visitor_conversion_rate: number
  // Enhanced attendance analytics
  male_attendance?: number
  female_attendance?: number
  adult_attendance?: number
  children_attendance?: number
  total_attendance?: number
}

export interface Demographics {
  gender: { male: number; female: number }
  ageGroups: { [key: string]: number }
  maritalStatus: { [key: string]: number }
  groups: { [key: string]: number }
}

export interface AttendanceStats {
  service_date: string
  service_type: ServiceType
  total_attendance: number
  member_attendance: number
  dependant_attendance: number
}

// Offline sync types
export interface OfflineQueueItem {
  id: string
  client_uuid: string
  table_name: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  data: Record<string, any>
  created_at: string
  retry_count: number
}

// SMS types
export interface SMSProvider {
  name: string
  sendSMS: (phone: string, message: string) => Promise<boolean>
  sendOTP: (phone: string, otp: string) => Promise<boolean>
}

export interface SMSConfig {
  provider: 'twilio' | 'africas_talking' | 'custom'
  api_key: string
  api_secret: string
  from_number?: string
  sender_id?: string
}

// Export types
export interface ExportConfig {
  format: 'csv' | 'xlsx' | 'pdf'
  filters?: Record<string, any>
  fields?: string[]
  include_dependants?: boolean
}

export interface ExportJob {
  id: string
  type: string
  config: ExportConfig
  status: 'pending' | 'processing' | 'completed' | 'failed'
  file_url?: string
  created_at: string
  completed_at?: string
  error_message?: string
}

// Camp Meeting Types

export interface CampYear {
  id: string
  year: number
  theme: string
  start_date: string
  end_date: string
  is_active: boolean
  registration_open: boolean
  flyer_image_url?: string | null
  venue?: string
  created_at: string
  updated_at: string
}

export interface CampRegistration {
  id: string
  camp_year_id: string
  user_id?: string
  full_name: string // Kept for backward compatibility
  first_name?: string
  last_name?: string
  email: string
  phone: string
  facebook_username?: string
  sex?: 'Male' | 'Female'
  date_of_birth?: string
  birth_month?: number
  birth_day?: number
  age_bracket?: '1-12' | '13-19' | '20-29' | '30-39' | '40-49' | '50+'
  address_school_work?: string
  education_level?: 'JHS 1' | 'JHS 2' | 'JHS 3' | 'SHS 1' | 'SHS 2' | 'SHS 3' | 'COMPLETED SHS' | 'LEVEL 100' | 'LEVEL 200' | 'LEVEL 300' | 'LEVEL 400' | 'GRADUATED' | 'POSTGRADUATE'
  highest_qualification?: 'JHS' | 'SHS' | 'University'
  residence?: string
  times_attended?: number
  has_nhis_card?: boolean
  nhis_card_expiry_date?: string
  has_health_challenge?: boolean
  health_challenges?: string[]
  parent_name?: string
  parent_contact?: string
  payment_status?: 'pending' | 'paid' | 'confirmed' | 'refunded'
  payment_reference?: string
  payment_amount?: number
  payment_date?: string
  role: string
  is_new_registrant: boolean
  status: 'registered' | 'checked_in' | 'cancelled'
  assigned_to?: string
  follow_up_status?: 'pending' | 'in_progress' | 'completed'
  qr_code: string
  created_at: string
  updated_at: string
  // Joined data
  camp_year?: CampYear
  assigned_user?: AppUser
  interactions?: CampInteraction[]
}

export interface CampInteraction {
  id: string
  registration_id: string
  performed_by: string
  interaction_type: 'call' | 'note' | 'status_change' | 'sms' | 'email'
  notes?: string
  created_at: string
  // Joined data
  performer?: AppUser
}

export interface CampRegistrationForm {
  camp_year_id: string
  first_name: string
  last_name: string
  full_name?: string // Optional, will be derived from first_name + last_name
  email?: string
  phone: string
  facebook_username?: string
  sex: 'Male' | 'Female'
  date_of_birth?: string
  birth_month?: number
  birth_day?: number
  age_bracket: '1-12' | '13-19' | '20-29' | '30-39' | '40-49' | '50+'
  address_school_work: string
  education_level: 'JHS 1' | 'JHS 2' | 'JHS 3' | 'SHS 1' | 'SHS 2' | 'SHS 3' | 'COMPLETED SHS' | 'LEVEL 100' | 'LEVEL 200' | 'LEVEL 300' | 'LEVEL 400' | 'GRADUATED' | 'POSTGRADUATE'
  highest_qualification: 'JHS' | 'SHS' | 'University'
  residence: string
  times_attended: number
  has_nhis_card: boolean
  nhis_card_expiry_date?: string
  has_health_challenge: boolean
  health_challenges?: string[]
  other_health_challenge?: string
  parent_name: string
  parent_contact: string
  role?: string
  is_new_registrant?: boolean // Will be derived from times_attended (0 = new)
  qr_code?: string // Generated backend/frontend
}

export interface CampCommunication {
  id: string
  camp_year_id: string
  communication_type: 'email' | 'sms'
  sender_id?: string
  recipient_type: 'individual' | 'bulk'
  recipient_registration_id?: string
  recipient_email?: string
  recipient_phone?: string
  subject?: string
  message_body: string
  filter_criteria?: {
    year?: number
    role?: string
    is_new_registrant?: boolean
    follow_up_status?: string
    assigned_to?: string
  }
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
  provider_message_id?: string
  error_message?: string
  metadata?: Record<string, any>
  created_at: string
  sent_at?: string
  delivered_at?: string
  // Joined data
  sender?: AppUser
  recipient_registration?: CampRegistration
}

export interface CampCommunicationFilter {
  camp_year_id?: string
  role?: string
  is_new_registrant?: boolean
  follow_up_status?: 'pending' | 'in_progress' | 'completed'
  assigned_to?: string
}

export interface CampActivity {
  id: string
  camp_year_id: string
  title: string
  description?: string
  activity_type: 'session' | 'workshop' | 'meeting' | 'worship' | 'break' | 'meal' | 'recreation' | 'seminar' | 'prayer' | 'other'
  date: string
  start_time: string
  end_time: string
  location?: string
  venue?: string
  capacity?: number
  assigned_staff?: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  attendance_count: number
  notes?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  created_by?: string
  // Joined data
  camp_year?: CampYear
  assigned_user?: AppUser
  creator?: AppUser
}

export type ChurchFormStatus = 'draft' | 'published' | 'closed'

export type ChurchFormFieldType =
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'phone'
  | 'number'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'file'

export interface ChurchForm {
  id: string
  title: string
  slug: string
  description?: string
  category?: string
  /** Campus fellowship or general activity group this form belongs to */
  group_id?: string
  status: ChurchFormStatus
  enable_profile_lookup: boolean
  capture_respondent_location: boolean
  created_by?: string
  created_at: string
  updated_at: string
  response_count?: number
}

export interface ChurchFormField {
  id: string
  form_id: string
  label: string
  description?: string
  field_type: ChurchFormFieldType
  required: boolean
  options?: string[]
  prefill_key?: string
  sort_order: number
  updated_at: string
}

export interface ChurchFormResponse {
  id: string
  form_id: string
  respondent_name?: string
  respondent_phone?: string
  respondent_email?: string
  respondent_latitude?: number
  respondent_longitude?: number
  respondent_location_label?: string
  values: Record<string, unknown>
  submitted_at: string
  updated_at: string
}

export interface CampCamperDirectoryRow {
  phone_key: string
  full_name: string
  first_name?: string
  last_name?: string
  email?: string
  phone: string
  years: Array<{
    year_id: string
    year: number
    status: string
    registration_id: string
  }>
  registration_count: number
  user_id?: string
  user_role?: string
}
