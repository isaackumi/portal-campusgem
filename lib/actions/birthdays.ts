'use server'

import { guard } from '@/lib/auth/action-guard'
import type { ApiResponse } from '@/lib/services/api-types'
import {
  type BirthdayEntry,
  filterBirthdaysByTime,
  isCampusGemMember,
  isRlcMember,
  memberToBirthdayEntry,
  visitorToBirthdayEntry,
} from '@/lib/birthdays/upcoming-birthdays'
import {
  birthdayMessageFor,
  getBirthdayAdvanceSmsTemplate,
  getBirthdaySmsTemplate,
  ghanaCalendarDate,
  isBirthdaySmsAutoEnabled,
  personalizeBirthdaySms,
} from '@/lib/birthdays/sms'
import type { CommsModule, CommsRecipient } from '@/lib/comms/types'

function isConvexDataSource(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)
}

function convexUnavailable(): string {
  return 'Convex is not configured'
}

export async function loadCampusGemBirthdaysAction(): Promise<ApiResponse<BirthdayEntry[]>> {
  await guard('dashboard.view')
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const { fetchMembersFromConvex } = await import('@/lib/convex/core-bridge')
    const { attachUsersToMembers } = await import('@/lib/actions/core-data')
    const members = await fetchMembersFromConvex()
    const withUsers = await attachUsersToMembers(members)

    const entries = withUsers
      .filter(isCampusGemMember)
      .map((member) =>
        memberToBirthdayEntry(member, {
          href: member.user_id ? `/admin/users/${member.user_id}` : `/members/${member.id}`,
        })
      )
      .filter((entry): entry is BirthdayEntry => entry != null)

    return { data: entries, error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load birthdays',
      loading: false,
    }
  }
}

export async function loadRlcBirthdaysAction(): Promise<ApiResponse<BirthdayEntry[]>> {
  await guard('dashboard.view')
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  try {
    const [{ listRlcMembersFromConvex, listRlcVisitorsFromConvex }, { attachUsersToMembers }] =
      await Promise.all([
        import('@/lib/convex/rlc-bridge'),
        import('@/lib/actions/core-data'),
      ])

    const [members, visitors] = await Promise.all([
      listRlcMembersFromConvex(),
      listRlcVisitorsFromConvex({ include_inactive: false }),
    ])
    const withUsers = await attachUsersToMembers(members)

    const memberEntries = withUsers
      .filter(isRlcMember)
      .map((member) =>
        memberToBirthdayEntry(member, {
          href: `/admin/rlc/members/${member.id}/edit`,
        })
      )
      .filter((entry): entry is BirthdayEntry => entry != null)

    const visitorEntries = visitors
      .filter((visitor) => visitor.is_active !== false && !visitor.converted_to_member)
      .map((visitor) => visitorToBirthdayEntry(visitor))
      .filter((entry): entry is BirthdayEntry => entry != null)

    return { data: [...memberEntries, ...visitorEntries], error: null, loading: false }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load RLC birthdays',
      loading: false,
    }
  }
}

export type BirthdaySmsSendResult = {
  success_count: number
  error_count: number
  skipped_count: number
  errors: string[]
  batch_id?: string
  provider?: string
  date: string
  dry_run: boolean
}

function entryToRecipient(entry: BirthdayEntry, module: CommsModule): CommsRecipient | null {
  if (!entry.phone?.trim()) return null
  const firstName = entry.name.trim().split(/\s+/)[0] || entry.name
  return {
    id: entry.id,
    name: entry.name,
    phone: entry.phone,
    email: entry.email,
    entity_type: entry.kind === 'visitor' ? 'visitor' : 'member',
    entity_id: entry.id,
    module,
    variables: {
      name: firstName,
      full_name: entry.name,
      firstName,
      first_name: firstName,
      ageTurning: entry.ageTurning != null ? String(entry.ageTurning) : '',
      age: entry.ageTurning != null ? String(entry.ageTurning) : '',
    },
  }
}

/**
 * The exact text for one person. "Happy Birthday" only on the day itself; earlier sends use
 * the "in advance" wording. Days are counted on the Ghana calendar from the date of birth,
 * never from what the browser says.
 */
function birthdayBodyFor(entry: BirthdayEntry, customTemplate?: string | null) {
  const { year, month, day } = ghanaCalendarDate()
  return birthdayMessageFor(
    { name: entry.name, birthMonth: entry.birthMonth, birthDay: entry.birthDay, ageTurning: entry.ageTurning },
    {
      today: { year, month, day },
      template: getBirthdaySmsTemplate(),
      advanceTemplate: getBirthdayAdvanceSmsTemplate(),
      customTemplate,
    }
  )
}

export type BirthdaySmsPreviewRow = {
  id: string
  name: string
  phone?: string
  body: string
  daysUntil: number
  kind: 'today' | 'advance'
  birthdayDate: string
  validPhone: boolean
}

/** What each person would get, for the check-before-sending screen. Sends nothing. */
export async function previewBirthdaySmsAction(input: {
  entries: BirthdayEntry[]
  message_template?: string
}): Promise<ApiResponse<BirthdaySmsPreviewRow[]>> {
  await guard('sms.send')
  const { isValidSmsPhone } = await import('@/lib/comms/sms-client')
  const rows = (input.entries ?? []).slice(0, 500).map((entry) => {
    const m = birthdayBodyFor(entry, input.message_template)
    return {
      id: entry.id,
      name: entry.name,
      phone: entry.phone,
      body: m.body,
      daysUntil: m.daysUntil,
      kind: m.kind,
      birthdayDate: m.birthdayDate,
      validPhone: isValidSmsPhone(entry.phone),
    }
  })
  return { data: rows, error: null, loading: false }
}

/** Send birthday SMS (Hubtel) to the given entries. */
export async function sendBirthdaySmsAction(input: {
  sender_id: string
  module: CommsModule
  entries: BirthdayEntry[]
  message_template?: string
  dry_run?: boolean
  /** Mark log metadata as cron/auto send */
  auto?: boolean
}): Promise<ApiResponse<BirthdaySmsSendResult>> {
  await guard('sms.send')
  if (!isConvexDataSource()) {
    return { data: null, error: convexUnavailable(), loading: false }
  }
  if (!input.sender_id) {
    return { data: null, error: 'Sender is required', loading: false }
  }
  if (!input.entries.length) {
    return { data: null, error: 'No birthday recipients selected', loading: false }
  }

  const { isSmsConfigured, isValidSmsPhone, resolveSmsProvider } = await import(
    '@/lib/comms/sms-client'
  )
  const dryRun = Boolean(input.dry_run)
  if (!dryRun && !isSmsConfigured()) {
    return {
      data: null,
      error: 'SMS is not configured. Add Hubtel credentials in Vercel, then redeploy.',
      loading: false,
    }
  }

  const template = input.message_template?.trim() || getBirthdaySmsTemplate()
  const date = ghanaCalendarDate().iso
  const recipients: CommsRecipient[] = []
  const errors: string[] = []
  let skipped_count = 0

  for (const entry of input.entries) {
    if (!entry.phone?.trim()) {
      skipped_count++
      errors.push(`${entry.name}: No phone`)
      continue
    }
    if (!isValidSmsPhone(entry.phone)) {
      skipped_count++
      errors.push(`${entry.name}: Invalid phone (${entry.phone})`)
      continue
    }
    const recipient = entryToRecipient(entry, input.module)
    if (recipient) recipients.push(recipient)
  }

  if (recipients.length === 0) {
    return {
      data: {
        success_count: 0,
        error_count: 0,
        skipped_count,
        errors,
        date,
        dry_run: dryRun,
        provider: dryRun ? 'dry_run' : resolveSmsProvider(),
      },
      error: skipped_count ? 'No valid phones to send to' : 'No recipients',
      loading: false,
    }
  }

  try {
    const { sendCommunications } = await import('@/lib/comms/send')
    const personalizedBodies = new Map<string, string>()
    for (const entry of input.entries) {
      personalizedBodies.set(entry.id, birthdayBodyFor(entry, input.message_template).body)
    }

    const withBody = recipients.map((r) => ({
      ...r,
      variables: {
        ...(r.variables ?? {}),
        body: personalizedBodies.get(r.entity_id) || personalizedBodies.get(r.id) || template,
      },
    }))

    const result = await sendCommunications({
      module: input.module,
      channel: 'sms',
      audience_type: recipients.length > 1 ? 'bulk' : 'individual',
      sender_id: input.sender_id,
      message_body: '{{body}}',
      recipients: withBody,
      dry_run: dryRun,
      metadata: {
        type: 'birthday',
        birthday_date: date,
        auto: Boolean(input.auto),
      },
      filter_criteria: { type: 'birthday', birthday_date: date },
    })

    return {
      data: {
        success_count: result.success_count,
        error_count: result.error_count,
        skipped_count,
        errors: [...errors, ...result.errors],
        batch_id: result.batch_id,
        provider: resolveSmsProvider(),
        date,
        dry_run: dryRun,
      },
      error: null,
      loading: false,
    }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to send birthday SMS',
      loading: false,
    }
  }
}

/** Cron / system job: SMS everyone with a birthday today (Campus Gem + RLC). */
export async function runTodaysBirthdaySmsJob(input?: {
  dry_run?: boolean
  force?: boolean
}): Promise<
  ApiResponse<{
    campus: BirthdaySmsSendResult | null
    rlc: BirthdaySmsSendResult | null
    skipped?: string
    date: string
  }>
> {
  await guard('sms.send')
  const date = ghanaCalendarDate().iso
  if (!input?.force && !isBirthdaySmsAutoEnabled()) {
    return {
      data: { campus: null, rlc: null, skipped: 'auto_disabled', date },
      error: null,
      loading: false,
    }
  }

  const senderId =
    process.env.BIRTHDAY_SYSTEM_SENDER_ID?.trim() ||
    process.env.CAMP_SYSTEM_SENDER_ID?.trim() ||
    'system-birthday'

  const [campusRes, rlcRes] = await Promise.all([
    loadCampusGemBirthdaysAction(),
    loadRlcBirthdaysAction(),
  ])

  const { year, month, day } = ghanaCalendarDate()
  const refDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))

  const campusToday = filterBirthdaysByTime(campusRes.data ?? [], 'today', refDate)
  const rlcToday = filterBirthdaysByTime(rlcRes.data ?? [], 'today', refDate)

  const seenPhones = new Set<string>()
  const dedupe = (entries: BirthdayEntry[]) =>
    entries.filter((e) => {
      const key = (e.phone || e.id).replace(/\D/g, '')
      if (!key || seenPhones.has(key)) return false
      seenPhones.add(key)
      return true
    })

  const campusUnique = dedupe(campusToday)
  const rlcUnique = dedupe(rlcToday)

  let campus: BirthdaySmsSendResult | null = null
  let rlc: BirthdaySmsSendResult | null = null

  if (campusUnique.length) {
    const sent = await sendBirthdaySmsAction({
      sender_id: senderId,
      module: 'church',
      entries: campusUnique,
      dry_run: input?.dry_run,
      auto: true,
    })
    if (sent.error && !sent.data) {
      return { data: null, error: `Campus Gem: ${sent.error}`, loading: false }
    }
    campus = sent.data
  }

  if (rlcUnique.length) {
    const sent = await sendBirthdaySmsAction({
      sender_id: senderId,
      module: 'rlc',
      entries: rlcUnique,
      dry_run: input?.dry_run,
      auto: true,
    })
    if (sent.error && !sent.data) {
      return { data: null, error: `RLC: ${sent.error}`, loading: false }
    }
    rlc = sent.data
  }

  return {
    data: {
      campus,
      rlc,
      date,
      skipped:
        !campusUnique.length && !rlcUnique.length ? 'no_birthdays_today' : undefined,
    },
    error: null,
    loading: false,
  }
}
