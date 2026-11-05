/**
 * Incoming SMS replies (webhook `/api/sms/inbound`). Pure helpers only: payload parsing,
 * shared-secret check, keyword handling and thread grouping. Shared by the route and tests.
 */

export type InboundSms = {
  /** Sender as the provider sent it. */
  from: string
  /** Our number / short code / sender ID it was sent to, when given. */
  to?: string
  body: string
  provider_message_id?: string
}

const FROM_KEYS = ['From', 'from', 'msisdn', 'Msisdn', 'MSISDN', 'sender', 'Sender', 'phone', 'Phone']
const BODY_KEYS = ['Content', 'content', 'Text', 'text', 'message', 'Message', 'body', 'Body']
const TO_KEYS = ['To', 'to', 'shortcode', 'ShortCode', 'Shortcode', 'destination']
const ID_KEYS = ['MessageId', 'messageId', 'message_id', 'MessageID', 'Id', 'id', 'SmsId', 'smsId']

function pick(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (value == null) continue
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim()
      if (text) return text
    }
  }
  return undefined
}

/**
 * Accepts Hubtel's inbound fields (`From`, `To`, `Content`, `MessageId`) and generic ones
 * (`from` / `msisdn`, `Text` / `message`, ...). A nested `Data` / `data` object (some
 * Hubtel callbacks wrap the message) is read too. Returns null when sender or text is missing.
 */
export function parseInboundSms(payload: unknown): InboundSms | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const record = payload as Record<string, unknown>
  const nested = [record.Data, record.data].find(
    (v): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v)
  )
  const sources = nested ? [record, nested] : [record]

  const get = (keys: string[]) => {
    for (const source of sources) {
      const found = pick(source, keys)
      if (found) return found
    }
    return undefined
  }

  const from = get(FROM_KEYS)
  const body = get(BODY_KEYS)
  if (!from || body == null) return null
  const cleanFrom = from.replace(/[^\d+]/g, '')
  if (cleanFrom.replace(/\D/g, '').length < 6) return null

  return {
    from: cleanFrom,
    to: get(TO_KEYS),
    body: body.slice(0, 2000),
    provider_message_id: get(ID_KEYS)?.slice(0, 200),
  }
}

/** URLSearchParams / FormData style entries to a plain object (first value wins). */
export function entriesToRecord(entries: Iterable<[string, unknown]>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Array.from(entries)) {
    if (!(key in out) && typeof value === 'string') out[key] = value
  }
  return out
}

/** Constant-time-ish string compare (lengths leak, contents don't). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Shared-secret check. `provided` comes from `?secret=` or `Authorization: Bearer`.
 * With no secret configured, only non-production servers accept calls (for local testing).
 */
export function inboundSecretOk(args: {
  configured: string | undefined | null
  provided: string | undefined | null
  isProduction: boolean
}): boolean {
  const configured = args.configured?.trim()
  if (!configured) return !args.isProduction
  const provided = args.provided?.trim()
  return Boolean(provided) && safeEqual(provided!, configured)
}

export function bearerToken(header: string | null | undefined): string | undefined {
  const m = /^Bearer\s+(.+)$/i.exec(header?.trim() ?? '')
  return m?.[1]?.trim() || undefined
}

export type InboundKeyword = 'stop' | 'start' | 'yes' | 'no'

const STOP_WORDS = new Set(['STOP', 'UNSUBSCRIBE', 'STOPALL', 'CANCEL', 'END', 'QUIT', 'OPTOUT', 'OPT-OUT'])
const START_WORDS = new Set(['START', 'UNSTOP', 'SUBSCRIBE', 'OPTIN', 'OPT-IN'])
const YES_WORDS = new Set(['YES', 'Y', 'YEAH', 'YEP', 'YES!', 'OK', 'OKAY', 'CONFIRM', 'COMING'])
const NO_WORDS = new Set(['NO', 'N', 'NOPE', 'NOT COMING', "CAN'T COME", 'CANT COME'])

/**
 * Whole-message keywords only ("stop", "Yes.", "  NO  "), so "stop sending at night"
 * or "yes, but late" are left for a person to read.
 */
export function classifyKeyword(body: string): InboundKeyword | null {
  const text = body
    .trim()
    .replace(/[.!?\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase()
  if (!text) return null
  if (STOP_WORDS.has(text)) return 'stop'
  if (START_WORDS.has(text)) return 'start'
  if (YES_WORDS.has(text)) return 'yes'
  if (NO_WORDS.has(text)) return 'no'
  return null
}

export type InboundAction = {
  keyword: InboundKeyword | null
  /** Labels shown to staff. */
  tags: string[]
  /** true = opt out, false = opt back in, undefined = leave as is. */
  optOut?: boolean
}

/**
 * What to do with a reply. STOP / START change the opt-out flag. YES / NO from a camp
 * registrant only tag the message (`confirm-yes` / `confirm-no`); staff update the
 * registration themselves.
 */
export function inboundAction(body: string, sender: { isCampRegistrant: boolean }): InboundAction {
  const keyword = classifyKeyword(body)
  if (keyword === 'stop') return { keyword, tags: ['opt-out'], optOut: true }
  if (keyword === 'start') return { keyword, tags: ['opt-in'], optOut: false }
  if (keyword === 'yes' && sender.isCampRegistrant) return { keyword, tags: ['confirm-yes'] }
  if (keyword === 'no' && sender.isCampRegistrant) return { keyword, tags: ['confirm-no'] }
  return { keyword, tags: [] }
}

export const INBOX_TAG_LABELS: Record<string, string> = {
  'opt-out': 'Opted out (STOP)',
  'opt-in': 'Opted back in',
  'confirm-yes': 'Camp: says YES',
  'confirm-no': 'Camp: says NO',
}

export type InboxMessage = {
  id: string
  phone: string
  body: string
  received_at: number
  read_at?: number
  archived?: boolean
  sender_name?: string
  tags?: string[]
}

export type InboxThreadSummary = {
  phone: string
  sender_name?: string
  last_body: string
  last_at: number
  unread: number
  count: number
  archived: boolean
  tags: string[]
}

/** Newest-first thread list from inbound messages. A thread is archived only if all its messages are. */
export function groupThreads(messages: InboxMessage[]): InboxThreadSummary[] {
  const byPhone = new Map<string, InboxThreadSummary>()
  for (const m of messages) {
    const t = byPhone.get(m.phone)
    if (!t) {
      byPhone.set(m.phone, {
        phone: m.phone,
        sender_name: m.sender_name,
        last_body: m.body,
        last_at: m.received_at,
        unread: m.read_at || m.archived ? 0 : 1,
        count: 1,
        archived: Boolean(m.archived),
        tags: [...(m.tags ?? [])],
      })
      continue
    }
    t.count++
    if (!m.read_at && !m.archived) t.unread++
    if (!m.archived) t.archived = false
    if (!t.sender_name && m.sender_name) t.sender_name = m.sender_name
    if (m.received_at > t.last_at) {
      t.last_at = m.received_at
      t.last_body = m.body
      if (m.sender_name) t.sender_name = m.sender_name
    }
    for (const tag of m.tags ?? []) if (!t.tags.includes(tag)) t.tags.push(tag)
  }
  return Array.from(byPhone.values()).sort((a, b) => b.last_at - a.last_at)
}
