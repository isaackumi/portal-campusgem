import {
  autoDetectGoogleFormColumnMapping,
  isIgnorableGoogleFormImportRow,
  mapGoogleFormImportRow,
  validateGoogleFormImportRow,
} from '@/lib/camp/google-form-import'
import { sanitizePhoneInput } from '@/lib/camp/phone'

describe('autoDetectGoogleFormColumnMapping', () => {
  it('maps camper and parent name columns separately', () => {
    const headers = [
      'First Name',
      'Last Name',
      "Parent's Name",
      "Parent's Contact Number",
      'Contact Number',
    ]

    const mapping = autoDetectGoogleFormColumnMapping(headers)

    expect(mapping['First Name']).toBe('first_name')
    expect(mapping['Last Name']).toBe('last_name')
    expect(mapping["Parent's Name"]).toBe('parent_name')
    expect(mapping["Parent's Contact Number"]).toBe('parent_contact')
    expect(mapping['Contact Number']).toBe('phone')
  })
})

describe('mapGoogleFormImportRow', () => {
  it('keeps parent name out of camper name fields', () => {
    const row = {
      'First Name': 'Ama',
      'Last Name': 'Mensah',
      "Parent's Name": 'Kofi Mensah',
      'Contact Number': '0241234567',
    }

    const mapped = mapGoogleFormImportRow(row, {
      'First Name': 'first_name',
      'Last Name': 'last_name',
      "Parent's Name": 'parent_name',
      'Contact Number': 'phone',
    })

    expect(mapped.first_name).toBe('Ama')
    expect(mapped.last_name).toBe('Mensah')
    expect(mapped.parent_name).toBe('Kofi Mensah')
    expect(mapped.full_name).toBe('Ama Mensah')
  })

  it('uses parent contact when camper phone is missing', () => {
    const mapped = mapGoogleFormImportRow(
      {
        'First Name': 'Ama',
        'Last Name': 'Mensah',
        "Parent's Contact Number": '0241234567',
      },
      {
        'First Name': 'first_name',
        'Last Name': 'last_name',
        "Parent's Contact Number": 'parent_contact',
      }
    )

    expect(mapped.phone).toBe('0241234567')
  })
})

describe('isIgnorableGoogleFormImportRow', () => {
  it('ignores timestamp-only rows', () => {
    const mapping = autoDetectGoogleFormColumnMapping(['Timestamp', 'First Name', 'Contact Number'])
    const row = {
      Timestamp: '5/11/2026 10:00:00',
      'First Name': '',
      'Contact Number': '',
    }

    expect(isIgnorableGoogleFormImportRow(row, mapping)).toBe(true)
  })
})

describe('sanitizePhoneInput', () => {
  it('restores leading zero from spreadsheet numeric phones', () => {
    expect(sanitizePhoneInput(241234567)).toBe('0241234567')
  })
})

describe('validateGoogleFormImportRow', () => {
  it('blocks rows without a name but not invalid contact fields', () => {
    const result = validateGoogleFormImportRow({
      phone: 'not-a-phone',
      email: 'bad-email',
    })

    expect(result.blocking).toContain('Name is required (first_name, last_name, or full_name)')
    expect(result.warnings).toContain('Invalid phone number format')
    expect(result.warnings).toContain('Invalid email format')
  })

  it('allows import when contact fields are invalid but name is present', () => {
    const result = validateGoogleFormImportRow({
      first_name: 'Ama',
      last_name: 'Mensah',
      phone: '123',
      email: 'not-an-email',
    })

    expect(result.blocking).toHaveLength(0)
    expect(result.warnings).toEqual(
      expect.arrayContaining(['Invalid phone number format', 'Invalid email format'])
    )
  })
})
