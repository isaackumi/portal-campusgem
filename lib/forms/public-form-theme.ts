import type { ChurchForm } from '@/lib/types'

export type PublicFormAccentId =
  | 'auto'
  | 'indigo'
  | 'sky'
  | 'black'
  | 'slate'

export const PUBLIC_FORM_ACCENT_OPTIONS: Array<{ id: PublicFormAccentId; label: string }> = [
  { id: 'auto', label: 'Blue (auto — recommended)' },
  { id: 'indigo', label: 'Blue' },
  { id: 'sky', label: 'Light blue' },
  { id: 'black', label: 'Black' },
  { id: 'slate', label: 'Neutral gray' },
]

export type PublicFormTheme = {
  id: Exclude<PublicFormAccentId, 'auto'>
  pageGradient: string
  /** Full-page stepped background gradient */
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
  /** Dot pattern opacity on stepped background (0–1) */
  steppedPatternOpacity: number
}

const THEMES: Record<Exclude<PublicFormAccentId, 'auto'>, PublicFormTheme> = {
  indigo: {
    id: 'indigo',
    pageGradient: 'from-indigo-50 via-slate-50 to-white',
    heroGradient: 'from-indigo-600 via-indigo-700 to-indigo-950',
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
    steppedPatternOpacity: 0.35,
  },
  sky: {
    id: 'sky',
    pageGradient: 'from-sky-50 via-slate-50 to-white',
    heroGradient: 'from-sky-600 via-sky-700 to-sky-950',
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
    steppedPatternOpacity: 0.32,
  },
  black: {
    id: 'black',
    pageGradient: 'from-neutral-100 via-neutral-50 to-white',
    heroGradient: 'from-neutral-800 via-neutral-950 to-black',
    accentHex: '#171717',
    accentSoft: 'bg-neutral-100',
    accentBorder: 'border-neutral-300',
    accentText: 'text-neutral-950',
    button: 'bg-neutral-900 hover:bg-black active:bg-black text-white',
    progressActive: 'bg-neutral-900',
    progressDone: 'bg-neutral-400',
    choiceSelected: 'border-neutral-700 bg-neutral-100 ring-2 ring-neutral-300',
    descriptionBox: 'bg-neutral-100 border-neutral-200 text-neutral-950',
    badge: 'bg-neutral-200 text-neutral-900',
    steppedPatternOpacity: 0.28,
  },
  slate: {
    id: 'slate',
    pageGradient: 'from-slate-100 via-slate-50 to-white',
    heroGradient: 'from-slate-600 via-slate-700 to-slate-950',
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
    steppedPatternOpacity: 0.3,
  },
}

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
