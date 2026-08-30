import type { CommsRecipient, CommsModule } from '@/lib/comms/types'
import type { Group, Member, Visitor } from '@/lib/types'

export function personalizeMessage(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? '')
}

export function memberToRecipient(member: Member, module: CommsModule): CommsRecipient | null {
  const user = member.user
  const name = user?.full_name ?? 'Member'
  const email = user?.email
  const phone = user?.phone
  if (!email && !phone) return null
  return {
    id: member.id,
    name,
    email: email ?? undefined,
    phone: phone ?? undefined,
    entity_type: 'member',
    entity_id: member.id,
    module,
    variables: {
      name: name.split(' ')[0] ?? name,
      full_name: name,
      membership_id: user?.membership_id ?? '',
    },
  }
}

export function visitorToRecipient(visitor: Visitor, module: CommsModule = 'rlc'): CommsRecipient | null {
  const name = [visitor.first_name, visitor.last_name].filter(Boolean).join(' ') || 'Visitor'
  if (!visitor.email && !visitor.phone) return null
  return {
    id: visitor.id,
    name,
    email: visitor.email ?? undefined,
    phone: visitor.phone ?? undefined,
    entity_type: 'visitor',
    entity_id: visitor.id,
    module,
    variables: {
      name: visitor.first_name,
      full_name: name,
    },
  }
}

export function groupLabel(group: Group): string {
  return group.name
}

export function filterMembersByModule(members: Member[], module: CommsModule): Member[] {
  if (module === 'church') {
    return members.filter(
      (m) =>
        !m.congregation ||
        m.congregation === 'campus_gem' ||
        m.congregation === 'both'
    )
  }
  if (module === 'rlc') {
    return members.filter(
      (m) => m.congregation === 'rlc' || m.congregation === 'both' || Boolean(m.source_visitor_id)
    )
  }
  return members
}

export function parseManualRecipients(
  raw: string,
  channel: 'email' | 'sms',
  module: CommsModule
): CommsRecipient[] {
  const lines = raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  return lines.map((line, index) => {
    const emailMatch = line.match(/[\w.+-]+@[\w.-]+\.\w+/)
    const phoneMatch = line.match(/\+?\d[\d\s()-]{7,}/)
    const name = line.replace(emailMatch?.[0] ?? '', '').replace(phoneMatch?.[0] ?? '', '').trim()

    return {
      id: `manual-${index}-${line.slice(0, 12)}`,
      name: name || line,
      email: channel === 'email' ? (emailMatch?.[0] ?? (line.includes('@') ? line : undefined)) : emailMatch?.[0],
      phone: channel === 'sms' ? (phoneMatch?.[0]?.replace(/\s+/g, '') ?? undefined) : phoneMatch?.[0]?.replace(/\s+/g, ''),
      entity_type: 'manual',
      entity_id: line,
      module,
      variables: { name: name.split(' ')[0] || 'Friend' },
    }
  })
}
