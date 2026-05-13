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
  // Should be CG followed by 4 digits and 4 year digits
  const regex = /^CG\d{8}$/
  return regex.test(normalized)
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
  
  // Extract parts: CG + 4 digits + 4 year digits
  const prefix = normalized.substring(0, 2) // CG
  const digits = normalized.substring(2, 6) // XXXX
  const year = normalized.substring(6, 10) // YYYY
  
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
export function generateMembershipId(phone?: string, joinYear?: number): string {
  const year = joinYear || new Date().getFullYear()
  
  let digits: string
  if (phone && phone.length >= 4) {
    // Extract last 4 digits from phone
    digits = phone.replace(/\D/g, '').slice(-4)
  } else {
    // Generate random 4 digits
    digits = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  }
  
  return `CG-${digits}-${year}`
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
  
  return {
    prefix: normalized.substring(0, 2),
    digits: normalized.substring(2, 6),
    year: normalized.substring(6, 10),
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
