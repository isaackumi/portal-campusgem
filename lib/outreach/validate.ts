import { isValidPhone, normalizePhone } from '@/lib/phone'
import { MINISTRY_INTERESTS, OUTREACH_LEVELS } from '@/lib/outreach/options'
import type { OutreachAnswers } from '@/lib/outreach/types'

/**
 * Outreach form validation, used by the form (inline errors) and again on the server (the
 * only check that counts). Pure. Only name and call number are required.
 */

export type OutreachField =
  | 'full_name'
  | 'phone'
  | 'whatsapp'
  | 'student_id'
  | 'level'
  | 'programme'
  | 'hall'
  | 'room'
  | 'area'
  | 'ministry_other'
  | 'prayer_request'

export type OutreachValidation =
  | { ok: true; data: OutreachAnswers }
  | { ok: false; errors: Partial<Record<OutreachField, string>> }

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim()
  return v ? v.slice(0, max) : undefined
}

/** Like `text` but keeps line breaks (prayer requests). */
function longText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f<>]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return v ? v.slice(0, max) : undefined
}

export function validateOutreachAnswers(input: unknown): OutreachValidation {
  const raw = (input ?? {}) as Record<string, unknown>
  const errors: Partial<Record<OutreachField, string>> = {}

  const full_name = text(raw.full_name, 100)
  if (!full_name || full_name.replace(/[^a-z]/gi, '').length < 2) errors.full_name = 'Enter a name.'

  const phoneRaw = text(raw.phone, 30) ?? ''
  if (!phoneRaw) errors.phone = 'Enter a call number.'
  else if (!isValidPhone(phoneRaw)) errors.phone = 'Enter a Ghana mobile number, e.g. 0541234567.'

  const whatsappRaw = text(raw.whatsapp, 30)
  let whatsapp: string | undefined
  if (whatsappRaw) {
    if (!isValidPhone(whatsappRaw)) errors.whatsapp = 'Enter a Ghana mobile number, or tick “same number”.'
    else whatsapp = normalizePhone(whatsappRaw)
  }

  const levelRaw = text(raw.level, 20)
  const level = levelRaw && (OUTREACH_LEVELS as readonly string[]).includes(levelRaw) ? levelRaw : undefined
  if (levelRaw && !level) errors.level = 'Choose a level.'

  const residence = raw.residence === 'hall' || raw.residence === 'non_resident' ? raw.residence : undefined
  const interests = Array.isArray(raw.ministry_interests)
    ? Array.from(
        new Set(
          raw.ministry_interests.filter(
            (x): x is string => typeof x === 'string' && (MINISTRY_INTERESTS as readonly string[]).includes(x)
          )
        )
      )
    : []
  const ministry_other = interests.includes('Other') ? text(raw.ministry_other, 120) : undefined
  const bible_study = raw.bible_study === 'yes' || raw.bible_study === 'no' ? raw.bible_study : undefined

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const phone = normalizePhone(phoneRaw)
  return {
    ok: true,
    data: {
      full_name: full_name!,
      phone,
      // Same as the call number: not stored twice.
      whatsapp: whatsapp && whatsapp !== phone ? whatsapp : undefined,
      student_id: text(raw.student_id, 30),
      level,
      programme: text(raw.programme, 120),
      residence,
      hall: residence === 'hall' ? text(raw.hall, 80) : undefined,
      room: residence === 'hall' ? text(raw.room, 20) : undefined,
      area: residence === 'non_resident' ? text(raw.area, 100) : undefined,
      ministry_interests: interests.length ? interests : undefined,
      ministry_other,
      bible_study,
      prayer_request: longText(raw.prayer_request, 1000),
    },
  }
}

/** First error message, for a toast or the top of the form. */
export function firstOutreachError(errors: Partial<Record<OutreachField, string>>): string {
  return Object.values(errors)[0] ?? 'Check the form.'
}
