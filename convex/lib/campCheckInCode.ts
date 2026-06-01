import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

/** Crockford-style alphabet (no 0/O, 1/I/L). */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export function generateCampCheckInCode(campYear: number): string {
  const yy = String(campYear).slice(-2)
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return `GEM-${yy}-${suffix}`
}

export function normalizeCampCheckInCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

export function isCampCheckInCodeFormat(raw: string): boolean {
  return /^GEM-\d{2}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/i.test(normalizeCampCheckInCode(raw))
}

export async function allocateCampCheckInCode(
  ctx: Pick<MutationCtx, 'db'>,
  campYearId: string,
  campYear: number
): Promise<string> {
  for (let attempt = 0; attempt < 24; attempt++) {
    const code = generateCampCheckInCode(campYear)
    const existing = await ctx.db
      .query('camp_registrations')
      .withIndex('by_camp_year_check_in_code', (q) =>
        q.eq('camp_year_id', campYearId).eq('check_in_code', code)
      )
      .first()
    if (!existing) return code
  }
  throw new Error('Could not generate a unique camp check-in code. Please try again.')
}

export async function findRegistrationByCheckInCode(
  ctx: Pick<QueryCtx, 'db'>,
  campYearId: string,
  rawCode: string
) {
  const code = normalizeCampCheckInCode(rawCode)
  if (!isCampCheckInCodeFormat(code)) return null
  return await ctx.db
    .query('camp_registrations')
    .withIndex('by_camp_year_check_in_code', (q) =>
      q.eq('camp_year_id', campYearId).eq('check_in_code', code)
    )
    .first()
}
