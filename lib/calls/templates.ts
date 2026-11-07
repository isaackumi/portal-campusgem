/**
 * WhatsApp message templates for the call center.
 *
 * A caller picks one per message; it is only pre-filled, so they can change it before sending.
 * The app ships a ready set (`DEFAULT_CALL_TEMPLATES`); managers can edit any of them, add their
 * own and hide ones they don't use. Saved templates are kept in Convex (`message_templates`) and
 * win over the default with the same `key`.
 *
 * Placeholders use the same {{double braces}} as camp SMS. Unknown placeholders are left out of
 * the finished message rather than sent as "{{something}}".
 */

export type TemplateAudience = 'camp' | 'members' | 'any'

export type CallTemplate = {
  /** Stable id: a default's key, or `custom-…` for one a manager added. */
  key: string
  name: string
  body: string
  audience: TemplateAudience
  /** Order in the picker (lower first). */
  position: number
  /** Hidden from callers (kept, so it can be shown again). */
  archived?: boolean
  /** True for an app default nobody has changed. */
  isDefault?: boolean
}

export type TemplateVariable = { key: string; label: string; example: string }

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: 'firstName', label: 'First name', example: 'Ama' },
  { key: 'name', label: 'Full name', example: 'Ama Mensah' },
  { key: 'callerName', label: 'Your name', example: 'Kofi' },
  { key: 'ministry', label: 'Ministry', example: 'Campus GEM' },
  { key: 'campYear', label: 'Camp year', example: '2026' },
  { key: 'campDates', label: 'Camp dates', example: '12 – 16 Aug' },
  { key: 'venue', label: 'Venue', example: 'Abokobi Camp' },
  { key: 'theme', label: 'Theme', example: 'Arise and shine' },
  { key: 'group', label: 'Group or campus', example: 'Legon campus' },
]

export type TemplateVars = Partial<Record<(typeof TEMPLATE_VARIABLES)[number]['key'], string | number | null | undefined>>

/** The ready set. Plain, warm and short: they go out from a person, not a bulk sender. */
export const DEFAULT_CALL_TEMPLATES: CallTemplate[] = [
  {
    key: 'camp-confirm',
    name: 'Are you still coming?',
    audience: 'camp',
    position: 10,
    body: `Hi {{firstName}}, this is {{callerName}} from {{ministry}}. I'm checking in about Camp Meeting {{campYear}} ({{campDates}}, {{venue}}). Are you still coming? Just reply YES or NO, and tell me if anything has changed. God bless you!`,
  },
  {
    key: 'camp-missed-call',
    name: 'Sorry I missed you',
    audience: 'camp',
    position: 20,
    body: `Hi {{firstName}}, it's {{callerName}} from {{ministry}}. I tried calling about Camp Meeting {{campYear}}. When is a good time to talk? Or just reply here: are you still coming?`,
  },
  {
    key: 'camp-reminder',
    name: 'Camp is close',
    audience: 'camp',
    position: 30,
    body: `Hi {{firstName}}! Camp Meeting {{campYear}} is almost here: {{campDates}} at {{venue}}. We can't wait to see you. Reply if you need anything before then.`,
  },
  {
    key: 'camp-directions',
    name: 'How to get there',
    audience: 'camp',
    position: 40,
    body: `Hi {{firstName}}, here's how to get to Camp Meeting {{campYear}} at {{venue}}. Reply if you'd like someone to guide you on the day, and we'll share a contact.`,
  },
  {
    key: 'camp-payment',
    name: 'Payment reminder',
    audience: 'camp',
    position: 50,
    body: `Hi {{firstName}}, this is {{callerName}} from {{ministry}}. A gentle reminder to complete your Camp Meeting {{campYear}} payment. Reply if you need help or the payment details.`,
  },
  {
    key: 'camp-thanks',
    name: 'Thanks for confirming',
    audience: 'camp',
    position: 60,
    body: `Thank you, {{firstName}}! We've noted that you're coming to Camp Meeting {{campYear}}. See you at {{venue}}. God bless you!`,
  },
  {
    key: 'members-welcome',
    name: 'Welcome',
    audience: 'members',
    position: 110,
    body: `Hi {{firstName}}, this is {{callerName}} from {{ministry}}. We're so glad you joined us! If you need anything, or want to know about our services and fellowship, just reply here. God bless you!`,
  },
  {
    key: 'members-missed-you',
    name: 'We missed you',
    audience: 'members',
    position: 120,
    body: `Hi {{firstName}}, it's {{callerName}} from {{ministry}}. We've missed you at church lately and wanted to check you're well. Is there anything we can pray about with you?`,
  },
  {
    key: 'members-prayer',
    name: 'Praying for you',
    audience: 'members',
    position: 130,
    body: `Hi {{firstName}}, {{callerName}} here from {{ministry}}. Just letting you know we're praying for you this week. Reply if there's something specific we can pray about.`,
  },
  {
    key: 'members-invite',
    name: 'See you on Sunday',
    audience: 'members',
    position: 140,
    body: `Hi {{firstName}}! It's {{callerName}} from {{ministry}}. We'd love to see you at church this Sunday. Reply if you'd like a lift or have any questions.`,
  },
  {
    key: 'any-missed-call',
    name: 'Tried calling you',
    audience: 'any',
    position: 200,
    body: `Hi {{firstName}}, it's {{callerName}} from {{ministry}}. I tried calling you just now. When is a good time to talk?`,
  },
]

export const TEMPLATE_LIMITS = { name: 60, body: 1000, perAudience: 40 }

/** Fill {{placeholders}}. Missing values drop out cleanly (no "{{venue}}", no ", ," left behind). */
export function fillCallTemplate(body: string, vars: TemplateVars): string {
  const filled = body.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key]
    return value === undefined || value === null ? '' : String(value).trim()
  })
  return filled
    .replace(/\(\s*,\s*/g, '(')
    .replace(/,\s*\)/g, ')')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]+([,.!?])/g, '$1')
    .replace(/,\s*,/g, ',')
    .replace(/(^|\s)at\s*([.,!?])/g, '$2')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +\n/g, '\n')
    .trim()
}

/** The placeholders a body uses that the app doesn't know (shown as a warning while editing). */
export function unknownPlaceholders(body: string): string[] {
  const known = new Set(TEMPLATE_VARIABLES.map((v) => v.key))
  const found = Array.from(body.matchAll(/\{\{\s*([a-zA-Z]+)\s*\}\}/g), (m) => m[1])
  return Array.from(new Set(found.filter((key) => !known.has(key))))
}

export function isTemplateAudience(value: unknown): value is TemplateAudience {
  return value === 'camp' || value === 'members' || value === 'any'
}

/** A template as typed by a manager, cleaned; an error says what to fix. */
export function cleanTemplateInput(input: {
  key?: string | null
  name?: string | null
  body?: string | null
  audience?: string | null
  position?: number | null
  archived?: boolean | null
}): { template: Omit<CallTemplate, 'isDefault'> | null; error: string | null } {
  const name = (input.name ?? '').trim().slice(0, TEMPLATE_LIMITS.name)
  const body = (input.body ?? '').replace(/\r\n/g, '\n').trim()
  if (!name) return { template: null, error: 'Give the template a short name.' }
  if (!body) return { template: null, error: 'Write the message.' }
  if (body.length > TEMPLATE_LIMITS.body) return { template: null, error: `Keep the message under ${TEMPLATE_LIMITS.body} characters.` }
  const audience = isTemplateAudience(input.audience) ? input.audience : 'any'
  const key = input.key && /^[a-z0-9-]{3,60}$/.test(input.key) ? input.key : `custom-${Date.now().toString(36)}`
  const position = Number.isFinite(input.position) ? Number(input.position) : 1000
  return { template: { key, name, body, audience, position, archived: Boolean(input.archived) }, error: null }
}

/**
 * The templates a picker shows: defaults, with the saved ones taking their place by key, plus
 * custom ones; hidden ones left out unless asked for. `audience` 'camp' shows camp + any.
 */
export function templatesFor(
  audience: TemplateAudience,
  saved: readonly CallTemplate[],
  options: { includeArchived?: boolean } = {}
): CallTemplate[] {
  const byKey = new Map<string, CallTemplate>()
  for (const t of DEFAULT_CALL_TEMPLATES) byKey.set(t.key, { ...t, isDefault: true })
  for (const t of saved) byKey.set(t.key, { ...t, isDefault: false })
  return Array.from(byKey.values())
    .filter((t) => audience === 'any' || t.audience === audience || t.audience === 'any')
    .filter((t) => options.includeArchived || !t.archived)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
}
