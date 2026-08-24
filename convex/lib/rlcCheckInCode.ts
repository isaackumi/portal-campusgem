import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

/** Crockford-style alphabet (no 0/O, 1/I/L). */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export function generateRlcCheckInCode(year = new Date().getFullYear()): string {
  const yy = String(year).slice(-2)
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return `RLC-${yy}-${suffix}`
}

export function normalizeRlcCheckInCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

export function isRlcCheckInCodeFormat(raw: string): boolean {
  return /^RLC-\d{2}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/i.test(normalizeRlcCheckInCode(raw))
}

async function rlcCheckInCodeExists(ctx: Pick<MutationCtx, 'db'>, code: string): Promise<boolean> {
  const visitor = await ctx.db
    .query('visitors')
    .withIndex('by_check_in_code', (q) => q.eq('check_in_code', code))
    .first()
  if (visitor) return true
  const member = await ctx.db
    .query('members')
    .withIndex('by_check_in_code', (q) => q.eq('check_in_code', code))
    .first()
  return Boolean(member)
}

export async function allocateRlcCheckInCode(ctx: Pick<MutationCtx, 'db'>): Promise<string> {
  for (let attempt = 0; attempt < 24; attempt++) {
    const code = generateRlcCheckInCode()
    if (!(await rlcCheckInCodeExists(ctx, code))) return code
  }
  throw new Error('Could not generate a unique RLC check-in code.')
}

export async function sealVisitorCheckIn(
  ctx: Pick<MutationCtx, 'db'>,
  visitorId: Id<'visitors'>,
  displayName: string
): Promise<string> {
  const row = await ctx.db.get(visitorId)
  if (!row) throw new Error('Visitor not found.')
  const code = row.check_in_code?.trim() || (await allocateRlcCheckInCode(ctx))
  const qrPayload = JSON.stringify({
    id: String(visitorId),
    name: displayName,
    type: 'rlc_visitor',
    code,
    check_in_code: code,
  })
  if (row.check_in_code === code && row.qr_code === qrPayload) return code
  await ctx.db.patch(visitorId, { check_in_code: code, qr_code: qrPayload, updated_at: Date.now() })
  return code
}

export async function sealMemberCheckIn(
  ctx: Pick<MutationCtx, 'db'>,
  memberId: Id<'members'>,
  displayName: string
): Promise<string> {
  const row = await ctx.db.get(memberId)
  if (!row) throw new Error('Member not found.')
  const code = row.check_in_code?.trim() || (await allocateRlcCheckInCode(ctx))
  const qrPayload = JSON.stringify({
    id: String(memberId),
    name: displayName,
    type: 'rlc_member',
    code,
    check_in_code: code,
  })
  if (row.check_in_code === code && row.qr_code === qrPayload) return code
  await ctx.db.patch(memberId, { check_in_code: code, qr_code: qrPayload, updated_at: Date.now() })
  return code
}

export async function findVisitorByCheckInCode(
  ctx: Pick<QueryCtx, 'db'>,
  rawCode: string
) {
  const code = normalizeRlcCheckInCode(rawCode)
  if (!isRlcCheckInCodeFormat(code)) return null
  return await ctx.db
    .query('visitors')
    .withIndex('by_check_in_code', (q) => q.eq('check_in_code', code))
    .first()
}
