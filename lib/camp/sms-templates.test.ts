import { describe, expect, it } from 'bun:test'
import {
  personalizeCampMessage,
  shouldSendRegistrationConfirmationSms,
} from '@/lib/camp/sms-templates'

describe('personalizeCampMessage', () => {
  it('injects name and check-in code', () => {
    const out = personalizeCampMessage(
      'Hi {{firstName}}! Code {{checkInCode}} for Camp {{campYear}}{{themePart}}.',
      {
        firstName: 'Ama',
        lastName: 'Mensah',
        checkInCode: 'CG26-1042',
        campYear: 2026,
        theme: 'Fire Fall',
      }
    )
    expect(out).toBe('Hi Ama! Code CG26-1042 for Camp 2026 (Fire Fall).')
  })

  it('injects registration link for invites', () => {
    const out = personalizeCampMessage(
      'Hi {{firstName}}! Register: {{registrationLink}}',
      {
        firstName: 'Kojo',
        registrationLink: 'https://example.com/camp-meeting/register',
      }
    )
    expect(out).toBe('Hi Kojo! Register: https://example.com/camp-meeting/register')
  })
})

describe('shouldSendRegistrationConfirmationSms', () => {
  it('enables for 2026+', () => {
    expect(shouldSendRegistrationConfirmationSms(2026)).toBe(true)
    expect(shouldSendRegistrationConfirmationSms(2025)).toBe(false)
  })
})
