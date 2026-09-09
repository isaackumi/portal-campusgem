import { describe, expect, test } from 'bun:test'
import {
  buildCampFormPrefillMap,
  mapFormValuesToCampRegistrationInput,
  resolveCampFormPrefillKey,
} from '@/convex/lib/campFormSubmit'
import type { Doc, Id } from '@/convex/_generated/dataModel'

describe('camp form submit mapping', () => {
  test('resolves Location and Comments by label when prefill_key is missing', () => {
    expect(resolveCampFormPrefillKey({ label: 'Location' })).toBe('camp_location')
    expect(resolveCampFormPrefillKey({ label: 'Comments' })).toBe('registration_notes')
    expect(resolveCampFormPrefillKey({ label: 'WhatsApp number' })).toBe('whatsapp')
  })

  test('maps whatsapp, location, and comments into registration input', () => {
    const fields = [
      { _id: 'f1', label: 'Full name', prefill_key: 'full_name' },
      { _id: 'f2', label: 'Phone number', prefill_key: 'phone' },
      { _id: 'f3', label: 'WhatsApp number', prefill_key: 'whatsapp' },
      { _id: 'f4', label: 'Location' },
      { _id: 'f5', label: 'Comments' },
      { _id: 'f6', label: 'Sex / Gender', prefill_key: 'sex' },
      { _id: 'f7', label: 'Age bracket', prefill_key: 'age_bracket' },
      { _id: 'f8', label: 'Education level', prefill_key: 'education_level' },
      { _id: 'f9', label: 'Residence / area', prefill_key: 'residence' },
    ] as unknown as Doc<'form_fields'>[]

    const values = {
      f1: 'Ama Mensah',
      f2: '0244123456',
      f3: '0555987654',
      f4: 'Coming from Tema',
      f5: 'Need a female dorm please',
      f6: 'Female',
      f7: '13-19',
      f8: 'SHS 2',
      f9: 'Greater Accra',
    }

    const mapped = mapFormValuesToCampRegistrationInput(
      fields,
      values,
      'year123' as Id<'camp_years'>,
      0
    )

    expect(mapped.whatsapp).toBeTruthy()
    expect(mapped.camp_location).toBe('Coming from Tema')
    expect(mapped.registration_notes).toBe('Need a female dorm please')
    expect(mapped.first_name).toBe('Ama')
  })

  test('buildCampFormPrefillMap prefers explicit prefill_key', () => {
    const map = buildCampFormPrefillMap(
      [{ _id: 'x', label: 'Location', prefill_key: 'camp_location' }],
      { x: 'Accra campus hostel' }
    )
    expect(map.get('camp_location')).toBe('Accra campus hostel')
  })
})
