import { describe, expect, it } from 'vitest'
import { classifyFollowUpSla, summarizeFollowUpSla } from './follow-up-sla'

const now = new Date('2026-05-28T12:00:00Z').getTime()

describe('classifyFollowUpSla', () => {
  it('marks completed registrations as completed bucket', () => {
    expect(
      classifyFollowUpSla({ follow_up_status: 'completed', created_at: '2020-01-01' }, now)
    ).toBe('completed')
  })

  it('marks stale pending as overdue', () => {
    expect(
      classifyFollowUpSla({ follow_up_status: 'pending', created_at: '2026-05-20T12:00:00Z' }, now)
    ).toBe('overdue')
  })

  it('marks recent pending as healthy', () => {
    expect(
      classifyFollowUpSla({ follow_up_status: 'pending', created_at: '2026-05-27T12:00:00Z' }, now)
    ).toBe('healthy')
  })
})

describe('summarizeFollowUpSla', () => {
  it('counts open queue buckets', () => {
    const summary = summarizeFollowUpSla(
      [
        { follow_up_status: 'pending', created_at: '2026-05-20T12:00:00Z' },
        { follow_up_status: 'in_progress', created_at: '2026-05-25T12:00:00Z' },
        { follow_up_status: 'completed', created_at: '2026-05-20T12:00:00Z' },
      ],
      now
    )
    expect(summary.overdue).toBe(1)
    expect(summary.dueSoon).toBe(1)
    expect(summary.healthy).toBe(0)
  })
})
