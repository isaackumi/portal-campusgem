import { describe, expect, it } from 'vitest'
import {
  confirmLinkUrl,
  firstNameOf,
  generateConfirmToken,
  isConfirmTokenFormat,
  isSelfReported,
  sampleConfirmLinkUrl,
  selfReportInteractionNote,
} from './confirm-link'
import { smsSegmentInfo as smsSegments } from '@/lib/comms/sms-segments'
import { CONFIRM_ATTENDANCE_SMS } from './call-campaign'
import { personalizeCampMessage } from './sms-templates'

describe('confirm tokens', () => {
  it('are 22 URL-safe characters (128 bits) and unique', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 500; i++) {
      const t = generateConfirmToken()
      expect(t).toMatch(/^[A-Za-z0-9_-]{22}$/)
      seen.add(t)
    }
    expect(seen.size).toBe(500)
  })

  it('encodes all 16 bytes', () => {
    const t = generateConfirmToken((b) => b.fill(255))
    expect(t).toBe('_____________________w')
  })

  it('rejects junk before it reaches the database', () => {
    expect(isConfirmTokenFormat(generateConfirmToken())).toBe(true)
    expect(isConfirmTokenFormat('short')).toBe(false)
    expect(isConfirmTokenFormat('a'.repeat(22) + '/')).toBe(false)
    expect(isConfirmTokenFormat('../../etc/passwd/xxxxxxxx')).toBe(false)
    expect(isConfirmTokenFormat(undefined)).toBe(false)
  })

  it('builds links from the site origin', () => {
    expect(confirmLinkUrl('https://x.org/', 'abc')).toBe('https://x.org/c/abc')
    expect(sampleConfirmLinkUrl('https://x.org')).toHaveLength('https://x.org/c/'.length + 22)
  })
})

describe('self-reported answers', () => {
  it('are marked by updated_by = self', () => {
    expect(isSelfReported({ confirmation_updated_by: 'self' })).toBe(true)
    expect(isSelfReported({ confirmation_updated_by: 'user_1' })).toBe(false)
  })

  it('note reads "Confirmed via link"', () => {
    expect(selfReportInteractionNote('Confirmed')).toBe('Confirmed via link')
    expect(selfReportInteractionNote('Not coming', ' travelling ')).toBe('Not coming via link — travelling')
  })

  it('first name falls back to full name', () => {
    expect(firstNameOf({ first_name: 'Kofi', full_name: 'Kofi Asante' })).toBe('Kofi')
    expect(firstNameOf({ full_name: 'Ama Serwaa Boateng' })).toBe('Ama')
  })
})

describe('CONFIRM_ATTENDANCE_SMS', () => {
  it('carries the personal link and fits one SMS', () => {
    const link = confirmLinkUrl('https://portal.campusgem.org', generateConfirmToken())
    const text = personalizeCampMessage(CONFIRM_ATTENDANCE_SMS, {
      firstName: 'Abena',
      fullName: 'Abena Owusu',
      campYear: 2026,
      confirmLink: link,
    })
    expect(text).toContain(link)
    expect(text).not.toMatch(/reply/i)
    expect(smsSegments(text)).toMatchObject({ encoding: 'GSM-7', segments: 1 })
  })
})
