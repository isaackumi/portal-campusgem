/**
 * Membership ID utilities for Campus Gem Ministries
 * Format: CG-XXXXYYYY where CG = Campus Gem, XXXX = 4 digits, YYYY = year joined
 */

/**
 * Normalizes a membership ID by removing all non-alphanumeric characters
 * @param raw - Raw membership ID input
 * @returns Normalized membership ID in uppercase
 */
export function normalizeMembershipId(raw: string): string {
  if (!raw) return ''
  return raw.replace(/\W+/g, '').toUpperCase()
}

/**
 * Validates if a membership ID follows the correct format
 * @param id - Membership ID to validate
 * @returns True if valid, false otherwise
 */
export function isValidMembershipId(id: string): boolean {
  const normalized = normalizeMembershipId(id)
  return /^(CG|RLC)\d{8}$/.test(normalized)
}

/**
 * Formats a membership ID for display
 * @param id - Membership ID to format
 * @returns Formatted membership ID (CG-XXXX-YYYY)
 */
export function formatMembershipIdForDisplay(id: string): string {
  const normalized = normalizeMembershipId(id)
  
  if (!isValidMembershipId(normalized)) {
    return id // Return original if invalid
  }
  
  const prefix = normalized.substring(0, normalized.startsWith('RLC') ? 3 : 2)
  const digitStart = prefix.length
  const digits = normalized.substring(digitStart, digitStart + 4)
  const year = normalized.substring(digitStart + 4, digitStart + 8)
  
  return `${prefix}-${digits}-${year}`
}

/**
 * Extracts the year from a membership ID
 * @param id - Membership ID
 * @returns Year or null if invalid
 */
export function extractYearFromMembershipId(id: string): number | null {
  const normalized = normalizeMembershipId(id)
  
  if (!isValidMembershipId(normalized)) {
    return null
  }
  
  const year = parseInt(normalized.substring(6, 10))
  return isNaN(year) ? null : year
}

/**
 * Generates a new membership ID
 * @param phone - Phone number to extract last 4 digits (optional)
 * @param joinYear - Year joined (defaults to current year)
 * @returns New membership ID
 */
export function generateMembershipId(phone?: string, joinYear?: number, prefix: 'CG' | 'RLC' = 'CG'): string {
  const year = joinYear || new Date().getFullYear()
  
  let digits: string
  if (phone && phone.length >= 4) {
    digits = phone.replace(/\D/g, '').slice(-4)
  } else {
    digits = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  }
  
  return `${prefix}-${digits}-${year}`
}

export function generateRlcMembershipId(phone?: string, joinYear?: number): string {
  return generateMembershipId(phone, joinYear, 'RLC')
}

/**
 * Parses a membership ID into its components
 * @param id - Membership ID to parse
 * @returns Object with prefix, digits, year, or null if invalid
 */
export function parseMembershipId(id: string): {
  prefix: string
  digits: string
  year: string
  full: string
} | null {
  const normalized = normalizeMembershipId(id)
  
  if (!isValidMembershipId(normalized)) {
    return null
  }

  const prefix = normalized.startsWith('RLC') ? 'RLC' : 'CG'
  const digitStart = prefix.length
  const digits = normalized.substring(digitStart, digitStart + 4)
  const year = normalized.substring(digitStart + 4, digitStart + 8)
  
  return {
    prefix,
    digits,
    year,
    full: normalized
  }
}

/**
 * Checks if two membership IDs are the same (normalized comparison)
 * @param id1 - First membership ID
 * @param id2 - Second membership ID
 * @returns True if they represent the same ID
 */
export function membershipIdsEqual(id1: string, id2: string): boolean {
  return normalizeMembershipId(id1) === normalizeMembershipId(id2)
}
