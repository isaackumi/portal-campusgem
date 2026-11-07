import { describe, expect, it } from 'vitest'
import { buildSessionInviteSms, sessionLink } from './invite'

describe('session invite', () => {
  it('links to the session page, whatever the origin looks like', () => {
    expect(sessionLink('https://gem.example/')).toBe('https://gem.example/admin/camp-meeting/calls/session')
  })

  it('greets by first name and signs with the starter', () => {
    const text = buildSessionInviteSms({ name: 'Ama Mensah', starter: 'Kofi Boateng', link: 'https://gem.example/x' })
    expect(text).toBe('Hi Ama, the camp calls have started. Join on your phone (sign in first): https://gem.example/x Kofi')
    expect(text.length).toBeLessThan(160)
  })

  it('reads well without names', () => {
    expect(buildSessionInviteSms({ link: 'L' })).toBe('The camp calls have started. Join on your phone (sign in first): L')
  })
})
