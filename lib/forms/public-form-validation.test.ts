import { describe, expect, it } from 'bun:test'
import { validateField, validateAllFields } from '@/lib/forms/public-form-validation'
import type { ChurchFormField } from '@/lib/types'

function field(partial: Partial<ChurchFormField> & Pick<ChurchFormField, 'label' | 'field_type'>): ChurchFormField {
  return {
    id: partial.id ?? 'f1',
    form_id: 'form1',
    required: partial.required ?? false,
    sort_order: 0,
    options: partial.options,
    prefill_key: partial.prefill_key,
    description: partial.description,
    updated_at: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('validateField phone/email/dob', () => {
  it('requires filled Ghana phone format even when optional', () => {
    const phone = field({ label: 'Phone number', field_type: 'phone', required: false })
    expect(validateField(phone, '123')).toMatch(/valid Ghana mobile/)
    expect(validateField(phone, '0244123456')).toBeNull()
  })

  it('validates email format when present', () => {
    const email = field({ label: 'Email', field_type: 'email', required: false })
    expect(validateField(email, 'not-an-email')).toMatch(/valid email/)
    expect(validateField(email, 'ama@example.com')).toBeNull()
  })

  it('rejects registration-day birthdays', () => {
    const dob = field({
      label: 'Date of birth',
      field_type: 'date',
      prefill_key: 'date_of_birth',
      required: false,
    })
    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(validateField(dob, iso)).toMatch(/cannot be today or a future date/)
  })

  it('blocks submit when required fields are missing', () => {
    const fields = [
      field({ id: 'n', label: 'Full name', field_type: 'short_text', required: true }),
      field({ id: 'p', label: 'Phone number', field_type: 'phone', required: true }),
    ]
    expect(validateAllFields(fields, {})).toMatch(/Full name is required/)
    expect(
      validateAllFields(fields, { n: 'Ama', p: '0244123456' }, { requirePhoneLookup: true, phone: '0244123456' })
    ).toBeNull()
  })
})
