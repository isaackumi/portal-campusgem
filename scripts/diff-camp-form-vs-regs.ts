/**
 * Diff camp year registrations vs camp registration form responses.
 * Usage: bunx tsx scripts/diff-camp-form-vs-regs.ts [year]
 */
import { config } from 'dotenv'
import path from 'path'
import { ConvexHttpClient } from 'convex/browser'

config({ path: path.join(process.cwd(), '.env.local') })
import { api } from '../convex/_generated/api'

const url = process.env.NEXT_PUBLIC_CONVEX_URL
const secret = process.env.CAMP_CONVEX_SERVER_SECRET
const yearNum = Number(process.argv[2] || '2026')

if (!url || !secret) {
  console.error('Set NEXT_PUBLIC_CONVEX_URL and CAMP_CONVEX_SERVER_SECRET')
  process.exit(1)
}

function digits(phone: string | undefined | null): string {
  return String(phone ?? '').replace(/\D/g, '').slice(-9)
}

async function main() {
  const client = new ConvexHttpClient(url!)
  const years = (await client.query(api.camp.getAllCampYearsWithSecret, {
    secret: secret!,
  })) as Array<Record<string, unknown>>
  const year = years.find((y) => Number(y.year) === yearNum)
  if (!year) {
    console.error(`No camp year ${yearNum}`)
    process.exit(1)
  }
  const yearId = String(year._id)
  console.log(`Camp year ${yearNum} id=${yearId} active=${year.is_active}`)

  const regs = (await client.query(api.camp.listRegistrationsWithSecret, {
    secret: secret!,
    camp_year_id: yearId,
  })) as Array<Record<string, unknown>>

  const forms = (await client.query(api.forms.listFormsWithSecret, {
    secret: secret!,
  })) as Array<Record<string, unknown>>

  const campForms = forms.filter(
    (f) =>
      String(f.category ?? '') === 'camp_meeting_registration' &&
      String(f.camp_year_id ?? '') === yearId
  )

  console.log(`\nRegistrations: ${regs.length}`)
  console.log(
    `  by status:`,
    regs.reduce<Record<string, number>>((acc, r) => {
      const s = String(r.status ?? 'unknown')
      acc[s] = (acc[s] ?? 0) + 1
      return acc
    }, {})
  )
  console.log(`Camp registration forms linked to this year: ${campForms.length}`)

  let allResponses: Array<Record<string, unknown> & { _formTitle?: string }> = []
  for (const form of campForms) {
    const formId = String(form._id)
    const responses = (await client.query(api.forms.listFormResponsesWithSecret, {
      secret: secret!,
      form_id: formId as never,
    })) as Array<Record<string, unknown>>
    console.log(
      `  form "${form.title}" status=${form.status} response_count=${form.response_count} actual=${responses.length}`
    )
    allResponses = allResponses.concat(
      responses.map((r) => ({ ...r, _formTitle: String(form.title) }))
    )
  }

  console.log(`\nTotal form responses (all camp reg forms for year): ${allResponses.length}`)

  const regByPhone = new Map<string, Record<string, unknown>>()
  for (const reg of regs) {
    const key = digits(String(reg.phone ?? ''))
    if (key.length >= 9) regByPhone.set(key, reg)
  }

  const respByPhone = new Map<string, Record<string, unknown>>()
  for (const resp of allResponses) {
    const key = digits(String(resp.respondent_phone ?? ''))
    if (key.length >= 9) respByPhone.set(key, resp)
  }

  const regsWithoutResponse = regs.filter((reg) => {
    const key = digits(String(reg.phone ?? ''))
    return !key || !respByPhone.has(key)
  })

  const responsesWithoutReg = allResponses.filter((resp) => {
    const key = digits(String(resp.respondent_phone ?? ''))
    return !key || !regByPhone.has(key)
  })

  console.log(`\nRegistrations with NO matching form response (${regsWithoutResponse.length}):`)
  for (const reg of regsWithoutResponse) {
    console.log(
      `  - ${reg.full_name || `${reg.first_name} ${reg.last_name}`} | phone=${reg.phone} | status=${reg.status} | import_warnings=${JSON.stringify(reg.import_warnings ?? null)} | created=${reg._creationTime ? new Date(Number(reg._creationTime)).toISOString() : '?'}`
    )
  }

  console.log(`\nForm responses with NO matching registration (${responsesWithoutReg.length}):`)
  for (const resp of responsesWithoutReg) {
    console.log(
      `  - ${resp.respondent_name || '(no name)'} | phone=${resp.respondent_phone} | form=${resp._formTitle} | submitted=${resp.submitted_at ? new Date(Number(resp.submitted_at)).toISOString() : '?'}`
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
