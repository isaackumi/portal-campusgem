import { describe, expect, test } from 'bun:test'
import { signOutreachRef, verifyOutreachRef } from '@/lib/outreach/ref'
import { validateOutreachAnswers } from '@/lib/outreach/validate'
import {
  applyOutcome,
  canSeeContact,
  canWorkContact,
  filterContacts,
  matchesSearch,
  openFollowUps,
  outreachSunday,
  shareOutEvenly,
  shortDay,
  sortContacts,
  summarizeDay,
  whatsAppOpener,
} from '@/lib/outreach/logic'
import { csvCell, outreachCsv } from '@/lib/outreach/csv'
import { hallSuggestions } from '@/lib/outreach/options'
import type { OutreachContact } from '@/lib/outreach/types'

const SECRET = 'test-secret-for-outreach'
const USER = 'k17abcdefghijklmnop'
const CAMPUS = 'j97campusidentifier'

function contact(over: Partial<OutreachContact> = {}): OutreachContact {
  return {
    id: over.id ?? 'c1',
    campus_id: CAMPUS,
    full_name: 'Ama Serwaa',
    phone: '+233241234567',
    met_on: '2026-11-01',
    source: 'member',
    status: 'new',
    created_at: 1,
    updated_at: 1,
    ...over,
  }
}

describe('outreach ref', () => {
  test('round-trips and is not the bare user id', () => {
    const ref = signOutreachRef(USER, CAMPUS, SECRET)
    expect(ref.startsWith(`${USER}.`)).toBe(true)
    expect(ref.length).toBe(USER.length + 17)
    expect(verifyOutreachRef(ref, CAMPUS, SECRET)).toBe(USER)
  })
  test('rejects tampering, other campuses, other secrets and junk', () => {
    const ref = signOutreachRef(USER, CAMPUS, SECRET)
    const other = 'k17zzzzzzzzzzzzzzzz'
    expect(verifyOutreachRef(`${other}.${ref.split('.')[1]}`, CAMPUS, SECRET)).toBeNull()
    expect(verifyOutreachRef(ref, 'j97anothercampusxx', SECRET)).toBeNull()
    expect(verifyOutreachRef(ref, CAMPUS, 'another-secret')).toBeNull()
    expect(verifyOutreachRef(USER, CAMPUS, SECRET)).toBeNull()
    expect(verifyOutreachRef('CG0001', CAMPUS, SECRET)).toBeNull()
    expect(verifyOutreachRef(undefined, CAMPUS, SECRET)).toBeNull()
    expect(verifyOutreachRef(ref, CAMPUS, '')).toBeNull()
  })
})

describe('validateOutreachAnswers', () => {
  test('cleans, normalises and drops a WhatsApp equal to the call number', () => {
    const r = validateOutreachAnswers({
      full_name: '  Kofi   Mensah ',
      phone: '024 123 4567',
      whatsapp: '+233241234567',
      level: '200',
      residence: 'hall',
      hall: 'Legon Hall',
      room: 'B12',
      area: 'Madina',
      ministry_interests: ['Prayer', 'Prayer', 'Hacking', 'Other'],
      ministry_other: 'Sound',
      bible_study: 'yes',
      prayer_request: 'For my exams\n\n\n\nand family',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data).toMatchObject({
      full_name: 'Kofi Mensah',
      phone: '+233241234567',
      level: '200',
      hall: 'Legon Hall',
      room: 'B12',
      ministry_interests: ['Prayer', 'Other'],
      ministry_other: 'Sound',
      bible_study: 'yes',
      prayer_request: 'For my exams\n\nand family',
    })
    expect(r.data.whatsapp).toBeUndefined()
    expect(r.data.area).toBeUndefined()
  })
  test('field errors for name, phone, WhatsApp and level', () => {
    const r = validateOutreachAnswers({ full_name: ' ', phone: '12', whatsapp: 'abc', level: '900' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(Object.keys(r.errors).sort()).toEqual(['full_name', 'level', 'phone', 'whatsapp'])
  })
  test('non-resident keeps the area, not the hall', () => {
    const r = validateOutreachAnswers({ full_name: 'Esi', phone: '0551234567', residence: 'non_resident', hall: 'X', area: 'East Legon' })
    expect(r.ok && r.data.area === 'East Legon' && r.data.hall === undefined).toBe(true)
  })
})

describe('dates', () => {
  test('outreach Sunday is that Sunday, or the one before', () => {
    expect(outreachSunday('2026-11-08')).toBe('2026-11-08')
    expect(outreachSunday('2026-11-07')).toBe('2026-11-01')
    expect(outreachSunday('2026-11-09')).toBe('2026-11-08')
    expect(shortDay('2026-11-09')).toBe('Mon 9 Nov')
  })
})

describe('access', () => {
  const c = contact({ met_by_user_id: 'u1', assigned_to: 'u2' })
  test('members see and work only their own; viewers see all; managers do all', () => {
    expect(canSeeContact('member', 'u1', c)).toBe(true)
    expect(canSeeContact('member', 'u2', c)).toBe(true)
    expect(canSeeContact('member', 'u3', c)).toBe(false)
    expect(canSeeContact('view', 'u3', c)).toBe(true)
    expect(canWorkContact('view', 'u3', c)).toBe(false)
    expect(canWorkContact('manage', 'u3', c)).toBe(true)
    expect(canWorkContact('member', null, c)).toBe(false)
  })
})

describe('filters and sorting', () => {
  const list = [
    contact({ id: 'a', full_name: 'Ama', met_on: '2026-11-01', met_by_user_id: 'me', hall: 'Volta Hall' }),
    contact({ id: 'b', full_name: 'Kojo', met_on: '2026-10-25', assigned_to: 'me', phone: '+233551112222', bible_study: 'yes' }),
    contact({ id: 'c', full_name: 'Yaw', met_on: '2026-10-18', assigned_to: 'me', last_contact_at: 5, status: 'contacted' }),
    contact({ id: 'd', full_name: 'Efua', met_on: '2026-10-11', assigned_to: 'me', status: 'joined' }),
    contact({ id: 'e', full_name: 'Abena', met_on: '2026-11-01', programme: 'BSc Nursing', student_id: '10987654' }),
  ]
  const ctx = { userId: 'me', todayIso: '2026-11-07' }
  test('tabs', () => {
    expect(filterContacts(list, { tab: 'mine' }, { ...ctx, access: 'member' }).map((c) => c.id)).toEqual(['b', 'c', 'd'])
    expect(filterContacts(list, { tab: 'met' }, { ...ctx, access: 'member' }).map((c) => c.id)).toEqual(['a'])
    // A member asking for "all" still only gets their own.
    expect(filterContacts(list, { tab: 'all' }, { ...ctx, access: 'member' }).map((c) => c.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(filterContacts(list, { tab: 'all' }, { ...ctx, access: 'manage' })).toHaveLength(5)
  })
  test('chips', () => {
    const all = { ...ctx, access: 'manage' as const }
    expect(filterContacts(list, { tab: 'all', metOn: 'sunday' }, all).map((c) => c.id)).toEqual(['a', 'e'])
    expect(filterContacts(list, { tab: 'all', unassigned: true }, all).map((c) => c.id)).toEqual(['a', 'e'])
    expect(filterContacts(list, { tab: 'all', bibleStudy: true }, all).map((c) => c.id)).toEqual(['b'])
    expect(filterContacts(list, { tab: 'all', status: 'joined' }, all).map((c) => c.id)).toEqual(['d'])
  })
  test('search by name, hall, programme, student id and phone digits', () => {
    expect(matchesSearch(list[0], 'volta')).toBe(true)
    expect(matchesSearch(list[4], 'nursing')).toBe(true)
    expect(matchesSearch(list[4], '10987654')).toBe(true)
    expect(matchesSearch(list[1], '0551112222')).toBe(true)
    expect(matchesSearch(list[1], '233 55 111')).toBe(true)
    expect(matchesSearch(list[1], '0241')).toBe(false)
  })
  test('my follow-ups: never contacted first (oldest first), closed last', () => {
    const extra = contact({ id: 'f', met_on: '2026-10-04', assigned_to: 'me' })
    expect(sortContacts([...list.slice(1, 4), extra], 'mine').map((c) => c.id)).toEqual(['f', 'b', 'c', 'd'])
    expect(sortContacts(list, 'all')[0].met_on).toBe('2026-11-01')
    expect(openFollowUps(list, 'me')).toBe(2)
  })
  test('day summary', () => {
    expect(summarizeDay(list, '2026-11-01')).toEqual({ day: '2026-11-01', met: 2, bibleStudy: 0, unassigned: 2 })
  })
})

describe('applyOutcome', () => {
  test('statuses and attempts', () => {
    expect(applyOutcome({ status: 'new', attempts: 0 }, 'reached', 9)).toEqual({ attempts: 1, last_contact_at: 9, last_outcome: 'reached', status: 'contacted' })
    expect(applyOutcome({ status: 'bible_study', attempts: 2 }, 'reached', 9).status).toBeUndefined()
    expect(applyOutcome({ status: 'new' }, 'no_answer', 9)).toEqual({ attempts: 1, last_contact_at: 9, last_outcome: 'no_answer' })
    expect(applyOutcome({ status: 'contacted' }, 'wants_bible_study', 9)).toMatchObject({ status: 'bible_study', bible_study: 'yes' })
    expect(applyOutcome({ status: 'new' }, 'not_interested', 9).status).toBe('not_interested')
    expect(applyOutcome({ status: 'new' }, 'joined', 9).status).toBe('joined')
  })
})

describe('shareOutEvenly', () => {
  test('round-robin from the least loaded', () => {
    const plan = shareOutEvenly(['1', '2', '3', '4', '5'], ['a', 'b'], { a: 2 })
    const counts = Object.values(plan).reduce<Record<string, number>>((acc, u) => ({ ...acc, [u]: (acc[u] ?? 0) + 1 }), {})
    expect(counts).toEqual({ a: 2, b: 3 }) // totals 4 and 3
    expect(shareOutEvenly(['1', '2', '3'], ['a', 'b', 'c'])).toEqual({ 1: 'a', 2: 'b', 3: 'c' })
    expect(shareOutEvenly(['1'], [])).toEqual({})
  })
})

describe('whatsAppOpener', () => {
  test('friendly opener from the member, naming the hall', () => {
    const text = whatsAppOpener({
      contact: contact({ full_name: 'Ama Serwaa', residence: 'hall', hall: 'Legon Hall', met_on: '2026-11-01' }),
      senderName: 'Kofi Boateng',
      campusLabel: 'UG',
      todayIso: '2026-11-03',
    })
    expect(text.startsWith("Hi Ama, it's Kofi from Campus GEM (UG). It was lovely meeting you at Legon Hall on Sunday.")).toBe(true)
  })
})

describe('csv and options', () => {
  test('quotes and defuses formulas', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    const csv = outreachCsv([contact({ prayer_request: 'Line 1\nLine 2' })])
    expect(csv.split('\r\n')[0].startsWith('Name,Phone,WhatsApp')).toBe(true)
    expect(csv).toContain('0241234567')
    expect(csv).toContain('"Line 1\nLine 2"')
  })
  test('UG hall suggestions only for UG', () => {
    expect(hallSuggestions('ug').length).toBeGreaterThan(10)
    expect(hallSuggestions('UEW')).toEqual([])
  })
})
