/**
 * Create (or refresh) a QA login in the DEV Convex deployment for browser testing.
 *
 *   bun scripts/create-test-user.ts            # admin
 *   TEST_USER_ROLE=member bun scripts/create-test-user.ts
 *
 * Sign in at /auth with the phone below. Safe to re-run: the bootstrap mutation
 * updates the existing user instead of creating a duplicate. Refuses to run
 * against a production deployment.
 */
import { config } from 'dotenv'
import path from 'path'
import { randomUUID } from 'crypto'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'
import { generateMembershipId, normalizeMembershipId } from '../lib/membershipId'

config({ path: path.join(process.cwd(), '.env.local') })

/** Fake number reserved for QA; not a real person's line. */
export const TEST_USER_PHONE = process.env.TEST_USER_PHONE ?? '0209990001'
const TEST_USER_NAME = process.env.TEST_USER_NAME ?? 'QA Tester'
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL ?? 'qa.tester@campusgem.test'
const TEST_USER_ROLE = (process.env.TEST_USER_ROLE ?? 'admin') as
  | 'admin'
  | 'pastor'
  | 'elder'
  | 'finance_officer'
  | 'member'
  | 'visitor'

async function main() {
  const deployment = process.env.CONVEX_DEPLOYMENT ?? ''
  if (!deployment.startsWith('dev:')) {
    throw new Error('CONVEX_DEPLOYMENT is not a dev deployment; refusing to create a test user.')
  }
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  const secret = process.env.CAMP_CONVEX_SERVER_SECRET
  if (!url || !secret) throw new Error('Set NEXT_PUBLIC_CONVEX_URL and CAMP_CONVEX_SERVER_SECRET in .env.local.')

  const joinYear = new Date().getFullYear()
  const client = new ConvexHttpClient(url)
  const user = await client.mutation(api.core.bootstrapUserWithSecret, {
    secret,
    full_name: TEST_USER_NAME,
    first_name: TEST_USER_NAME.split(' ')[0],
    last_name: TEST_USER_NAME.split(' ').slice(1).join(' ') || undefined,
    phone: TEST_USER_PHONE,
    email: TEST_USER_EMAIL,
    role: TEST_USER_ROLE,
    membership_id: normalizeMembershipId(generateMembershipId(TEST_USER_PHONE, joinYear)),
    auth_uid: `cgms-qa-${randomUUID()}`,
    join_year: joinYear,
  })

  console.log(`Test user ready (${TEST_USER_ROLE}): ${user?.full_name ?? TEST_USER_NAME}, membership ID ${user?.membership_id}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
