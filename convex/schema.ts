import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

/** Aligns with lib/types.ts — single source of truth for domain shapes. */

const userRole = v.union(
  v.literal('admin'),
  v.literal('pastor'),
  v.literal('elder'),
  v.literal('finance_officer'),
  v.literal('member'),
  v.literal('visitor')
)

const memberStatus = v.union(
  v.literal('active'),
  v.literal('visitor'),
  v.literal('transferred'),
  v.literal('inactive')
)

const attendanceMethod = v.union(
  v.literal('qr'),
  v.literal('kiosk'),
  v.literal('admin'),
  v.literal('pin'),
  v.literal('mobile')
)

const serviceType = v.union(
  v.literal('sunday_service'),
  v.literal('midweek_service'),
  v.literal('prayer_meeting'),
  v.literal('youth_service'),
  v.literal('children_service'),
  v.literal('special_event')
)

const emergencyContact = v.object({
  name: v.string(),
  relation: v.string(),
  phone: v.string(),
})

const document = v.object({
  name: v.string(),
  type: v.string(),
  url: v.string(),
  uploaded_at: v.string(),
})

export default defineSchema({
  users: defineTable({
    auth_uid: v.optional(v.string()),
    membership_id: v.string(),
    phone: v.optional(v.string()),
    secondary_phone: v.optional(v.string()),
    email: v.optional(v.string()),
    full_name: v.string(),
    first_name: v.optional(v.string()),
    middle_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    role: userRole,
    join_year: v.number(),
    occupation: v.optional(v.string()),
    place_of_work: v.optional(v.string()),
    marital_status: v.optional(
      v.union(
        v.literal('single'),
        v.literal('married'),
        v.literal('divorced'),
        v.literal('widowed'),
        v.literal('separated')
      )
    ),
    spouse_name: v.optional(v.string()),
    anniversary_date: v.optional(v.string()),
    children_count: v.optional(v.number()),
    emergency_contact_name: v.optional(v.string()),
    emergency_contact_phone: v.optional(v.string()),
    emergency_contact_relation: v.optional(v.string()),
    updated_at: v.number(),
  })
    .index('by_membership_id', ['membership_id'])
    .index('by_phone', ['phone'])
    .index('by_auth_uid', ['auth_uid'])
    .index('by_email', ['email']),

  members: defineTable({
    user_id: v.string(),
    dob: v.optional(v.string()),
    gender: v.optional(v.union(v.literal('male'), v.literal('female'), v.literal('other'))),
    address: v.optional(v.string()),
    emergency_contacts: v.array(emergencyContact),
    profile_photo: v.optional(v.string()),
    documents: v.array(document),
    status: memberStatus,
    notes: v.optional(v.string()),
    date_of_baptism: v.optional(v.string()),
    holy_ghost_baptism: v.optional(v.boolean()),
    date_of_holy_ghost_baptism: v.optional(v.string()),
    previous_church: v.optional(v.string()),
    reason_for_leaving: v.optional(v.string()),
    special_skills: v.optional(v.array(v.string())),
    interests: v.optional(v.array(v.string())),
    profile_photo_url: v.optional(v.string()),
    is_visitor: v.optional(v.boolean()),
    visitor_since: v.optional(v.string()),
    visitor_converted_to_member: v.optional(v.boolean()),
    congregation: v.optional(
      v.union(v.literal('rlc'), v.literal('campus_gem'), v.literal('both'))
    ),
    rlc_membership_type: v.optional(
      v.union(v.literal('full_member'), v.literal('associate'), v.literal('visitor_converted'))
    ),
    source_visitor_id: v.optional(v.string()),
    rlc_roles: v.optional(v.array(v.string())),
    updated_at: v.number(),
  })
    .index('by_user_id', ['user_id'])
    .index('by_congregation', ['congregation']),

  attendance: defineTable({
    member_id: v.optional(v.string()),
    dependant_id: v.optional(v.string()),
    visitor_id: v.optional(v.string()),
    congregation: v.optional(v.union(v.literal('rlc'), v.literal('campus_gem'))),
    service_date: v.string(),
    service_type: v.optional(serviceType),
    check_in_time: v.string(),
    method: attendanceMethod,
    metadata: v.optional(v.any()),
    client_uuid: v.optional(v.string()),
    created_by: v.optional(v.string()),
    checked_in_by: v.optional(v.string()),
    is_duplicate: v.optional(v.boolean()),
    departments: v.optional(v.array(v.string())),
    age_category: v.optional(v.union(v.literal('adult'), v.literal('child'))),
    gender: v.optional(v.union(v.literal('male'), v.literal('female'))),
    status: v.optional(v.union(v.literal('present'), v.literal('absent'), v.literal('late'))),
    notes: v.optional(v.string()),
    updated_at: v.number(),
  })
    .index('by_member_id', ['member_id'])
    .index('by_service_date', ['service_date'])
    .index('by_member_and_date', ['member_id', 'service_date'])
    .index('by_client_uuid', ['client_uuid'])
    .index('by_congregation_and_date', ['congregation', 'service_date'])
    .index('by_visitor_id', ['visitor_id']),

  groups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    group_type: v.union(
      v.literal('campus'),
      v.literal('corporate_gem'),
      v.literal('activity'),
      v.literal('ministry'),
      v.literal('fellowship'),
      v.literal('age_group'),
      v.literal('special_interest'),
      v.literal('leadership')
    ),
    leader_id: v.optional(v.string()),
    co_leader_id: v.optional(v.string()),
    meeting_schedule: v.optional(v.string()),
    meeting_location: v.optional(v.string()),
    is_active: v.boolean(),
    max_members: v.optional(v.number()),
    updated_at: v.number(),
  }).index('by_active', ['is_active']),

  group_memberships: defineTable({
    group_id: v.string(),
    member_id: v.string(),
    role: v.union(
      v.literal('leader'),
      v.literal('co_leader'),
      v.literal('executive'),
      v.literal('member'),
      v.literal('volunteer')
    ),
    joined_date: v.string(),
    is_active: v.boolean(),
    notes: v.optional(v.string()),
    updated_at: v.number(),
  })
    .index('by_group_id', ['group_id'])
    .index('by_member_id', ['member_id'])
    .index('by_group_and_member', ['group_id', 'member_id']),

  visitors: defineTable({
    first_name: v.string(),
    last_name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    visit_date: v.string(),
    service_attended: v.optional(v.string()),
    how_heard_about_church: v.optional(v.string()),
    invited_by_member_id: v.optional(v.string()),
    invited_by_member_ids: v.optional(v.array(v.string())),
    assigned_follow_up_member_id: v.optional(v.string()),
    follow_up_notes: v.optional(v.string()),
    follow_up_date: v.optional(v.string()),
    follow_up_status: v.optional(
      v.union(v.literal('pending'), v.literal('in_progress'), v.literal('completed'))
    ),
    follow_up_completed: v.boolean(),
    pipeline_status: v.optional(
      v.union(
        v.literal('first_visit'),
        v.literal('follow_up'),
        v.literal('new_member'),
        v.literal('full_member'),
        v.literal('inactive')
      )
    ),
    source: v.optional(
      v.union(
        v.literal('walk_in'),
        v.literal('camp'),
        v.literal('campus_gem'),
        v.literal('corporate_gem'),
        v.literal('referral'),
        v.literal('other')
      )
    ),
    source_user_id: v.optional(v.string()),
    source_camp_registration_id: v.optional(v.string()),
    gender: v.optional(v.union(v.literal('male'), v.literal('female'), v.literal('other'))),
    date_of_birth: v.optional(v.string()),
    occupation: v.optional(v.string()),
    marital_status: v.optional(
      v.union(
        v.literal('single'),
        v.literal('married'),
        v.literal('divorced'),
        v.literal('widowed'),
        v.literal('separated')
      )
    ),
    congregation: v.optional(v.union(v.literal('rlc'), v.literal('campus_gem'))),
    converted_to_member: v.boolean(),
    converted_member_id: v.optional(v.string()),
    converted_at: v.optional(v.string()),
    is_active: v.boolean(),
    updated_at: v.number(),
  })
    .index('by_visit_date', ['visit_date'])
    .index('by_active', ['is_active'])
    .index('by_congregation', ['congregation'])
    .index('by_pipeline_status', ['pipeline_status'])
    .index('by_assigned_follow_up', ['assigned_follow_up_member_id']),

  rlc_interactions: defineTable({
    visitor_id: v.string(),
    performed_by: v.string(),
    interaction_type: v.union(
      v.literal('call'),
      v.literal('visit'),
      v.literal('note'),
      v.literal('status_change'),
      v.literal('sms'),
      v.literal('email'),
      v.literal('conversion')
    ),
    notes: v.optional(v.string()),
    metadata: v.optional(v.any()),
    updated_at: v.number(),
  }).index('by_visitor_id', ['visitor_id']),

  camp_years: defineTable({
    year: v.number(),
    theme: v.string(),
    start_date: v.string(),
    end_date: v.string(),
    is_active: v.boolean(),
    registration_open: v.boolean(),
    flyer_image_url: v.optional(v.union(v.string(), v.null())),
    venue: v.optional(v.string()),
    updated_at: v.number(),
  })
    .index('by_year', ['year'])
    .index('by_active', ['is_active']),

  camp_registrations: defineTable({
    camp_year_id: v.string(),
    user_id: v.optional(v.string()),
    full_name: v.string(),
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    email: v.string(),
    phone: v.string(),
    facebook_username: v.optional(v.string()),
    sex: v.optional(v.union(v.literal('Male'), v.literal('Female'))),
    date_of_birth: v.optional(v.string()),
    birth_month: v.optional(v.number()),
    birth_day: v.optional(v.number()),
    age_bracket: v.optional(
      v.union(
        v.literal('1-12'),
        v.literal('13-19'),
        v.literal('20-29'),
        v.literal('30-39'),
        v.literal('40-49'),
        v.literal('50+')
      )
    ),
    address_school_work: v.optional(v.string()),
    education_level: v.optional(v.string()),
    highest_qualification: v.optional(v.string()),
    residence: v.optional(v.string()),
    times_attended: v.optional(v.number()),
    has_nhis_card: v.optional(v.boolean()),
    nhis_card_expiry_date: v.optional(v.string()),
    has_health_challenge: v.optional(v.boolean()),
    health_challenges: v.optional(v.array(v.string())),
    parent_name: v.optional(v.string()),
    parent_contact: v.optional(v.string()),
    payment_status: v.optional(
      v.union(v.literal('pending'), v.literal('paid'), v.literal('confirmed'), v.literal('refunded'))
    ),
    payment_reference: v.optional(v.string()),
    payment_amount: v.optional(v.number()),
    payment_date: v.optional(v.string()),
    role: v.string(),
    is_new_registrant: v.boolean(),
    status: v.union(v.literal('registered'), v.literal('checked_in'), v.literal('cancelled')),
    assigned_to: v.optional(v.string()),
    follow_up_status: v.optional(
      v.union(v.literal('pending'), v.literal('in_progress'), v.literal('completed'))
    ),
    /** Non-blocking issues from historical import (invalid email/phone, etc.). */
    import_warnings: v.optional(v.array(v.string())),
    /** Easy-to-say desk check-in code, e.g. GEM-26-K7M3 (unique per camp year). */
    check_in_code: v.optional(v.string()),
    qr_code: v.string(),
    updated_at: v.number(),
  })
    .index('by_camp_year', ['camp_year_id'])
    .index('by_camp_year_phone', ['camp_year_id', 'phone'])
    .index('by_camp_year_email', ['camp_year_id', 'email'])
    .index('by_camp_year_check_in_code', ['camp_year_id', 'check_in_code'])
    .index('by_qr_code', ['qr_code'])
    .index('by_phone', ['phone'])
    .index('by_email', ['email']),

  camp_interactions: defineTable({
    registration_id: v.string(),
    performed_by: v.string(),
    interaction_type: v.union(
      v.literal('call'),
      v.literal('note'),
      v.literal('status_change'),
      v.literal('sms'),
      v.literal('email')
    ),
    notes: v.optional(v.string()),
    updated_at: v.number(),
  }).index('by_registration', ['registration_id']),

  camp_activities: defineTable({
    camp_year_id: v.string(),
    title: v.optional(v.string()),
    date: v.optional(v.string()),
    start_time: v.optional(v.string()),
    end_time: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    updated_at: v.number(),
  }).index('by_camp_year', ['camp_year_id']),

  forms: defineTable({
    title: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    group_id: v.optional(v.string()),
    status: v.union(v.literal('draft'), v.literal('published'), v.literal('closed')),
    enable_profile_lookup: v.boolean(),
    capture_respondent_location: v.optional(v.boolean()),
    /** Banner / flyer shown at top of public form (HTTPS URL) */
    cover_image_url: v.optional(v.string()),
    /** Theme preset: auto | indigo | violet | emerald | amber | rose | sky | slate */
    accent_color: v.optional(v.string()),
    /** Camp meeting year this form belongs to (required for camp meeting registration forms) */
    camp_year_id: v.optional(v.string()),
    /** Public layout: classic | stepped (Typeform-style one question per screen) */
    display_mode: v.optional(v.union(v.literal('classic'), v.literal('stepped'))),
    /** Denormalized count — updated on each public submission */
    response_count: v.optional(v.number()),
    created_by: v.optional(v.string()),
    updated_at: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_status', ['status'])
    .index('by_group', ['group_id'])
    .index('by_camp_year', ['camp_year_id']),

  form_fields: defineTable({
    form_id: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
    field_type: v.union(
      v.literal('short_text'),
      v.literal('long_text'),
      v.literal('email'),
      v.literal('phone'),
      v.literal('number'),
      v.literal('dropdown'),
      v.literal('radio'),
      v.literal('checkbox'),
      v.literal('date'),
      v.literal('file')
    ),
    required: v.boolean(),
    options: v.optional(v.array(v.string())),
    prefill_key: v.optional(v.string()),
    sort_order: v.number(),
    updated_at: v.number(),
  }).index('by_form', ['form_id']),

  form_responses: defineTable({
    form_id: v.string(),
    respondent_name: v.optional(v.string()),
    respondent_phone: v.optional(v.string()),
    respondent_email: v.optional(v.string()),
    respondent_latitude: v.optional(v.number()),
    respondent_longitude: v.optional(v.number()),
    respondent_location_label: v.optional(v.string()),
    values: v.any(),
    submitted_at: v.number(),
    updated_at: v.number(),
  })
    .index('by_form', ['form_id'])
    .index('by_form_and_phone', ['form_id', 'respondent_phone']),

  camp_communications: defineTable({
    camp_year_id: v.string(),
    communication_type: v.union(v.literal('email'), v.literal('sms')),
    sender_id: v.optional(v.string()),
    recipient_type: v.union(v.literal('individual'), v.literal('bulk')),
    recipient_registration_id: v.optional(v.string()),
    recipient_email: v.optional(v.string()),
    recipient_phone: v.optional(v.string()),
    subject: v.optional(v.string()),
    message_body: v.string(),
    filter_criteria: v.optional(v.any()),
    status: v.union(
      v.literal('pending'),
      v.literal('sent'),
      v.literal('delivered'),
      v.literal('failed'),
      v.literal('bounced')
    ),
    provider_message_id: v.optional(v.string()),
    error_message: v.optional(v.string()),
    metadata: v.optional(v.any()),
    sent_at: v.optional(v.number()),
    delivered_at: v.optional(v.number()),
    updated_at: v.number(),
  })
    .index('by_camp_year', ['camp_year_id'])
    .index('by_recipient_registration', ['recipient_registration_id']),
})
