import { describe, expect, test } from 'bun:test'
import {
  callOutcomeError,
  canChangeRegistrationStatus,
  checkInError,
  followUpStatusOf,
  isPaid,
  isSettledConfirmation,
  registrationStatusChangeError,
} from '@/convex/lib/states/campRegistration'

describe('registration status', () => {
  test('allowed moves', () => {
    expect(canChangeRegistrationStatus('registered', 'checked_in')).toBe(true)
    expect(canChangeRegistrationStatus('registered', 'cancelled')).toBe(true)
    expect(canChangeRegistrationStatus('checked_in', 'registered')).toBe(true)
    expect(canChangeRegistrationStatus('checked_in', 'cancelled')).toBe(true)
    expect(canChangeRegistrationStatus('cancelled', 'registered')).toBe(true)
    expect(canChangeRegistrationStatus('cancelled', 'cancelled')).toBe(true)
  })
  test('a cancelled registration is reinstated before check-in', () => {
    expect(canChangeRegistrationStatus('cancelled', 'checked_in')).toBe(false)
    expect(registrationStatusChangeError('cancelled', 'checked_in')).toMatch(/Reinstate/)
    expect(checkInError('cancelled')).toMatch(/Reinstate/)
    expect(checkInError('registered')).toBeNull()
    expect(checkInError('checked_in')).toBeNull()
  })
})

describe('calls', () => {
  test('only registered people can have a call answer recorded', () => {
    expect(callOutcomeError('registered')).toBeNull()
    expect(callOutcomeError('cancelled')).toMatch(/cancelled/)
    expect(callOutcomeError('checked_in')).toMatch(/checked in/)
  })
  test('settled answers', () => {
    expect(isSettledConfirmation('confirmed')).toBe(true)
    expect(isSettledConfirmation('declined')).toBe(true)
    expect(isSettledConfirmation('maybe')).toBe(false)
    expect(isSettledConfirmation(undefined)).toBe(false)
  })
})

describe('derived reads', () => {
  test('follow-up: unset means pending', () => {
    expect(followUpStatusOf({})).toBe('pending')
    expect(followUpStatusOf({ follow_up_status: 'completed' })).toBe('completed')
  })
  test('paid includes confirmed', () => {
    expect(isPaid('paid')).toBe(true)
    expect(isPaid('confirmed')).toBe(true)
    expect(isPaid('pending')).toBe(false)
    expect(isPaid(undefined)).toBe(false)
  })
})
