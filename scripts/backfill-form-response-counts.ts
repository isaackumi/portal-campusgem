/**
 * Sync forms.response_count from form_responses (run once after deploy).
 * Usage: bunx tsx scripts/backfill-form-response-counts.ts
 */
import { config } from 'dotenv'
import path from 'path'
import { ConvexHttpClient } from 'convex/browser'

config({ path: path.join(process.cwd(), '.env.local') })
import { api } from '../convex/_generated/api'

const url = process.env.NEXT_PUBLIC_CONVEX_URL
const secret = process.env.CAMP_CONVEX_SERVER_SECRET

if (!url || !secret) {
  console.error('Set NEXT_PUBLIC_CONVEX_URL and CAMP_CONVEX_SERVER_SECRET')
  process.exit(1)
}

async function main() {
  const client = new ConvexHttpClient(url!)
  const result = await client.mutation(api.forms.backfillFormResponseCountsWithSecret, { secret: secret! })
  console.log(`Updated ${result.updated} form(s)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
