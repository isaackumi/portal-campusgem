import { config } from 'dotenv'
import path from 'path'
import { spawnSync } from 'node:child_process'

config({ path: path.join(process.cwd(), '.env.local') })

function main() {
  const yearArg = process.argv[2]
  if (!yearArg) {
    console.error('Usage: bun scripts/delete-camp-year.ts <year>')
    console.error('Example: bun scripts/delete-camp-year.ts 2020')
    process.exit(1)
  }

  const calendarYear = Number(yearArg)
  if (!Number.isFinite(calendarYear) || calendarYear < 2000) {
    console.error('Provide a valid camp year number, e.g. 2020')
    process.exit(1)
  }

  const secret = process.env.CAMP_CONVEX_SERVER_SECRET
  if (!secret) {
    console.error('Set CAMP_CONVEX_SERVER_SECRET in .env.local (and in Convex env).')
    process.exit(1)
  }

  console.log(
    `Deleting camp year ${calendarYear} and all registrations, interactions, activities, communications, and linked forms…`
  )

  const args = JSON.stringify({
    secret,
    calendarYear,
    confirmYear: calendarYear,
  })

  const result = spawnSync(
    'bunx',
    ['convex', 'run', '--push', 'camp:deleteCampYearWithSecret', args],
    { stdio: 'inherit', env: process.env, cwd: process.cwd() }
  )

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  console.log(`Camp year ${calendarYear} deleted.`)
}

try {
  main()
} catch (error) {
  console.error(error)
  process.exit(1)
}
