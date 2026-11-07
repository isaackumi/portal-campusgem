/** Campus outreach: shapes shared by the server actions, the bridge and the pages. Pure. */

export const OUTREACH_STATUSES = ['new', 'contacted', 'bible_study', 'joined', 'not_interested'] as const
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number]

export const OUTREACH_EVENT_KINDS = ['met', 'call', 'whatsapp', 'note', 'status', 'assign'] as const
export type OutreachEventKind = (typeof OUTREACH_EVENT_KINDS)[number]

export type OutreachResidence = 'hall' | 'non_resident'

export type OutreachContact = {
  id: string
  campus_id: string
  full_name: string
  /** +233… */
  phone: string
  whatsapp?: string
  student_id?: string
  level?: string
  programme?: string
  residence?: OutreachResidence
  hall?: string
  room?: string
  area?: string
  ministry_interests?: string[]
  ministry_other?: string
  bible_study?: 'yes' | 'no'
  prayer_request?: string
  /** YYYY-MM-DD, Ghana calendar date they were last met. */
  met_on: string
  met_by_user_id?: string
  met_by_name?: string
  source: 'qr' | 'member'
  status: OutreachStatus
  assigned_to?: string
  assigned_name?: string
  assigned_at?: number
  attempts?: number
  last_contact_at?: number
  last_outcome?: string
  user_id?: string
  created_at: number
  updated_at: number
}

export type OutreachEvent = {
  id: string
  contact_id: string
  at: number
  by_user_id?: string
  by_name?: string
  kind: OutreachEventKind
  outcome?: string
  note?: string
}

/** The answers a student (or a GEM member for them) fills in. */
export type OutreachAnswers = {
  full_name: string
  phone: string
  whatsapp?: string
  student_id?: string
  level?: string
  programme?: string
  residence?: OutreachResidence
  hall?: string
  room?: string
  area?: string
  ministry_interests?: string[]
  ministry_other?: string
  bible_study?: 'yes' | 'no'
  prayer_request?: string
}

/** The campus as the outreach pages see it. */
export type OutreachCampus = {
  id: string
  key: string
  name: string
  label: string
  short_code?: string
}
