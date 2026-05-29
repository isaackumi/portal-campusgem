import { CAMP_MEETING_REGISTRATION_CATEGORY } from '@/lib/constants/camp-meeting'
import { CORPORATE_GEM_REGISTRATION_CATEGORY, STUDENT_REGISTRATION_CATEGORY } from '@/lib/constants/corporate-gem'
import { CAMPUS_MEMBER_REGISTRATION_CATEGORY } from '@/lib/forms/templates'
import type { ChurchForm } from '@/lib/types'

export type PublicFormAccentId =
  | 'auto'
  | 'indigo'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'sky'
  | 'slate'

export const PUBLIC_FORM_ACCENT_OPTIONS: Array<{ id: PublicFormAccentId; label: string }> = [
  { id: 'auto', label: 'Auto (from form type)' },
  { id: 'indigo', label: 'Indigo' },
  { id: 'violet', label: 'Violet' },
  { id: 'emerald', label: 'Emerald' },
  { id: 'amber', label: 'Amber' },
  { id: 'rose', label: 'Rose' },
  { id: 'sky', label: 'Sky blue' },
  { id: 'slate', label: 'Neutral slate' },
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
    pageGradient: 'from-indigo-100 via-violet-50 to-white',
    heroGradient: 'from-indigo-600 via-violet-600 to-indigo-800',
    accentHex: '#4f46e5',
    accentSoft: 'bg-indigo-50',
    accentBorder: 'border-indigo-200',
    accentText: 'text-indigo-900',
    button: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800',
    progressActive: 'bg-indigo-600',
    progressDone: 'bg-indigo-300',
    choiceSelected: 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200',
    descriptionBox: 'bg-indigo-50/90 border-indigo-100 text-indigo-950',
    badge: 'bg-indigo-100 text-indigo-800',
  },
  violet: {
    id: 'violet',
    pageGradient: 'from-violet-100 via-fuchsia-50 to-white',
    heroGradient: 'from-violet-600 via-purple-600 to-violet-900',
    accentHex: '#7c3aed',
    accentSoft: 'bg-violet-50',
    accentBorder: 'border-violet-200',
    accentText: 'text-violet-900',
    button: 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800',
    progressActive: 'bg-violet-600',
    progressDone: 'bg-violet-300',
    choiceSelected: 'border-violet-400 bg-violet-50 ring-1 ring-violet-200',
    descriptionBox: 'bg-violet-50/90 border-violet-100 text-violet-950',
    badge: 'bg-violet-100 text-violet-800',
  },
  emerald: {
    id: 'emerald',
    pageGradient: 'from-emerald-100 via-teal-50 to-white',
    heroGradient: 'from-emerald-600 via-teal-600 to-emerald-800',
    accentHex: '#059669',
    accentSoft: 'bg-emerald-50',
    accentBorder: 'border-emerald-200',
    accentText: 'text-emerald-900',
    button: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
    progressActive: 'bg-emerald-600',
    progressDone: 'bg-emerald-300',
    choiceSelected: 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200',
    descriptionBox: 'bg-emerald-50/90 border-emerald-100 text-emerald-950',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  amber: {
    id: 'amber',
    pageGradient: 'from-amber-100 via-orange-50 to-white',
    heroGradient: 'from-amber-500 via-orange-500 to-amber-700',
    accentHex: '#d97706',
    accentSoft: 'bg-amber-50',
    accentBorder: 'border-amber-200',
    accentText: 'text-amber-950',
    button: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
    progressActive: 'bg-amber-600',
    progressDone: 'bg-amber-300',
    choiceSelected: 'border-amber-400 bg-amber-50 ring-1 ring-amber-200',
    descriptionBox: 'bg-amber-50/90 border-amber-100 text-amber-950',
    badge: 'bg-amber-100 text-amber-900',
  },
  rose: {
    id: 'rose',
    pageGradient: 'from-rose-100 via-pink-50 to-white',
    heroGradient: 'from-rose-500 via-pink-600 to-rose-800',
    accentHex: '#e11d48',
    accentSoft: 'bg-rose-50',
    accentBorder: 'border-rose-200',
    accentText: 'text-rose-900',
    button: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800',
    progressActive: 'bg-rose-600',
    progressDone: 'bg-rose-300',
    choiceSelected: 'border-rose-400 bg-rose-50 ring-1 ring-rose-200',
    descriptionBox: 'bg-rose-50/90 border-rose-100 text-rose-950',
    badge: 'bg-rose-100 text-rose-800',
  },
  sky: {
    id: 'sky',
    pageGradient: 'from-sky-100 via-cyan-50 to-white',
    heroGradient: 'from-sky-500 via-cyan-500 to-sky-700',
    accentHex: '#0284c7',
    accentSoft: 'bg-sky-50',
    accentBorder: 'border-sky-200',
    accentText: 'text-sky-900',
    button: 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800',
    progressActive: 'bg-sky-600',
    progressDone: 'bg-sky-300',
    choiceSelected: 'border-sky-400 bg-sky-50 ring-1 ring-sky-200',
    descriptionBox: 'bg-sky-50/90 border-sky-100 text-sky-950',
    badge: 'bg-sky-100 text-sky-800',
  },
  slate: {
    id: 'slate',
    pageGradient: 'from-slate-200 via-slate-50 to-white',
    heroGradient: 'from-slate-700 via-slate-600 to-slate-900',
    accentHex: '#475569',
    accentSoft: 'bg-slate-50',
    accentBorder: 'border-slate-200',
    accentText: 'text-slate-900',
    button: 'bg-slate-800 hover:bg-slate-900 active:bg-black',
    progressActive: 'bg-slate-700',
    progressDone: 'bg-slate-300',
    choiceSelected: 'border-slate-400 bg-slate-50 ring-1 ring-slate-200',
    descriptionBox: 'bg-slate-50/90 border-slate-200 text-slate-900',
    badge: 'bg-slate-100 text-slate-700',
  },
}

function accentFromCategory(category?: string): Exclude<PublicFormAccentId, 'auto'> {
  switch (category) {
    case CAMP_MEETING_REGISTRATION_CATEGORY:
      return 'indigo'
    case STUDENT_REGISTRATION_CATEGORY:
      return 'emerald'
    case CAMPUS_MEMBER_REGISTRATION_CATEGORY:
      return 'amber'
    case CORPORATE_GEM_REGISTRATION_CATEGORY:
      return 'violet'
    default:
      return 'indigo'
  }
}

export function resolvePublicFormTheme(form: Pick<ChurchForm, 'category' | 'accent_color'>): PublicFormTheme {
  const stored = form.accent_color as PublicFormAccentId | undefined
  const id =
    stored && stored !== 'auto' && stored in THEMES
      ? (stored as Exclude<PublicFormAccentId, 'auto'>)
      : accentFromCategory(form.category)
  return THEMES[id]
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
