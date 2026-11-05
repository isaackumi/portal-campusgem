import { describe, expect, it } from 'bun:test'
import { csvCell, textCell, toCsv } from '@/lib/csv'
import { groupMembersToCsv, groupsSummaryToCsv, groupExportFilename } from '@/lib/groups/export'
import { smsSegmentInfo } from '@/lib/comms/sms-segments'
import type { GroupMembership } from '@/lib/types'

function membership(
  id: string,
  role: GroupMembership['role'],
  user: { full_name: string; membership_id?: string; phone?: string; email?: string }
): GroupMembership {
  return {
    id,
    group_id: 'g1',
    member_id: `m-${id}`,
    role,
    joined_date: '2026-03-04T10:00:00.000Z',
    is_active: true,
    created_at: '2026-03-04T10:00:00.000Z',
    member: { id: `m-${id}`, user_id: `u-${id}`, user } as unknown as GroupMembership['member'],
  }
}

describe('csvCell', () => {
  it('keeps phone numbers as text so spreadsheets keep the leading zero', () => {
    expect(csvCell(textCell('0244123456'))).toBe('"=""0244123456"""')
    expect(csvCell(textCell('+233 24 412 3456'))).toBe('"=""+233 24 412 3456"""')
    expect(csvCell(textCell(''))).toBe('')
    expect(csvCell(textCell(undefined))).toBe('')
  })

  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('Doe, Jane')).toBe('"Doe, Jane"')
    expect(csvCell('Say "hi"')).toBe('"Say ""hi"""')
    expect(csvCell('a\nb')).toBe('"a\nb"')
  })

  it('neutralises formula injection, including in text cells that are not digits', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('-1+2')).toBe("'-1+2")
    expect(csvCell(textCell('=1+1'))).toBe("'=1+1")
    expect(csvCell(textCell('CG-0012'))).toBe('CG-0012')
  })

  it('formats numbers, booleans and blanks', () => {
    expect(csvCell(12)).toBe('12')
    expect(csvCell(true)).toBe('Yes')
    expect(csvCell(null)).toBe('')
    expect(toCsv(['A', 'B'], [[1, 'x']])).toBe('A,B\r\n1,x')
  })
})

describe('groupMembersToCsv', () => {
  it('lists leaders first, then members by name, with role labels and joined date', () => {
    const csv = groupMembersToCsv([
      membership('1', 'member', { full_name: 'Zed Owusu', membership_id: '00123', phone: '0244000001' }),
      membership('2', 'leader', { full_name: 'Ama Mensah', membership_id: 'CG-1', phone: '0244000002' }),
      membership('3', 'member', { full_name: 'Abena Boateng' }),
    ])
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Name,Membership ID,Role in group,Phone,WhatsApp,Email,Joined')
    expect(lines[1]).toBe('Ama Mensah,CG-1,Leader,"=""0244000002""",,,2026-03-04')
    expect(lines[2]).toBe('Abena Boateng,,Member,,,,2026-03-04')
    expect(lines[3]).toBe('Zed Owusu,"=""00123""",Member,"=""0244000001""",,,2026-03-04')
  })
})

describe('groupsSummaryToCsv', () => {
  it('writes one row per group with leader and member count', () => {
    const csv = groupsSummaryToCsv([
      {
        name: 'Choir',
        group_type: 'ministry',
        is_active: true,
        leader_name: 'Ama Mensah',
        leader_phone: '0244000002',
        member_count: 12,
        meeting_schedule: 'Thursdays, 6pm',
        created_at: '2025-01-02T00:00:00.000Z',
      },
    ])
    expect(csv.split('\r\n')[1]).toBe(
      'Choir,Ministry,Active,Ama Mensah,"=""0244000002""",,12,,"Thursdays, 6pm",,,2025-01-02'
    )
  })

  it('builds a safe filename', () => {
    expect(groupExportFilename('Youth / Ministry!', new Date('2026-11-05T12:00:00Z'))).toBe(
      'youth-ministry-2026-11-05.csv'
    )
  })
})

describe('smsSegmentInfo', () => {
  it('counts GSM-7 parts at 160 / 153', () => {
    expect(smsSegmentInfo('')).toMatchObject({ segments: 0 })
    expect(smsSegmentInfo('a'.repeat(160))).toMatchObject({ encoding: 'GSM-7', segments: 1, remaining: 0 })
    expect(smsSegmentInfo('a'.repeat(161))).toMatchObject({ segments: 2, remaining: 145 })
    expect(smsSegmentInfo('€'.repeat(80))).toMatchObject({ length: 160, segments: 1 })
  })

  it('switches to UCS-2 at 70 / 67 for emoji and curly quotes', () => {
    expect(smsSegmentInfo('Hello 🙏')).toMatchObject({ encoding: 'UCS-2', segments: 1 })
    expect(smsSegmentInfo('’'.repeat(71))).toMatchObject({ encoding: 'UCS-2', segments: 2 })
  })
})
