import { describe, expect, test } from 'bun:test'
import { normalizeCampRegistrationEmail } from '../../convex/lib/campRegistrationDuplicate'

describe('camp registration duplicate helpers', () => {
  test('normalizes email for duplicate matching', () => {
    expect(normalizeCampRegistrationEmail('  Foo@Bar.COM ')).toBe('foo@bar.com')
    expect(normalizeCampRegistrationEmail(undefined)).toBe('')
  })
})
