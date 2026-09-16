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
    pageGradient: 'from-mist via-mist-deep to-white',
    heroGradient: 'from-brand-600 via-brand-700 to-brand-900',
    accentHex: '#1d5de0',
    accentSoft: 'bg-brand-50',
    accentBorder: 'border-brand-200',
    accentText: 'text-ink',
    button: 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white',
    progressActive: 'bg-brand-600',
    progressDone: 'bg-brand-200',
    choiceSelected: 'border-brand-500 bg-brand-50 ring-2 ring-brand-200',
    descriptionBox: 'bg-brand-50 border-brand-100 text-ink',
    badge: 'bg-brand-100 text-brand-800',
    steppedPatternOpacity: 0.28,
  },
  sky: {
    id: 'sky',
    pageGradient: 'from-mist via-white to-mist-deep',
    heroGradient: 'from-brand-500 via-brand-700 to-brand-900',
    accentHex: '#2e6be6',
    accentSoft: 'bg-brand-50',
    accentBorder: 'border-brand-200',
    accentText: 'text-ink',
    button: 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white',
    progressActive: 'bg-brand-600',
    progressDone: 'bg-brand-200',
    choiceSelected: 'border-brand-400 bg-brand-50 ring-2 ring-brand-100',
    descriptionBox: 'bg-brand-50 border-brand-100 text-ink',
    badge: 'bg-brand-100 text-brand-800',
    steppedPatternOpacity: 0.28,
  },
  black: {
    id: 'black',
    pageGradient: 'from-mist via-mist-deep to-white',
    heroGradient: 'from-ink via-[#0a1020] to-black',
    accentHex: '#131c33',
    accentSoft: 'bg-mist-deep',
    accentBorder: 'border-ink/15',
    accentText: 'text-ink',
    button: 'bg-ink hover:bg-ink/90 active:bg-black text-white',
    progressActive: 'bg-ink',
    progressDone: 'bg-ink/25',
    choiceSelected: 'border-ink bg-mist ring-2 ring-ink/10',
    descriptionBox: 'bg-mist border-ink/10 text-ink',
    badge: 'bg-mist-deep text-ink',
    steppedPatternOpacity: 0.22,
  },
  slate: {
    id: 'slate',
    pageGradient: 'from-mist via-white to-mist-deep',
    heroGradient: 'from-ink-soft via-ink to-[#0a1020]',
    accentHex: '#4b566b',
    accentSoft: 'bg-mist',
    accentBorder: 'border-ink/10',
    accentText: 'text-ink',
    button: 'bg-ink-soft hover:bg-ink active:bg-ink text-white',
    progressActive: 'bg-ink-soft',
    progressDone: 'bg-mist-deep',
    choiceSelected: 'border-ink-soft bg-mist ring-2 ring-ink/10',
    descriptionBox: 'bg-mist border-ink/10 text-ink',
    badge: 'bg-mist-deep text-ink-soft',
    steppedPatternOpacity: 0.24,
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
