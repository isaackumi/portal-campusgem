export type FormDisplayMode = 'classic' | 'stepped'

export const FORM_DISPLAY_MODE_OPTIONS: Array<{
  id: FormDisplayMode
  label: string
  description: string
}> = [
  {
    id: 'stepped',
    label: 'Step-by-step',
    description: 'One question per screen with transitions and progress.',
  },
  {
    id: 'classic',
    label: 'Classic',
    description: 'All questions on one scrollable page (recommended).',
  },
]

/**
 * For now every form shows as Classic (all questions on one page), whatever was saved. Set this
 * back to true to bring back the per-form choice and step-by-step forms.
 */
export const STEPPED_FORMS_ENABLED = false

/** Classic is the default for new forms and rows without display_mode. */
export function normalizeFormDisplayMode(value: string | undefined): FormDisplayMode {
  if (!STEPPED_FORMS_ENABLED) return 'classic'
  return value === 'stepped' ? 'stepped' : 'classic'
}
