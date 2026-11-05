import { describe, expect, test } from 'bun:test'
import { planPastoralRun, type PastoralSnapshot } from './plan'
import type { AttendanceRowLite } from './absence'

const valid = (p?: string | null) => Boolean(p && p.replace(/\D/g, '').length >= 10)
const now = new Date(Date.UTC(2026, 10, 2, 7, 30)) // Monday 2 Nov 2026
const SUNDAYS = ['2026-09-13', '2026-09-20', '2026-09-27', '2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01']

function snapshot(): PastoralSnapshot {
  const attendance: AttendanceRowLite[] = []
  for (const d of SUNDAYS) {
    attendance.push({ member_id: 'm-leader', service_date: d, service_type: 'sunday_service' })
    attendance.push({ member_id: 'm-kofi', service_date: d, service_type: 'sunday_service' })
    if (d <= '2026-10-11') {
      attendance.push({ member_id: 'm-ama', service_date: d, service_type: 'sunday_service' })
      attendance.push({ member_id: 'm-lone', service_date: d, service_type: 'sunday_service' })
    }
  }
  return {
    members: [
      { id: 'm-leader', user_id: 'u-leader', status: 'active' },
      { id: 'm-kofi', user_id: 'u-kofi', status: 'active', dob: '1999-11-03' },
      { id: 'm-ama', user_id: 'u-ama', status: 'active' },
      { id: 'm-lone', user_id: 'u-lone', status: 'active' },
      { id: 'm-gone', user_id: 'u-gone', status: 'transferred' },
    ],
    users: [
      { id: 'u-leader', full_name: 'Grace Leader', phone: '0200000001', role: 'member' },
      { id: 'u-kofi', full_name: 'Kofi Asante', phone: '0200000002', role: 'member' },
      { id: 'u-ama', full_name: 'Ama Mensah', phone: '0244123456', role: 'member' },
      { id: 'u-lone', full_name: 'Lone Ranger', role: 'member' },
      { id: 'u-pastor', full_name: 'Pastor P', phone: '0200000009', role: 'pastor' },
      { id: 'u-gone', full_name: 'Gone', role: 'member' },
    ],
    groups: [{ id: 'g1', name: 'Youth Fellowship', leader_id: 'u-leader' }],
    memberships: [
      { group_id: 'g1', member_id: 'm-leader', role: 'leader' },
      { group_id: 'g1', member_id: 'm-kofi', role: 'member' },
      { group_id: 'g1', member_id: 'm-ama', role: 'member' },
    ],
    attendance,
    priorAlerts: {},
  }
}

const settings = { alerts_enabled: true, digest_enabled: true, weeks_threshold: 3, fallback_user_ids: [] as string[] }

describe('planPastoralRun', () => {
  test('one combined text to the leader; lone member falls back to pastors', () => {
    const plan = planPastoralRun(snapshot(), settings, { now, isValidPhone: valid })
    expect(plan.last_sunday).toBe('2026-11-01')
    expect(plan.lapsed.map((l) => l.member_id).sort()).toEqual(['m-ama', 'm-lone'])

    const leader = plan.messages.find((m) => m.user_id === 'u-leader')!
    expect(leader.text).toBe(
      "Youth Fellowship this week: 2 of 3 in church Sunday. Birthdays: Kofi (Tue). Ama Mensah hasn't been in church for 3 Sundays (last seen 11 Oct). A call from you would mean a lot. 0244123456"
    )
    expect(leader.alert_member_ids).toEqual(['m-ama'])

    const pastor = plan.messages.find((m) => m.user_id === 'u-pastor')!
    expect(pastor.fallback).toBe(true)
    expect(pastor.text).toContain('Lone Ranger')
    expect(plan.alerts.map((a) => a.member_id).sort()).toEqual(['m-ama', 'm-lone'])
  })

  test('configured fallback contacts replace pastors', () => {
    const plan = planPastoralRun(snapshot(), { ...settings, fallback_user_ids: ['u-kofi'] }, { now, isValidPhone: valid })
    expect(plan.messages.some((m) => m.user_id === 'u-pastor')).toBe(false)
    expect(plan.messages.find((m) => m.user_id === 'u-kofi')?.text).toContain('Lone Ranger')
  })

  test('already alerted: lapsed member shows under "Missing" in the digest instead', () => {
    const snap = snapshot()
    snap.priorAlerts = {
      'm-ama': { alerted_at: 1, streak: 3, last_seen: '2026-10-11' },
      'm-lone': { alerted_at: 1, streak: 3, last_seen: '2026-10-11' },
    }
    const plan = planPastoralRun(snap, settings, { now, isValidPhone: valid })
    expect(plan.alerts).toEqual([])
    expect(plan.messages.map((m) => m.user_id)).toEqual(['u-leader'])
    expect(plan.messages[0].text).toBe(
      'Youth Fellowship this week: 2 of 3 in church Sunday. Birthdays: Kofi (Tue). Missing 3+ weeks: Ama.'
    )
  })

  test('alerts off and digest off sends nothing', () => {
    const plan = planPastoralRun(snapshot(), { ...settings, alerts_enabled: false, digest_enabled: false }, { now, isValidPhone: valid })
    expect(plan.messages).toEqual([])
    expect(plan.lapsed).toHaveLength(2)
  })

  test('leader without a usable phone is reported and alert goes to fallback', () => {
    const snap = snapshot()
    snap.users = snap.users.map((u) => (u.id === 'u-leader' ? { ...u, phone: undefined } : u))
    const plan = planPastoralRun(snap, settings, { now, isValidPhone: valid })
    expect(plan.skipped.no_phone.map((s) => s.user_id)).toEqual(['u-leader'])
    expect(plan.messages.find((m) => m.user_id === 'u-pastor')?.alert_member_ids.sort()).toEqual(['m-ama', 'm-lone'])
  })
})
