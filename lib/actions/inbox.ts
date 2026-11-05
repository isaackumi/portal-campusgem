'use server'

/** SMS replies inbox (`/admin/inbox`). Everything here needs `sms.send`. */
import { revalidatePath } from 'next/cache'
import { guard } from '@/lib/auth/action-guard'
import type { ApiResponse } from '@/lib/services/api-types'
import { groupThreads, type InboxThreadSummary } from '@/lib/comms/inbound'
import type { SenderMatch } from '@/lib/convex/inbox-bridge'

function ok<T>(data: T): ApiResponse<T> {
  return { data, error: null, loading: false }
}

function fail<T>(error: unknown, fallback: string): ApiResponse<T> {
  if (typeof error === 'string') return { data: null, error, loading: false }
  return { data: null, error: error instanceof Error ? error.message : fallback, loading: false }
}

const bridge = () => import('@/lib/convex/inbox-bridge')

function cleanPhone(phone: string): string | null {
  const p = String(phone ?? '').replace(/\D/g, '')
  return p.length >= 6 && p.length <= 15 ? p : null
}

export async function listInboxThreadsAction(): Promise<ApiResponse<InboxThreadSummary[]>> {
  await guard('sms.send')
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return ok([])
  try {
    const messages = await (await bridge()).listInboxFromConvex(1000)
    return ok(groupThreads(messages))
  } catch (error) {
    return fail(error, 'Could not load the inbox')
  }
}

export type ThreadItem = {
  id: string
  direction: 'in' | 'out'
  body: string
  at: number
  status?: string
  tags?: string[]
  read?: boolean
}

export type InboxThread = {
  phone: string
  match: SenderMatch
  items: ThreadItem[]
  archived: boolean
}

/** One conversation, oldest first. Opening it marks it read. */
export async function getInboxThreadAction(phone: string): Promise<ApiResponse<InboxThread>> {
  const user = await guard('sms.send')
  const p = cleanPhone(phone)
  if (!p) return fail('Invalid number.', '')
  try {
    const b = await bridge()
    const raw = await b.getInboxThreadFromConvex(p)
    const items: ThreadItem[] = [
      ...raw.inbound.map((m) => ({
        id: m.id,
        direction: 'in' as const,
        body: m.body,
        at: m.received_at,
        tags: m.tags,
        read: Boolean(m.read_at),
      })),
      ...raw.outbound.map((m) => ({ id: m.id, direction: 'out' as const, body: m.body, at: m.at, status: m.status })),
    ].sort((a, b) => a.at - b.at)
    if (raw.inbound.some((m) => !m.read_at)) await b.markInboxThreadReadInConvex(p, user?.id)
    return ok({
      phone: p,
      match: raw.match,
      items,
      archived: raw.inbound.length > 0 && raw.inbound.every((m) => m.archived),
    })
  } catch (error) {
    return fail(error, 'Could not load the conversation')
  }
}

export async function markInboxThreadAction(phone: string, read: boolean): Promise<ApiResponse<true>> {
  const user = await guard('sms.send')
  const p = cleanPhone(phone)
  if (!p) return fail('Invalid number.', '')
  try {
    await (await bridge()).markInboxThreadReadInConvex(p, user?.id, !read)
    return ok(true)
  } catch (error) {
    return fail(error, 'Could not update the conversation')
  }
}

export async function archiveInboxThreadAction(phone: string, archived: boolean): Promise<ApiResponse<true>> {
  const user = await guard('sms.send')
  const p = cleanPhone(phone)
  if (!p) return fail('Invalid number.', '')
  try {
    await (await bridge()).setInboxThreadArchivedInConvex(p, archived, user?.id)
    return ok(true)
  } catch (error) {
    return fail(error, 'Could not update the conversation')
  }
}

/** Reply by SMS. Logged in `communications` like every other send, so it shows in the thread. */
export async function replyInboxThreadAction(input: {
  phone: string
  message: string
  dry_run?: boolean
}): Promise<ApiResponse<{ sent: boolean }>> {
  const user = await guard('sms.send')
  const p = cleanPhone(input.phone)
  if (!p) return fail('Invalid number.', '')
  const message = input.message?.trim()
  if (!message) return fail('Write a reply first.', '')
  if (message.length > 918) return fail('Keep replies under 918 characters (6 SMS).', '')
  try {
    const b = await bridge()
    const match = await b.matchSmsSenderFromConvex(p)
    const { sendCommunications } = await import('@/lib/comms/send')
    const entity_type = match.user_id ? 'member' : match.visitor_id ? 'visitor' : match.camp_registration_id ? 'registration' : 'manual'
    const entity_id = match.user_id ?? match.visitor_id ?? match.camp_registration_id ?? p
    const result = await sendCommunications({
      module: match.camp_registration_id && !match.user_id ? 'camp' : 'church',
      channel: 'sms',
      audience_type: 'individual',
      sender_id: user?.id ?? 'system',
      message_body: message,
      recipients: [
        {
          id: entity_id,
          name: match.sender_name ?? p,
          phone: p,
          entity_type,
          entity_id,
          module: 'church',
        },
      ],
      dry_run: Boolean(input.dry_run),
      metadata: { type: 'inbox_reply' },
    })
    if (result.success_count === 0) return fail(result.errors[0] ?? 'The text could not be sent.', '')
    if (user?.id) await b.markInboxThreadHandledInConvex(p, user.id)
    try {
      revalidatePath('/admin/inbox')
    } catch {
      // not critical
    }
    return ok({ sent: true })
  } catch (error) {
    return fail(error, 'Could not send the reply')
  }
}

export async function countUnreadInboxAction(): Promise<number> {
  try {
    await guard('sms.send')
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) return 0
    return await (await bridge()).countUnreadInboxFromConvex()
  } catch {
    return 0
  }
}

/** Staff can undo (or set) a STOP by hand, e.g. when someone asks to be texted again. */
export async function setSmsOptOutAction(userId: string, optOut: boolean): Promise<ApiResponse<true>> {
  await guard('sms.send')
  try {
    await (await bridge()).setUserSmsOptOutInConvex(userId, optOut)
    return ok(true)
  } catch (error) {
    return fail(error, 'Could not update SMS preferences')
  }
}
