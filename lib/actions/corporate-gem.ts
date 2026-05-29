'use server'

import { createFormFromTemplate } from '@/lib/actions/form-templates'
import { addUserToGroupAction, createGroupAction } from '@/lib/actions/core-data'
import { listForms } from '@/lib/actions/forms'
import {
  CORPORATE_GEM_REGISTRATION_CATEGORY,
  CORPORATE_GEM_GROUP_TYPE,
  DEFAULT_CORPORATE_GEM_GROUP_NAME,
} from '@/lib/constants/corporate-gem'
import type { ChurchForm, Group, GroupMembership } from '@/lib/types'

export async function findCorporateGemGroups(): Promise<{
  data: Group[]
  error: string | null
}> {
  try {
    const { fetchGroupsFromConvex } = await import('@/lib/convex/core-bridge')
    const groups = await fetchGroupsFromConvex()
    return {
      data: groups.filter((g) => g.group_type === CORPORATE_GEM_GROUP_TYPE && g.is_active),
      error: null,
    }
  } catch (error: unknown) {
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Failed to load Corporate Gem groups',
    }
  }
}

export async function ensureCorporateGemGroup(): Promise<{
  data: Group | null
  created: boolean
  error: string | null
}> {
  const { data: existing, error: listError } = await findCorporateGemGroups()
  if (listError) return { data: null, created: false, error: listError }

  const match =
    existing.find((g) => g.name.toLowerCase() === DEFAULT_CORPORATE_GEM_GROUP_NAME.toLowerCase()) ??
    existing[0]

  if (match) return { data: match, created: false, error: null }

  const { data, error } = await createGroupAction({
    name: DEFAULT_CORPORATE_GEM_GROUP_NAME,
    description: 'Graduates and working professionals — executives, leaders, members, and activities.',
    group_type: CORPORATE_GEM_GROUP_TYPE,
    is_active: true,
  })

  if (error || !data) {
    return { data: null, created: false, error: error ?? 'Failed to create Corporate Gem group' }
  }

  return { data, created: true, error: null }
}

export async function ensureCorporateGemRegistrationForm(
  groupId: string,
  groupName?: string
): Promise<{ data: ChurchForm | null; created: boolean; error: string | null }> {
  try {
    const { data: forms, error: listError } = await listForms(groupId)
    if (listError) return { data: null, created: false, error: listError }

    const existing = forms.find((form) => form.category === CORPORATE_GEM_REGISTRATION_CATEGORY)
    if (existing) return { data: existing, created: false, error: null }

    const { data, error } = await createFormFromTemplate({
      templateId: 'corporate_gem_registration',
      group_id: groupId,
      group_name: groupName,
      publish: false,
    })

    if (error || !data) {
      return { data: null, created: false, error: error ?? 'Failed to create Corporate Gem form' }
    }

    return { data, created: true, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      created: false,
      error: error instanceof Error ? error.message : 'Failed to set up Corporate Gem form',
    }
  }
}

export async function promoteUserToCorporateGem(
  userId: string,
  options?: { groupId?: string; role?: GroupMembership['role'] }
): Promise<{ data: GroupMembership | null; group: Group | null; error: string | null }> {
  let group: Group | null = null

  if (options?.groupId) {
    const { fetchGroupsFromConvex } = await import('@/lib/convex/core-bridge')
    const groups = await fetchGroupsFromConvex()
    group = groups.find((g) => g.id === options.groupId) ?? null
  } else {
    const ensured = await ensureCorporateGemGroup()
    if (ensured.error || !ensured.data) {
      return { data: null, group: null, error: ensured.error ?? 'Corporate Gem group not found' }
    }
    group = ensured.data
  }

  if (!group) {
    return { data: null, group: null, error: 'Corporate Gem group not found' }
  }

  const { data, error } = await addUserToGroupAction(group.id, userId, options?.role ?? 'member')
  if (error || !data) {
    return { data: null, group, error: error ?? 'Failed to add to Corporate Gem' }
  }

  return { data, group, error: null }
}
