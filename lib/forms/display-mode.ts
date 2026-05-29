export type FormDisplayMode = 'classic' | 'stepped'

export const FORM_DISPLAY_MODE_OPTIONS: Array<{
  id: FormDisplayMode
  label: string
  description: string
}> = [
  {
    id: 'stepped',
    label: 'Step-by-step',
    description: 'One question per screen with transitions and progress (recommended).',
  },
  {
    id: 'classic',
    label: 'Classic',
    description: 'All questions on one scrollable page (Google Forms style).',
  },
]

/** Stepped is the default for new forms and legacy rows without display_mode. */
export function normalizeFormDisplayMode(value: string | undefined): FormDisplayMode {
  return value === 'classic' ? 'classic' : 'stepped'
}
