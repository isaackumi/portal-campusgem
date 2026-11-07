/**
 * How the activity log reads: each category's name and colour, a phone or browser named the way
 * people say it, and phone numbers masked where only part should show. Pure, shared by the server
 * (when logging) and the page (when showing).
 */

export type ActivityCategory = 'auth' | 'access' | 'people' | 'groups' | 'camp' | 'calls' | 'sms' | 'settings'

/** Colours match the sidebar and workspace switcher where they share an area. Full classes for Tailwind. */
export const ACTIVITY_CATEGORIES: Array<{ id: ActivityCategory; label: string; tone: string; dot: string }> = [
  { id: 'auth', label: 'Sign-ins', tone: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300', dot: 'bg-brand-500' },
  { id: 'access', label: 'Access', tone: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', dot: 'bg-violet-500' },
  { id: 'people', label: 'People', tone: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300', dot: 'bg-teal-500' },
  { id: 'groups', label: 'Groups', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500' },
  { id: 'camp', label: 'Camp meeting', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  { id: 'calls', label: 'Calls', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  { id: 'sms', label: 'Texts', tone: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', dot: 'bg-sky-500' },
  { id: 'settings', label: 'Settings', tone: 'bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:text-neutral-300', dot: 'bg-neutral-500' },
]

const BY_ID = new Map(ACTIVITY_CATEGORIES.map((c) => [c.id, c]))

export function categoryMeta(id: string) {
  return BY_ID.get(id as ActivityCategory) ?? ACTIVITY_CATEGORIES[ACTIVITY_CATEGORIES.length - 1]!
}

export function isActivityCategory(value: unknown): value is ActivityCategory {
  return typeof value === 'string' && BY_ID.has(value as ActivityCategory)
}

/** "Chrome on Android", "Safari on iPhone", "Edge on Windows": enough to recognise a device. */
export function describeDevice(userAgent: string | null | undefined): string | undefined {
  const ua = userAgent ?? ''
  if (!ua) return undefined
  const os = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'Mac'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'another device'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung Internet'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Chrome\//.test(ua) || /CriOS\//.test(ua)
            ? 'Chrome'
            : /Safari\//.test(ua)
              ? 'Safari'
              : 'a browser'
  return `${browser} on ${os}`
}

/** "024•••••67": enough to recognise, not enough to reuse (failed sign-ins). */
export function maskPhone(value: string | null | undefined): string {
  const raw = (value ?? '').trim()
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 6) return raw ? `${raw.slice(0, 2)}•••` : ''
  return `${digits.slice(0, 3)}${'•'.repeat(Math.max(3, digits.length - 5))}${digits.slice(-2)}`
}

/** The first address in x-forwarded-for (the visitor), trimmed. */
export function clientIp(forwardedFor: string | null | undefined, realIp?: string | null): string | undefined {
  const first = forwardedFor?.split(',')[0]?.trim()
  return first || realIp?.trim() || undefined
}
