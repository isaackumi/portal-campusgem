import type { ChurchForm, ChurchFormField } from '@/lib/types'

export type SteppedScreen =
  | { kind: 'intro' }
  | { kind: 'phone' }
  | { kind: 'field'; field: ChurchFormField }
  | { kind: 'location' }
  | { kind: 'review' }

export function buildSteppedScreens(input: {
  form: ChurchForm
  fields: ChurchFormField[]
  showPhoneStep: boolean
  visibleFields: ChurchFormField[]
}): SteppedScreen[] {
  const screens: SteppedScreen[] = [{ kind: 'intro' }]

  if (input.showPhoneStep) {
    screens.push({ kind: 'phone' })
  }

  for (const field of input.visibleFields) {
    screens.push({ kind: 'field', field })
  }

  if (input.form.capture_respondent_location) {
    screens.push({ kind: 'location' })
  }

  screens.push({ kind: 'review' })
  return screens
}
