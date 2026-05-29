export type FormDisplayMode = 'classic' | 'stepped'

export const FORM_DISPLAY_MODE_OPTIONS: Array<{
  id: FormDisplayMode
  label: string
  description: string
}> = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'All questions on one scrollable page (Google Forms style).',
  },
  {
    id: 'stepped',
    label: 'Step-by-step',
    description: 'One question per screen with transitions and progress (Typeform style).',
  },
]

export function normalizeFormDisplayMode(value: string | undefined): FormDisplayMode {
  return value === 'stepped' ? 'stepped' : 'classic'
}
