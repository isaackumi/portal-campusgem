'use server'

import { guard } from '@/lib/auth/action-guard'
import { hasPermission } from '@/lib/auth/roles'
import type { ApiResponse } from '@/lib/services/api-types'
import type { HeadsUpDue, HeadsUpPerson } from '@/lib/birthdays/heads-up'

/**
 * "Birthdays in one week" for admins: name, phone and where each person belongs
 * (campus code, Campus GEM / RLC, camper), so a flyer can be prepared. Runs every morning
 * with the birthday cron; the birthday text itself still goes out on the day.
 */

export type BirthdayHeadsUpPlan = {
  date: string | null
  due: HeadsUpDue[]
  texts: string[]
  admins: Array<{ name: string; phone: string }>
}

function congregationTags(c?: string | null): string[] {
  if (c === 'rlc') return ['RLC']
  if (c === 'both') return ['Campus GEM', 'RLC']
  return ['Campus GEM']
}

async function planHeadsUp(days: number): Promise<BirthdayHeadsUpPlan> {
  const [{ fetchMembersFromConvex, fetchUsersFromConvex }, { listRlcVisitorsFromConvex }, campusBridge, campBridge] =
    await Promise.all([
      import('@/lib/convex/core-bridge'),
      import('@/lib/convex/rlc-bridge'),
      import('@/lib/convex/campus-bridge'),
      import('@/lib/convex/camp-bridge'),
    ])
  const { birthdayPartsFromDob, hasRealBirthYear } = await import('@/lib/birthdays/upcoming-birthdays')
  const { ghanaCalendarDate, nextBirthdayOn } = await import('@/lib/birthdays/sms')
  const { dueInDays, buildHeadsUpTexts } = await import('@/lib/birthdays/heads-up')
  const { isValidSmsPhone } = await import('@/lib/comms/sms-client')

  const today = ghanaCalendarDate()
  const [members, users, visitors, tagMap, campYear] = await Promise.all([
    fetchMembersFromConvex(),
    fetchUsersFromConvex(),
    listRlcVisitorsFromConvex({ include_inactive: false }).catch(() => []),
    campusBridge.campusTagMapFromConvex().catch(() => ({ campuses: [], rows: [] })),
    campBridge.fetchActiveCampYearFromConvex().catch(() => null),
  ])
  const registrations = campYear ? await campBridge.fetchRegistrationsFromConvex(campYear.id).catch(() => []) : []

  const userById = new Map(users.map((u) => [u.id, u]))
  const campusById = new Map(tagMap.campuses.map((c) => [c.id, c.short_code || c.name]))
  const campusByMember = new Map(tagMap.rows.map((r) => [r.member_id, campusById.get(r.group_id)]))

  const ageOn = (birthYear: number | undefined, month: number, day: number) => {
    if (!hasRealBirthYear(birthYear)) return null
    return nextBirthdayOn({ month, day }, today).year - (birthYear as number)
  }

  const people: HeadsUpPerson[] = []
  for (const m of members) {
    const parts = birthdayPartsFromDob(m.dob)
    if (!parts.month || !parts.day) continue
    if (m.status && /inactive|deceased|transferred/i.test(String(m.status))) continue
    const user = userById.get(m.user_id)
    if (!user || user.merged_into) continue
    const campus = campusByMember.get(m.id)
    people.push({
      name: user.full_name,
      phone: user.phone,
      birthMonth: parts.month,
      birthDay: parts.day,
      tags: [...(campus ? [campus] : []), ...congregationTags(m.congregation)],
      ageTurning: ageOn(parts.year, parts.month, parts.day),
    })
  }
  for (const v of visitors) {
    if (v.converted_to_member) continue
    const parts = birthdayPartsFromDob(v.date_of_birth)
    if (!parts.month || !parts.day) continue
    people.push({
      name: [v.first_name, v.last_name].filter(Boolean).join(' ') || 'Visitor',
      phone: v.phone,
      birthMonth: parts.month,
      birthDay: parts.day,
      tags: ['RLC visitor'],
      ageTurning: ageOn(parts.year, parts.month, parts.day),
    })
  }
  for (const r of registrations) {
    const parts = r.date_of_birth ? birthdayPartsFromDob(r.date_of_birth) : {}
    const month = parts.month ?? r.birth_month
    const day = parts.day ?? r.birth_day
    if (!month || !day) continue
    people.push({
      name: r.full_name,
      phone: r.phone,
      birthMonth: month,
      birthDay: day,
      tags: [`Camper ${campYear?.year ?? ''}`.trim()],
      ageTurning: ageOn(parts.year, month, day),
    })
  }

  const due = dueInDays(people, today, days)
  const texts = buildHeadsUpTexts(due, days)

  const extra = (process.env.BIRTHDAY_HEADS_UP_PHONES ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  const seen = new Set<string>()
  const admins: Array<{ name: string; phone: string }> = []
  for (const u of users) {
    if (u.role !== 'admin' || u.merged_into || !u.phone || !isValidSmsPhone(u.phone)) continue
    const key = u.phone.replace(/\D/g, '').slice(-9)
    if (seen.has(key)) continue
    seen.add(key)
    admins.push({ name: u.full_name, phone: u.phone })
  }
  for (const phone of extra) {
    const key = phone.replace(/\D/g, '').slice(-9)
    if (!isValidSmsPhone(phone) || seen.has(key)) continue
    seen.add(key)
    admins.push({ name: 'Birthday contact', phone })
  }

  return { date: due[0]?.date ?? null, due, texts, admins }
}

async function sendPlan(plan: BirthdayHeadsUpPlan, senderId: string) {
  if (!plan.texts.length || !plan.admins.length) return { sent: 0, failed: 0 }
  const { sendCommunications } = await import('@/lib/comms/send')
  let sent = 0
  let failed = 0
  for (let i = 0; i < plan.texts.length; i++) {
    const text = plan.texts[i]!
    const result = await sendCommunications({
      module: 'church',
      channel: 'sms',
      audience_type: plan.admins.length > 1 ? 'bulk' : 'individual',
      sender_id: senderId,
      message_body: text,
      recipients: plan.admins.map((a) => ({
        id: a.phone,
        name: a.name,
        phone: a.phone,
        entity_type: 'manual',
        entity_id: a.phone,
        module: 'church',
      })),
      metadata: { type: 'birthday_heads_up', part: i + 1, of: plan.texts.length, date: plan.date },
    })
    sent += result.success_count
    failed += result.error_count
  }
  return { sent, failed }
}

/** For the birthdays page: who is a week away and what admins will get. Sends nothing. */
export async function previewBirthdayHeadsUpAction(days = 7): Promise<ApiResponse<BirthdayHeadsUpPlan>> {
  await guard('members.view')
  try {
    return { data: await planHeadsUp(Math.min(Math.max(1, Math.round(days)), 30)), error: null, loading: false }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Could not load birthdays', loading: false }
  }
}

/** "Text admins now" from the birthdays page (the page shows the preview first). */
export async function sendBirthdayHeadsUpNowAction(): Promise<ApiResponse<{ sent: number; failed: number }>> {
  const user = await guard('members.view')
  if (user && !hasPermission(user.role, 'sms.send', user.permissions)) {
    return { data: null, error: 'Sending texts needs the "Send SMS" permission.', loading: false }
  }
  try {
    const plan = await planHeadsUp(7)
    if (!plan.texts.length) return { data: { sent: 0, failed: 0 }, error: null, loading: false }
    if (!plan.admins.length) return { data: null, error: 'No admin has a valid mobile number.', loading: false }
    return { data: await sendPlan(plan, user?.id ?? 'system-birthday'), error: null, loading: false }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Could not send', loading: false }
  }
}

/** Daily cron (with the birthday job). */
export async function runBirthdayHeadsUpJob(input?: { dry_run?: boolean }): Promise<
  ApiResponse<{ due: number; texts: number; admins: number; sent: number; failed: number; dry_run: boolean }>
> {
  await guard('sms.send')
  try {
    const plan = await planHeadsUp(7)
    const base = { due: plan.due.length, texts: plan.texts.length, admins: plan.admins.length, dry_run: Boolean(input?.dry_run) }
    if (input?.dry_run || !plan.texts.length) return { data: { ...base, sent: 0, failed: 0 }, error: null, loading: false }
    const senderId =
      process.env.BIRTHDAY_SYSTEM_SENDER_ID?.trim() || process.env.CAMP_SYSTEM_SENDER_ID?.trim() || 'system-birthday'
    const { sent, failed } = await sendPlan(plan, senderId)
    return { data: { ...base, sent, failed }, error: null, loading: false }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Birthday heads-up failed', loading: false }
  }
}
