import { config } from 'dotenv'
import path from 'path'
import { randomUUID } from 'crypto'
import { spawnSync } from 'node:child_process'
import { generateMembershipId, normalizeMembershipId } from '../lib/membershipId'

config({ path: path.join(process.cwd(), '.env.local') })

function main() {
  const phone = process.env.BOOTSTRAP_ADMIN_PHONE ?? '0548769251'
  const fullName = process.env.BOOTSTRAP_ADMIN_NAME ?? 'Isaac Kumi'
  const role = process.env.BOOTSTRAP_ADMIN_ROLE ?? 'admin'
  const joinYear = Number(process.env.BOOTSTRAP_ADMIN_JOIN_YEAR ?? new Date().getFullYear())
  const membershipId = normalizeMembershipId(
    process.env.BOOTSTRAP_ADMIN_MEMBERSHIP_ID ?? generateMembershipId(phone, joinYear)
  )
  const authUid = process.env.BOOTSTRAP_ADMIN_AUTH_UID ?? `cgms-${randomUUID()}`
  const secret = process.env.CAMP_CONVEX_SERVER_SECRET
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim()

  if (!secret) {
    console.error('Set CAMP_CONVEX_SERVER_SECRET in .env.local (and in Convex env).')
    process.exit(1)
  }
  if (!email) {
    console.error('Set BOOTSTRAP_ADMIN_EMAIL in .env.local.')
    process.exit(1)
  }

  const [firstName, ...rest] = fullName.trim().split(/\s+/)
  const args = JSON.stringify({
    secret,
    full_name: fullName,
    first_name: firstName,
    last_name: rest.join(' ') || undefined,
    phone,
    role,
    email,
    membership_id: membershipId,
    auth_uid: authUid,
  })

  const result = spawnSync(
    'bunx',
    ['convex', 'run', '--push', 'core:bootstrapUserWithSecret', args],
    { stdio: 'inherit', env: process.env, cwd: process.cwd() }
  )

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  console.log('Admin user ready for login:')
  console.log(`  Name: ${fullName}`)
  console.log(`  Phone: ${phone} (also try +233${phone.replace(/^0/, '')})`)
  console.log(`  Membership ID: ${membershipId}`)
  console.log(`  Role: ${role}`)
}

try {
  main()
} catch (error) {
  console.error(error)
  process.exit(1)
}
