import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

/** Aligns with lib/types.ts — single source of truth for domain shapes. */

const userRole = v.union(
  v.literal('admin'),
  v.literal('pastor'),
  v.literal('elder'),
  v.literal('finance_officer'),
  v.literal('campus_leader'),
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
  v.literal('mobile'),
  /** Member checked themselves in by scanning a self check-in QR (`/i/<token>`). */
  v.literal('self')
)

const serviceType = v.union(
  v.literal('sunday_service'),
  v.literal('midweek_service'),
  v.literal('prayer_meeting'),
  v.literal('youth_service'),
  v.literal('children_service'),
  v.literal('special_event'),
  v.literal('other')
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
    whatsapp: v.optional(v.string()),
    email: v.optional(v.string()),
    full_name: v.string(),
    first_name: v.optional(v.string()),
    middle_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    role: userRole,
    /** Extra permissions granted on top of the role. */
    permissions: v.optional(v.array(v.string())),
    /** Set when this record is a duplicate of another person; login follows the link. */
    merged_into: v.optional(v.id('users')),
    join_year: v.number(),
    /** XS … 4XL, asked on camp confirmation calls (lib/camp/tshirt.ts). */
    tshirt_size: v.optional(v.string()),
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
    /** Family household (see convex/households.ts). */
    household_id: v.optional(v.id('households')),
    /** Replied STOP to an SMS: bulk sends skip them (see convex/smsInbox.ts). */
    sms_opt_out: v.optional(v.boolean()),
    updated_at: v.number(),
  })
    .index('by_membership_id', ['membership_id'])
    .index('by_phone', ['phone'])
    .index('by_secondary_phone', ['secondary_phone'])
    .index('by_auth_uid', ['auth_uid'])
    .index('by_email', ['email'])
    .index('by_household', ['household_id'])
    .index('by_sms_opt_out', ['sms_opt_out']),

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
    hometown: v.optional(v.string()),
    area_of_residence: v.optional(v.string()),
    school_or_workplace: v.optional(v.string()),
    age_range: v.optional(
      v.union(
        v.literal('0_12'),
        v.literal('13_17'),
        v.literal('18_35'),
        v.literal('36_59'),
        v.literal('60_plus')
      )
    ),
    check_in_code: v.optional(v.string()),
    qr_code: v.optional(v.string()),
    updated_at: v.number(),
  })
    .index('by_user_id', ['user_id'])
    .index('by_congregation', ['congregation'])
    .index('by_check_in_code', ['check_in_code']),

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
      v.literal('rlc'),
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
    /** Campus groups: unique uppercase tag ("UEW"), URL slug and names to match on (see convex/campuses.ts). */
    short_code: v.optional(v.string()),
    slug: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
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
    middle_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    phone: v.optional(v.string()),
    secondary_phone: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    hometown: v.optional(v.string()),
    area_of_residence: v.optional(v.string()),
    school_or_workplace: v.optional(v.string()),
    place_of_work: v.optional(v.string()),
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
    age_range: v.optional(
      v.union(
        v.literal('0_12'),
        v.literal('13_17'),
        v.literal('18_35'),
        v.literal('36_59'),
        v.literal('60_plus')
      )
    ),
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
    spouse_name: v.optional(v.string()),
    children_count: v.optional(v.number()),
    emergency_contact_name: v.optional(v.string()),
    emergency_contact_phone: v.optional(v.string()),
    emergency_contact_relation: v.optional(v.string()),
    prayer_request: v.optional(v.string()),
    notes: v.optional(v.string()),
    is_first_timer: v.optional(v.boolean()),
    interested_in_baptism: v.optional(v.boolean()),
    interested_in_membership: v.optional(v.boolean()),
    /** Desk / QR check-in code, e.g. RLC-26-K7M3 */
    check_in_code: v.optional(v.string()),
    qr_code: v.optional(v.string()),
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
    .index('by_assigned_follow_up', ['assigned_follow_up_member_id'])
    .index('by_check_in_code', ['check_in_code'])
    .index('by_phone', ['phone']),

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

  rlc_custom_services: defineTable({
    name: v.string(),
    name_normalized: v.string(),
    congregation: v.literal('rlc'),
    created_by: v.optional(v.string()),
    is_active: v.boolean(),
    last_used_at: v.optional(v.number()),
    updated_at: v.number(),
  })
    .index('by_congregation', ['congregation'])
    .index('by_congregation_and_name', ['congregation', 'name_normalized']),

  camp_years: defineTable({
    year: v.number(),
    theme: v.string(),
    start_date: v.string(),
    end_date: v.string(),
    is_active: v.boolean(),
    registration_open: v.boolean(),
    flyer_image_url: v.optional(v.union(v.string(), v.null())),
    venue: v.optional(v.string()),
    /** Automatic 7-day / 1-day SMS reminders (cron). Unset means on. */
    auto_reminders: v.optional(v.boolean()),
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
    /** WhatsApp number from the public registration form. */
    whatsapp: v.optional(v.string()),
    /** Free-text location / travel note from the form (not residence). */
    camp_location: v.optional(v.string()),
    /** Optional comments / questions from the registrant. */
    registration_notes: v.optional(v.string()),
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
    /** Assigned lodging room for this camp year. */
    room_id: v.optional(v.string()),
    /** XS … 4XL, asked on the confirmation call; also copied to the person's profile. */
    tshirt_size: v.optional(v.string()),
    /** Outcome of the "are you still coming?" confirmation call. */
    attendance_confirmation: v.optional(
      v.union(
        v.literal('unconfirmed'),
        v.literal('confirmed'),
        v.literal('maybe'),
        v.literal('declined'),
        v.literal('unreachable')
      )
    ),
    confirmation_note: v.optional(v.string()),
    confirmation_updated_at: v.optional(v.number()),
    confirmation_updated_by: v.optional(v.string()),
    call_attempts: v.optional(v.number()),
    last_called_at: v.optional(v.number()),
    /** Secret for the tap-to-confirm link `/c/<token>`; created when first texted. */
    confirm_token: v.optional(v.string()),
    /** Automatic reminder markers so nobody is texted twice. */
    reminder_7d_sent_at: v.optional(v.number()),
    reminder_1d_sent_at: v.optional(v.number()),
    qr_code: v.string(),
    updated_at: v.number(),
  })
    .index('by_camp_year', ['camp_year_id'])
    .index('by_confirm_token', ['confirm_token'])
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
    /** Calls (from Nov 2026): the result, the calling session it was made in, when the caller got
     * this person (so the call's length is known), and whether the person answered by link. */
    outcome: v.optional(v.string()),
    session_id: v.optional(v.string()),
    started_at: v.optional(v.number()),
    via_link: v.optional(v.boolean()),
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
    activity_type: v.optional(v.string()),
    venue: v.optional(v.string()),
    capacity: v.optional(v.number()),
    assigned_staff: v.optional(v.string()),
    status: v.optional(v.string()),
    attendance_count: v.optional(v.number()),
    notes: v.optional(v.string()),
    metadata: v.optional(v.any()),
    created_by: v.optional(v.string()),
    updated_at: v.number(),
  }).index('by_camp_year', ['camp_year_id']),

  /** Lodging rooms for a camp year — admin-created or auto-filled. */
  camp_rooms: defineTable({
    camp_year_id: v.string(),
    name: v.string(),
    building: v.optional(v.string()),
    capacity: v.number(),
    gender: v.optional(v.union(v.literal('Male'), v.literal('Female'), v.literal('Mixed'))),
    notes: v.optional(v.string()),
    /** Registration id of the room leader / head camper */
    room_leader_id: v.optional(v.string()),
    updated_at: v.number(),
  }).index('by_camp_year', ['camp_year_id']),

  /** Per-session check-in (same camper can attend many sessions). */
  camp_session_attendances: defineTable({
    camp_year_id: v.string(),
    activity_id: v.string(),
    registration_id: v.string(),
    checked_in_by: v.string(),
    checked_in_at: v.number(),
    check_in_method: v.optional(
      v.union(v.literal('qr'), v.literal('manual'), v.literal('code'), v.literal('arrival'))
    ),
  })
    .index('by_camp_year', ['camp_year_id'])
    .index('by_activity', ['activity_id'])
    .index('by_registration', ['registration_id'])
    .index('by_activity_registration', ['activity_id', 'registration_id']),

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
    /** Owning module — RLC, camp meeting, or general outreach */
    module: v.optional(
      v.union(v.literal('rlc'), v.literal('camp_meeting'), v.literal('outreach'))
    ),
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
    .index('by_camp_year', ['camp_year_id'])
    .index('by_module', ['module']),

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

  /** Unified outbound message log — Campus Gem, RLC, and Camp. */
  communications: defineTable({
    module: v.union(v.literal('church'), v.literal('rlc'), v.literal('camp')),
    channel: v.union(v.literal('email'), v.literal('sms')),
    audience_type: v.union(v.literal('individual'), v.literal('group'), v.literal('bulk')),
    sender_id: v.optional(v.string()),
    batch_id: v.optional(v.string()),
    recipient_name: v.optional(v.string()),
    recipient_email: v.optional(v.string()),
    recipient_phone: v.optional(v.string()),
    recipient_entity_type: v.optional(
      v.union(
        v.literal('member'),
        v.literal('visitor'),
        v.literal('registration'),
        v.literal('group'),
        v.literal('manual')
      )
    ),
    recipient_entity_id: v.optional(v.string()),
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
    .index('by_module', ['module'])
    .index('by_batch', ['batch_id'])
    .index('by_channel', ['channel'])
    .index('by_status', ['status'])
    .index('by_recipient_phone', ['recipient_phone']),

  /** One-time sign-in codes (hashed). See convex/authCodes.ts. */
  auth_codes: defineTable({
    user_id: v.id('users'),
    code_hash: v.string(),
    sent_to: v.string(),
    expires_at: v.number(),
    attempts: v.number(),
    created_at: v.number(),
    used_at: v.optional(v.number()),
  }).index('by_user', ['user_id', 'created_at']),

  /** Who changed whose access, and when. See convex/accessLog.ts. */
  access_log: defineTable({
    user_id: v.id('users'),
    user_name: v.string(),
    actor_id: v.optional(v.id('users')),
    actor_name: v.string(),
    kind: v.union(
      v.literal('access'),
      v.literal('secondary_phone'),
      v.literal('link_duplicate'),
      v.literal('signin_text')
    ),
    from_role: v.optional(v.string()),
    to_role: v.optional(v.string()),
    added: v.array(v.string()),
    removed: v.array(v.string()),
    note: v.optional(v.string()),
    at: v.number(),
  })
    .index('by_user', ['user_id', 'at'])
    .index('by_at', ['at']),

  /** Family households; members link via users.household_id. See convex/households.ts. */
  households: defineTable({
    name: v.string(),
    primary_user_id: v.optional(v.id('users')),
    updated_at: v.number(),
  }),

  /** QR self check-in sessions (`/i/<token>`). See convex/checkinSessions.ts. */
  checkin_sessions: defineTable({
    token: v.string(),
    service_type: serviceType,
    service_date: v.string(),
    congregation: v.union(v.literal('campus_gem'), v.literal('rlc')),
    title: v.optional(v.string()),
    opens_at: v.number(),
    closes_at: v.number(),
    closed_at: v.optional(v.number()),
    created_by: v.string(),
    checkin_count: v.number(),
    created_at: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_closes_at', ['closes_at']),

  /** Church events with tap-to-RSVP. See convex/events.ts. */
  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    starts_at: v.number(),
    ends_at: v.optional(v.number()),
    location: v.optional(v.string()),
    capacity: v.optional(v.number()),
    audience: v.union(v.literal('all'), v.literal('group'), v.literal('custom')),
    group_id: v.optional(v.string()),
    rsvp_closes_at: v.optional(v.number()),
    created_by: v.string(),
    status: v.union(v.literal('draft'), v.literal('published'), v.literal('cancelled')),
    updated_at: v.number(),
  })
    .index('by_starts_at', ['starts_at'])
    .index('by_status_starts_at', ['status', 'starts_at']),

  /** One invitee of an event. `token` is the personal /e/<token> credential: never sent to browsers. */
  event_rsvps: defineTable({
    event_id: v.id('events'),
    user_id: v.id('users'),
    token: v.string(),
    response: v.optional(v.union(v.literal('yes'), v.literal('no'), v.literal('maybe'))),
    guests: v.number(),
    responded_at: v.optional(v.number()),
    invited_at: v.optional(v.number()),
    reminder_sent_at: v.optional(v.number()),
    created_at: v.number(),
  })
    .index('by_event', ['event_id'])
    .index('by_token', ['token'])
    .index('by_user', ['user_id'])
    .index('by_event_user', ['event_id', 'user_id']),

  /** Incoming SMS replies (webhook /api/sms/inbound). See convex/smsInbox.ts. */
  sms_inbox: defineTable({
    from: v.string(),
    /** normalizeSmsPhone form: 233XXXXXXXXX. */
    phone: v.string(),
    to: v.optional(v.string()),
    body: v.string(),
    received_at: v.number(),
    provider_message_id: v.optional(v.string()),
    user_id: v.optional(v.id('users')),
    visitor_id: v.optional(v.id('visitors')),
    camp_registration_id: v.optional(v.id('camp_registrations')),
    sender_name: v.optional(v.string()),
    keyword: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    read_at: v.optional(v.number()),
    handled_by: v.optional(v.string()),
    archived: v.optional(v.boolean()),
  })
    .index('by_received_at', ['received_at'])
    .index('by_phone', ['phone', 'received_at'])
    .index('by_provider_message_id', ['provider_message_id'])
    .index('by_read_at', ['read_at']),

  /** Missed-church alerts already sent (repeat protection). See convex/pastoral.ts. */
  pastoral_alerts: defineTable({
    /** members doc id */
    member_id: v.string(),
    alerted_at: v.number(),
    /** Consecutive Sundays missed when alerted. */
    streak: v.number(),
    /** Last Sunday seen before the gap (ISO date); a new value means a new lapse. */
    last_seen: v.optional(v.string()),
    /** users ids texted */
    recipients: v.optional(v.array(v.string())),
  }).index('by_member', ['member_id', 'alerted_at']),

  /** Single row: missed-church alerts and weekly leader summary settings. */
  pastoral_settings: defineTable({
    alerts_enabled: v.boolean(),
    digest_enabled: v.boolean(),
    weeks_threshold: v.number(),
    fallback_user_ids: v.array(v.string()),
    updated_at: v.number(),
    updated_by: v.optional(v.string()),
    last_run_at: v.optional(v.number()),
    last_run_summary: v.optional(v.any()),
  }),

  /**
   * What happened, by whom: sign-ins (and failed ones), sign-outs, and changes across the app
   * (lib/activity/log.ts). Shown on /admin/activity. Never holds secrets: phone numbers on failed
   * sign-ins are masked.
   */
  activity_log: defineTable({
    at: v.number(),
    /** auth | access | people | groups | camp | calls | sms | settings */
    category: v.string(),
    /** e.g. auth.signin, people.update, camp.check_in */
    action: v.string(),
    /** One plain sentence: "Updated Ama Mensah's profile". */
    summary: v.string(),
    outcome: v.union(v.literal('ok'), v.literal('failed')),
    actor_id: v.optional(v.string()),
    actor_name: v.optional(v.string()),
    target_type: v.optional(v.string()),
    target_id: v.optional(v.string()),
    target_label: v.optional(v.string()),
    ip: v.optional(v.string()),
    /** "Chrome on Android" */
    device: v.optional(v.string()),
    details: v.optional(v.any()),
  })
    .index('by_at', ['at'])
    .index('by_actor', ['actor_id', 'at'])
    .index('by_category', ['category', 'at']),

  /**
   * Call center: who is calling whom right now. Claimed in one transaction (callCenter.claimNext),
   * so two callers never get the same person; a claim ends with an outcome, a skip, or on its own
   * at `expires_at` (a phone that died mid-call). `list_key` e.g. `camp:<yearId>`.
   */
  call_claims: defineTable({
    list_key: v.string(),
    target_id: v.string(),
    caller_id: v.string(),
    claimed_at: v.number(),
    expires_at: v.number(),
  })
    .index('by_list_target', ['list_key', 'target_id'])
    .index('by_list', ['list_key'])
    .index('by_caller', ['caller_id']),

  /** A calling session: the team meeting to make the calls together, working one shared queue. */
  call_sessions: defineTable({
    list_key: v.string(),
    title: v.string(),
    /** Who the queue works through: all | new | returning. */
    segment: v.string(),
    started_by: v.string(),
    started_at: v.number(),
    ended_at: v.optional(v.number()),
    status: v.union(v.literal('live'), v.literal('ended')),
    /** "Next person" gives men to men and women to women (when both are known). */
    same_gender: v.optional(v.boolean()),
  }).index('by_list_status', ['list_key', 'status']),

  /**
   * The call team: who gets call lists when calls are shared out with no session running, and how
   * each likes to be given them (lib/calls/distribute.ts).
   */
  call_team: defineTable({
    user_id: v.string(),
    /** For "men call men, women call women"; unset never blocks a match. */
    gender: v.optional(v.union(v.literal('Male'), v.literal('Female'))),
    /** Who they take: everyone, only first-time campers, or only returning ones. */
    takes: v.union(v.literal('all'), v.literal('new'), v.literal('returning')),
    /** The most open calls to give them (unset: no limit). */
    max: v.optional(v.number()),
    /** Off: kept on the team, but given nobody for now. */
    active: v.boolean(),
    added_by: v.string(),
    added_at: v.number(),
  }).index('by_user', ['user_id']),

  /** Who is in a session, and when each was last seen (the board shows who is still calling). */
  call_session_people: defineTable({
    session_id: v.id('call_sessions'),
    user_id: v.string(),
    name: v.string(),
    joined_at: v.number(),
    last_seen: v.number(),
  })
    .index('by_session', ['session_id'])
    .index('by_session_user', ['session_id', 'user_id']),

  /** Each outcome recorded during a session: the board's tally and its recent calls. */
  call_session_outcomes: defineTable({
    session_id: v.id('call_sessions'),
    caller_id: v.string(),
    target_id: v.string(),
    target_name: v.string(),
    outcome: v.string(),
    at: v.number(),
  }).index('by_session', ['session_id']),

  /**
   * WhatsApp templates managers edited or added (lib/calls/templates.ts). One row per key; a row
   * with a default's key replaces that default.
   */
  message_templates: defineTable({
    key: v.string(),
    name: v.string(),
    body: v.string(),
    audience: v.union(v.literal('camp'), v.literal('members'), v.literal('any')),
    position: v.number(),
    archived: v.optional(v.boolean()),
    updated_by: v.string(),
    updated_at: v.number(),
  }).index('by_key', ['key']),

  /**
   * Someone's SMS number changed: every text to `from_phone` goes to `to_phone` instead (applied in
   * sendSms). Keys are 233… digits (lib/comms/sms-number.ts). Sign-in is unaffected.
   */
  sms_number_changes: defineTable({
    from_phone: v.string(),
    to_phone: v.string(),
    set_by: v.string(),
    set_at: v.number(),
    /** Where it was changed, e.g. "camp call". */
    context: v.optional(v.string()),
  }).index('by_from', ['from_phone']),

  /**
   * Campus outreach (Sunday evangelism on a campus): one row per student met, per campus
   * (deduplicated by campus + phone). convex/outreach.ts, lib/actions/outreach.ts.
   */
  outreach_contacts: defineTable({
    campus_id: v.string(),
    full_name: v.string(),
    /** +233… */
    phone: v.string(),
    whatsapp: v.optional(v.string()),
    student_id: v.optional(v.string()),
    level: v.optional(v.string()),
    programme: v.optional(v.string()),
    residence: v.optional(v.union(v.literal('hall'), v.literal('non_resident'))),
    hall: v.optional(v.string()),
    room: v.optional(v.string()),
    area: v.optional(v.string()),
    ministry_interests: v.optional(v.array(v.string())),
    ministry_other: v.optional(v.string()),
    bible_study: v.optional(v.union(v.literal('yes'), v.literal('no'))),
    prayer_request: v.optional(v.string()),
    /** Ghana calendar date (YYYY-MM-DD) they were last met. */
    met_on: v.string(),
    met_by_user_id: v.optional(v.string()),
    met_by_name: v.optional(v.string()),
    source: v.union(v.literal('qr'), v.literal('member')),
    status: v.union(
      v.literal('new'),
      v.literal('contacted'),
      v.literal('bible_study'),
      v.literal('joined'),
      v.literal('not_interested')
    ),
    assigned_to: v.optional(v.string()),
    assigned_name: v.optional(v.string()),
    assigned_at: v.optional(v.number()),
    attempts: v.optional(v.number()),
    last_contact_at: v.optional(v.number()),
    last_outcome: v.optional(v.string()),
    /** Directory user once they join the campus fellowship. */
    user_id: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index('by_campus_met', ['campus_id', 'met_on'])
    .index('by_campus_phone', ['campus_id', 'phone'])
    .index('by_assigned', ['assigned_to'])
    .index('by_met_by', ['met_by_user_id']),

  /** Timeline of one outreach contact: met, calls, WhatsApps, notes, status and assignment changes. */
  outreach_events: defineTable({
    contact_id: v.id('outreach_contacts'),
    at: v.number(),
    by_user_id: v.optional(v.string()),
    by_name: v.optional(v.string()),
    kind: v.union(
      v.literal('met'),
      v.literal('call'),
      v.literal('whatsapp'),
      v.literal('note'),
      v.literal('status'),
      v.literal('assign')
    ),
    outcome: v.optional(v.string()),
    note: v.optional(v.string()),
  }).index('by_contact', ['contact_id']),
})
