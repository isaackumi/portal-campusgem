import { describe, expect, test } from 'bun:test'
import { createWindowLimiter, joinMembershipNote, validateCampusJoin } from '@/lib/campus/join'

describe('validateCampusJoin', () => {
  test('cleans and normalises', () => {
    const r = validateCampusJoin({ full_name: '  Ama   Mensah ', phone: '024 123 4567', whatsapp: '', level: 'Level 200', hall: '<b>Casford</b>' })
    expect(r.error).toBeNull()
    expect(r.data).toMatchObject({ full_name: 'Ama Mensah', phone: '+233241234567', level: 'Level 200', hall: 'b Casford /b' })
  })
  test('rejects bad input', () => {
    expect(validateCampusJoin({ full_name: 'Ama', phone: '0241234567' }).error).toContain('name')
    expect(validateCampusJoin({ full_name: 'Ama Mensah', phone: '1234' }).error).toContain('mobile')
    expect(validateCampusJoin({ full_name: 'Ama Mensah', phone: '0241234567', level: 'Level 900' }).error).toContain('level')
    expect(validateCampusJoin(null).error).not.toBeNull()
  })
  test('membership note', () => {
    expect(joinMembershipNote({ level: 'Level 100', hall: 'Atlantic', programme: 'BEd Maths' })).toBe('Level 100 · Hall: Atlantic · BEd Maths')
    expect(joinMembershipNote({})).toBeUndefined()
  })
})

describe('createWindowLimiter', () => {
  test('limits per key and resets', () => {
    const l = createWindowLimiter({ limit: 2, windowMs: 1000 })
    expect([l.allow('a', 0), l.allow('a', 1), l.allow('a', 2), l.allow('b', 2), l.allow('a', 1001)]).toEqual([true, true, false, true, true])
  })
})
