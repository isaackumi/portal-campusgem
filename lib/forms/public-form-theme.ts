import type { ChurchForm } from '@/lib/types'

export type PublicFormAccentId =
  | 'auto'
  | 'indigo'
  | 'sky'
  | 'slate'

export const PUBLIC_FORM_ACCENT_OPTIONS: Array<{ id: PublicFormAccentId; label: string }> = [
  { id: 'auto', label: 'Blue (auto — recommended)' },
  { id: 'indigo', label: 'Blue' },
  { id: 'sky', label: 'Light blue' },
  { id: 'slate', label: 'Neutral gray' },
]

export type PublicFormTheme = {
  id: Exclude<PublicFormAccentId, 'auto'>
  pageGradient: string
  heroGradient: string
  accentHex: string
  accentSoft: string
  accentBorder: string
  accentText: string
  button: string
  progressActive: string
  progressDone: string
  choiceSelected: string
  descriptionBox: string
  badge: string
}

const THEMES: Record<Exclude<PublicFormAccentId, 'auto'>, PublicFormTheme> = {
  indigo: {
    id: 'indigo',
    pageGradient: 'from-indigo-50 via-slate-50 to-white',
    heroGradient: 'from-indigo-600 to-indigo-800',
    accentHex: '#4338ca',
    accentSoft: 'bg-indigo-50',
    accentBorder: 'border-indigo-200',
    accentText: 'text-indigo-950',
    button: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white',
    progressActive: 'bg-indigo-600',
    progressDone: 'bg-indigo-200',
    choiceSelected: 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200',
    descriptionBox: 'bg-indigo-50 border-indigo-100 text-indigo-950',
    badge: 'bg-indigo-100 text-indigo-900',
  },
  sky: {
    id: 'sky',
    pageGradient: 'from-sky-50 via-slate-50 to-white',
    heroGradient: 'from-sky-600 to-sky-800',
    accentHex: '#0369a1',
    accentSoft: 'bg-sky-50',
    accentBorder: 'border-sky-200',
    accentText: 'text-sky-950',
    button: 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white',
    progressActive: 'bg-sky-600',
    progressDone: 'bg-sky-200',
    choiceSelected: 'border-sky-500 bg-sky-50 ring-2 ring-sky-200',
    descriptionBox: 'bg-sky-50 border-sky-100 text-sky-950',
    badge: 'bg-sky-100 text-sky-900',
  },
  slate: {
    id: 'slate',
    pageGradient: 'from-slate-100 via-slate-50 to-white',
    heroGradient: 'from-slate-700 to-slate-900',
    accentHex: '#334155',
    accentSoft: 'bg-slate-100',
    accentBorder: 'border-slate-300',
    accentText: 'text-slate-900',
    button: 'bg-slate-800 hover:bg-slate-900 active:bg-black text-white',
    progressActive: 'bg-slate-700',
    progressDone: 'bg-slate-300',
    choiceSelected: 'border-slate-500 bg-slate-50 ring-2 ring-slate-200',
    descriptionBox: 'bg-slate-50 border-slate-200 text-slate-900',
    badge: 'bg-slate-200 text-slate-800',
  },
}

/** All form types default to blue unless admin picks another theme. */
function accentFromCategory(_category?: string): Exclude<PublicFormAccentId, 'auto'> {
  return 'indigo'
}

export function resolvePublicFormTheme(form: Pick<ChurchForm, 'category' | 'accent_color'>): PublicFormTheme {
  const stored = form.accent_color as PublicFormAccentId | undefined
  const legacyMap: Record<string, Exclude<PublicFormAccentId, 'auto'>> = {
    violet: 'indigo',
    emerald: 'indigo',
    amber: 'indigo',
    rose: 'indigo',
  }
  const normalized =
    stored && stored !== 'auto'
      ? stored in THEMES
        ? (stored as Exclude<PublicFormAccentId, 'auto'>)
        : legacyMap[stored] ?? 'indigo'
      : accentFromCategory(form.category)
  return THEMES[normalized]
}

export function isValidCoverImageUrl(url: string | undefined): boolean {
  if (!url?.trim()) return false
  try {
    const parsed = new URL(url.trim())
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}
