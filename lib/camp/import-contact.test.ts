import {
  collectImportContactWarnings,
  importPhoneDedupeKey,
  resolveImportPhoneForStorage,
} from '@/lib/camp/import-contact'

describe('import contact helpers', () => {
  it('collects warnings without blocking invalid contact', () => {
    expect(collectImportContactWarnings('123', 'bad@')).toEqual([
      'Invalid phone number format',
      'Invalid email format',
    ])
  })

  it('stores normalized phone when valid', () => {
    expect(resolveImportPhoneForStorage('0241234567', 4)).toBe('+233241234567')
    expect(importPhoneDedupeKey('0241234567', 4)).toBe('+233241234567')
  })

  it('keeps invalid phone readable and scopes dedupe by row', () => {
    expect(resolveImportPhoneForStorage('123', 10)).toBe('123')
    expect(importPhoneDedupeKey('123', 10)).toBe('invalid-import-row-10')
    expect(importPhoneDedupeKey('123', 11)).toBe('invalid-import-row-11')
  })
})
