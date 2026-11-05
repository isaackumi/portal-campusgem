import { formatCampDate } from '@/lib/camp/camp-reminders'
import { firstNameOf } from '@/lib/camp/confirm-link'

/**
 * The opening message a caller sends on WhatsApp (or as a text) when following up a camp
 * registrant. It is only pre-filled: the caller can change it before sending. Calls can't
 * carry a message, so this is used for WhatsApp and SMS links only.
 */
export type CampFollowUpMessageInput = {
  registrant: { first_name?: string | null; full_name?: string | null }
  /** The signed-in person doing the follow-up. */
  callerName?: string | null
  camp?: { year?: number | string | null; theme?: string | null; start_date?: string | null; end_date?: string | null; venue?: string | null } | null
  /** Who we are, e.g. "Campus GEM". */
  ministry?: string
}

function firstWord(name?: string | null): string {
  return name?.trim().split(/\s+/)[0] ?? ''
}

function campLabel(camp: CampFollowUpMessageInput['camp']): string {
  const name = camp?.year ? `Camp Meeting ${camp.year}` : 'Camp Meeting'
  const theme = camp?.theme?.trim()
  return theme ? `${name} (“${theme}”)` : name
}

function campWhen(camp: CampFollowUpMessageInput['camp']): string {
  if (!camp?.start_date) return ''
  const start = formatCampDate(camp.start_date)
  const end = camp.end_date && camp.end_date !== camp.start_date ? formatCampDate(camp.end_date) : ''
  const dates = end ? `${start} – ${end}` : start
  const venue = camp.venue?.trim()
  return venue ? `${dates} at ${venue}` : dates
}

export function buildCampFollowUpMessage(input: CampFollowUpMessageInput): string {
  const ministry = input.ministry?.trim() || 'Campus GEM'
  const who = firstNameOf(input.registrant)
  const caller = firstWord(input.callerName)
  const intro = caller ? `this is ${caller} from ${ministry}` : `this is ${ministry}`
  const when = campWhen(input.camp)

  return [
    `Hi ${who}, ${intro} 👋`,
    `I'm texting to confirm your registration for ${campLabel(input.camp)}${when ? `, ${when}` : ''}. Are you still coming? Just reply YES or NO, and let me know if anything has changed or you need help with anything.`,
    `We'd love you to stay connected with us before and after camp: our services, fellowship and WhatsApp updates are there for you. God bless you!`,
  ].join('\n\n')
}
