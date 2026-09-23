import { describe, expect, it } from 'bun:test'
import {
  FORM_OTHER_OPTION,
  isAllowedDropdownValue,
  isIncompleteOtherValue,
} from '@/lib/forms/dropdown-other'
import { validateField } from '@/lib/forms/public-form-validation'
import type { ChurchFormField } from '@/lib/types'

function field(partial: Partial<ChurchFormField> & Pick<ChurchFormField, 'label' | 'field_type'>): ChurchFormField {
  return {
    id: partial.id ?? 'f1',
    form_id: 'form',
    label: partial.label,
    field_type: partial.field_type,
    required: partial.required ?? false,
    options: partial.options,
    prefill_key: partial.prefill_key,
    sort_order: 0,
    created_at: '',
    updated_at: '',
  }
}

describe('dropdown Other validation', () => {
  const residence = field({
    label: 'Residence / area',
    field_type: 'dropdown',
    required: true,
    options: ['Mumford', 'Kasoa', FORM_OTHER_OPTION],
    prefill_key: 'residence',
  })

  it('requires a choice', () => {
    expect(validateField(residence, '')).toMatch(/required/)
  })

  it('rejects bare Other', () => {
    expect(isIncompleteOtherValue('Other', residence.options)).toBe(true)
    expect(validateField(residence, 'Other')).toMatch(/specify/)
  })

  it('allows listed towns and custom Other text', () => {
    expect(validateField(residence, 'Mumford')).toBeNull()
    expect(validateField(residence, 'T-junction')).toBeNull()
    expect(isAllowedDropdownValue('T-junction', residence.options)).toBe(true)
    expect(isAllowedDropdownValue('Other', residence.options)).toBe(false)
  })
})
