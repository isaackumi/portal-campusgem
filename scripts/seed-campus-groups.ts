/**
 * Create default campus fellowship and activity groups in Convex (idempotent by name).
 * Run: bunx tsx scripts/seed-campus-groups.ts
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

import { ACTIVITY_NAME_SUGGESTIONS, CAMPUS_NAME_SUGGESTIONS } from '../lib/constants/groups'

async function main() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.CAMP_CONVEX_SERVER_SECRET) {
    console.error('Set NEXT_PUBLIC_CONVEX_URL and CAMP_CONVEX_SERVER_SECRET in .env.local')
    process.exit(1)
  }

  const { fetchGroupsFromConvex, createGroupInConvex } = await import('../lib/convex/core-bridge')
  const existing = await fetchGroupsFromConvex(true)
  const names = new Set(existing.map((g) => g.name.trim().toLowerCase()))

  let created = 0
  let skipped = 0

  for (const name of CAMPUS_NAME_SUGGESTIONS) {
    if (names.has(name.toLowerCase())) {
      skipped += 1
      continue
    }
    await createGroupInConvex({
      name,
      group_type: 'campus',
      description: 'Campus fellowship chapter',
      is_active: true,
    })
    names.add(name.toLowerCase())
    created += 1
    console.log(`  + campus: ${name}`)
  }

  for (const name of ACTIVITY_NAME_SUGGESTIONS) {
    if (names.has(name.toLowerCase())) {
      skipped += 1
      continue
    }
    await createGroupInConvex({
      name,
      group_type: 'activity',
      description: 'Church-wide activity or event',
      is_active: true,
    })
    names.add(name.toLowerCase())
    created += 1
    console.log(`  + activity: ${name}`)
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped} (already existed).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
