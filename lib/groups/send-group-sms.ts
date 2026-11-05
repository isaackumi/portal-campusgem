import 'server-only'

import type { ApiResponse } from '@/lib/services/api-types'
import type { AppUser, Member } from '@/lib/types'
import type { CommsRecipient, SendCommsResult } from '@/lib/comms/types'

export type GroupSmsResult = SendCommsResult & {
  /** Members in the chunk with no usable phone number (not sent, not logged). */
  skipped: number
}

export type GroupSmsInput = {
  group_id: string
  member_ids: string[]
  message: string
  batch_id?: string
  dry_run?: boolean
}

function isConvexDataSource(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)
}

function failure<T>(error: unknown, fallback: string): ApiResponse<T> {
  return { data: null, error: error instanceof Error ? error.message : fallback, loading: false }
}

/**
 * Text members of one group. Callers authorise first (sendGroupSmsAction: `sms.send`;
 * sendCampusSmsAction: campus scope). Recipients are re-resolved here, so only real
 * members of this group are texted, and the sender is the signed-in user.
 * {{name}} / {{full_name}} / {{membership_id}} are filled in per member by `sendCommunications`.
 */
export async function sendGroupSms(sender: Pick<AppUser, 'id'>, input: GroupSmsInput): Promise<ApiResponse<GroupSmsResult>> {
  if (!isConvexDataSource()) {
    return { data: null, error: 'Database is not configured.', loading: false }
  }
  const message = input.message?.trim()
  if (!message) return { data: null, error: 'Message is required', loading: false }
  if (!input.group_id || !input.member_ids?.length) {
    return { data: null, error: 'No recipients', loading: false }
  }
  if (input.member_ids.length > 100) {
    return { data: null, error: 'Send at most 100 recipients per request', loading: false }
  }

  try {
    const { fetchGroupFromConvex, fetchMemberFromConvex, fetchUserFromConvex, listGroupMembershipsFromConvex } =
      await import('@/lib/convex/core-bridge')
    const { memberToRecipient } = await import('@/lib/comms/recipients')
    const { isValidSmsPhone } = await import('@/lib/comms/sms-client')
    const { sendCommunications } = await import('@/lib/comms/send')

    const [group, memberships] = await Promise.all([
      fetchGroupFromConvex(input.group_id),
      listGroupMembershipsFromConvex(input.group_id),
    ])
    if (!group) return { data: null, error: 'Group not found', loading: false }

    const inGroup = new Set(memberships.map((m) => m.member_id))
    const wanted = Array.from(new Set(input.member_ids)).filter((id) => inGroup.has(id))

    const profiles = (await Promise.all(wanted.map((id) => fetchMemberFromConvex(id)))).filter(
      (p): p is Member => p != null
    )
    const users = await Promise.all(profiles.map((p) => (p.user_id ? fetchUserFromConvex(p.user_id) : null)))

    const recipients: CommsRecipient[] = []
    let skipped = input.member_ids.length - wanted.length
    profiles.forEach((profile, index) => {
      const user = users[index] as AppUser | null
      const recipient = memberToRecipient({ ...profile, user: user ?? undefined }, 'church')
      if (recipient && isValidSmsPhone(recipient.phone)) recipients.push(recipient)
      else skipped++
    })
    skipped += wanted.length - profiles.length

    if (recipients.length === 0) {
      return {
        data: { batch_id: input.batch_id ?? '', success_count: 0, error_count: 0, errors: [], records: [], skipped },
        error: null,
        loading: false,
      }
    }

    const result = await sendCommunications({
      module: 'church',
      channel: 'sms',
      audience_type: 'group',
      sender_id: sender.id,
      message_body: message,
      recipients,
      batch_id: input.batch_id,
      dry_run: Boolean(input.dry_run),
      filter_criteria: { group_id: group.id },
      metadata: { group_id: group.id, group_name: group.name },
    })
    // Records can be large; the client only needs the counts.
    return { data: { ...result, records: [], skipped }, error: null, loading: false }
  } catch (error: unknown) {
    return failure(error, 'Failed to send messages')
  }
}
