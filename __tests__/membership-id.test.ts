import {
  normalizeMembershipId,
  isValidMembershipId,
  formatMembershipIdForDisplay,
  generateMembershipId,
  membershipIdsEqual,
} from '../lib/membershipId'

describe('Membership ID Utils', () => {
  describe('normalizeMembershipId', () => {
    it('should normalize membership IDs correctly', () => {
      expect(normalizeMembershipId('CG-1234-2021')).toBe('CG12342021')
      expect(normalizeMembershipId('cg-1234-2021')).toBe('CG12342021')
      expect(normalizeMembershipId('CG 1234 2021')).toBe('CG12342021')
      expect(normalizeMembershipId('CG.1234.2021')).toBe('CG12342021')
      expect(normalizeMembershipId('CG12342021')).toBe('CG12342021')
    })

    it('should handle empty strings', () => {
      expect(normalizeMembershipId('')).toBe('')
      expect(normalizeMembershipId('   ')).toBe('')
    })
  })

  describe('isValidMembershipId', () => {
    it('should validate correct membership IDs', () => {
      expect(isValidMembershipId('CG12342021')).toBe(true)
      expect(isValidMembershipId('CG00012024')).toBe(true)
      expect(isValidMembershipId('CG99992020')).toBe(true)
    })

    it('should reject invalid membership IDs', () => {
      expect(isValidMembershipId('CG1234')).toBe(false)
      expect(isValidMembershipId('CG1234202')).toBe(false)
      expect(isValidMembershipId('CG123420211')).toBe(false)
      expect(isValidMembershipId('AB12342021')).toBe(false)
      expect(isValidMembershipId('cg12342021')).toBe(true)
      expect(isValidMembershipId('1234567890')).toBe(false)
    })
  })

  describe('formatMembershipIdForDisplay', () => {
    it('should format membership IDs for display', () => {
      expect(formatMembershipIdForDisplay('CG12342021')).toBe('CG-1234-2021')
      expect(formatMembershipIdForDisplay('CG00012024')).toBe('CG-0001-2024')
    })

    it('should handle invalid IDs', () => {
      expect(formatMembershipIdForDisplay('invalid')).toBe('invalid')
      expect(formatMembershipIdForDisplay('CG1234')).toBe('CG1234')
    })
  })

  describe('generateMembershipId', () => {
    it('should generate membership IDs with phone', () => {
      const id = generateMembershipId('+233241234567', 2021)
      expect(id).toMatch(/^CG-\d{4}-2021$/)
    })

    it('should generate membership IDs without phone', () => {
      const id = generateMembershipId(undefined, 2021)
      expect(id).toMatch(/^CG-\d{4}-2021$/)
    })

    it('should use current year by default', () => {
      const currentYear = new Date().getFullYear()
      const id = generateMembershipId()
      expect(id).toMatch(new RegExp(`^CG-\\d{4}-${currentYear}$`))
    })
  })

  describe('membershipIdsEqual', () => {
    it('should compare membership IDs correctly', () => {
      expect(membershipIdsEqual('CG-1234-2021', 'CG12342021')).toBe(true)
      expect(membershipIdsEqual('CG-1234-2021', 'CG-1234-2021')).toBe(true)
      expect(membershipIdsEqual('CG12342021', 'CG12342021')).toBe(true)
      expect(membershipIdsEqual('CG-1234-2021', 'CG-5678-2021')).toBe(false)
    })
  })
})
