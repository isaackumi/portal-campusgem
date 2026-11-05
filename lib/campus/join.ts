import { isValidPhone, normalizePhone } from '@/lib/phone'

/** Public /join/<slug> form: validation and a light in-memory rate limit. Pure. */

export const JOIN_LEVEL_OPTIONS = [
  'Level 100',
  'Level 200',
  'Level 300',
  'Level 400',
  'Level 500+',
  'Postgraduate',
  'Graduated',
] as const

export type CampusJoinInput = {
  full_name: string
  phone: string
  whatsapp?: string
  level?: string
  hall?: string
  programme?: string
}

export type CampusJoinClean = {
  full_name: string
  /** +233… */
  phone: string
  whatsapp?: string
  level?: string
  hall?: string
  programme?: string
}

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim()
  return v ? v.slice(0, max) : undefined
}

export function validateCampusJoin(input: unknown): { data: CampusJoinClean | null; error: string | null } {
  const raw = (input ?? {}) as Record<string, unknown>
  const full_name = text(raw.full_name, 100)
  if (!full_name || full_name.length < 3 || !/[a-z]/i.test(full_name) || !full_name.includes(' ')) {
    return { data: null, error: 'Enter your first and last name.' }
  }
  const phoneRaw = text(raw.phone, 30) ?? ''
  if (!isValidPhone(phoneRaw)) {
    return { data: null, error: 'Enter a valid Ghana mobile number (e.g. 0541234567).' }
  }
  const whatsappRaw = text(raw.whatsapp, 30)
  let whatsapp: string | undefined
  if (whatsappRaw) {
    if (!isValidPhone(whatsappRaw)) return { data: null, error: 'Enter a valid WhatsApp number, or leave it empty.' }
    whatsapp = normalizePhone(whatsappRaw)
  }
  const levelRaw = text(raw.level, 40)
  const level = levelRaw && (JOIN_LEVEL_OPTIONS as readonly string[]).includes(levelRaw) ? levelRaw : undefined
  if (levelRaw && !level) return { data: null, error: 'Choose your level from the list.' }
  return {
    data: {
      full_name,
      phone: normalizePhone(phoneRaw),
      whatsapp,
      level,
      hall: text(raw.hall, 80),
      programme: text(raw.programme, 120),
    },
    error: null,
  }
}

/** One-line note kept on the campus membership: "Level 200 · Hall: Casely-Hayford · BSc Nursing". */
export function joinMembershipNote(clean: Pick<CampusJoinClean, 'level' | 'hall' | 'programme'>): string | undefined {
  const parts = [clean.level, clean.hall ? `Hall: ${clean.hall}` : undefined, clean.programme].filter(Boolean)
  return parts.length ? parts.join(' · ') : undefined
}

/** Fixed-window counter per key. Per server instance only: a speed bump, not a wall. */
export function createWindowLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>()
  return {
    allow(key: string, now = Date.now()): boolean {
      if (hits.size > 5000) {
        hits.forEach((v, k) => {
          if (v.resetAt <= now) hits.delete(k)
        })
      }
      const entry = hits.get(key)
      if (!entry || entry.resetAt <= now) {
        hits.set(key, { count: 1, resetAt: now + windowMs })
        return true
      }
      entry.count += 1
      return entry.count <= limit
    },
  }
}
