import { describe, expect, test } from 'bun:test'
import { formHasProfileLookup } from '@/lib/forms/profile-lookup'

describe('formHasProfileLookup', () => {
  test('respects enable_profile_lookup for outreach forms', () => {
    expect(
      formHasProfileLookup({ category: 'outreach_signup', enable_profile_lookup: false })
    ).toBe(false)
    expect(
      formHasProfileLookup({ category: 'outreach_signup', enable_profile_lookup: true })
    ).toBe(true)
  })

  test('always enables lookup for camp meeting forms', () => {
    expect(
      formHasProfileLookup({ category: 'camp_meeting_registration', enable_profile_lookup: false })
    ).toBe(true)
  })
})
