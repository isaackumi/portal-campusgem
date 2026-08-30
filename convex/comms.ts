import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { assertServerSecret } from './lib/serverSecret'

const moduleValue = v.union(v.literal('church'), v.literal('rlc'), v.literal('camp'))
const channelValue = v.union(v.literal('email'), v.literal('sms'))
const audienceValue = v.union(v.literal('individual'), v.literal('group'), v.literal('bulk'))
const statusValue = v.union(
  v.literal('pending'),
  v.literal('sent'),
  v.literal('delivered'),
  v.literal('failed'),
  v.literal('bounced')
)
const entityTypeValue = v.optional(
  v.union(
    v.literal('member'),
    v.literal('visitor'),
    v.literal('registration'),
    v.literal('group'),
    v.literal('manual')
  )
)

const communicationInput = {
  module: moduleValue,
  channel: channelValue,
  audience_type: audienceValue,
  sender_id: v.optional(v.string()),
  batch_id: v.optional(v.string()),
  recipient_name: v.optional(v.string()),
  recipient_email: v.optional(v.string()),
  recipient_phone: v.optional(v.string()),
  recipient_entity_type: entityTypeValue,
  recipient_entity_id: v.optional(v.string()),
  subject: v.optional(v.string()),
  message_body: v.string(),
  filter_criteria: v.optional(v.any()),
  status: statusValue,
  provider_message_id: v.optional(v.string()),
  error_message: v.optional(v.string()),
  metadata: v.optional(v.any()),
  sent_at: v.optional(v.number()),
  delivered_at: v.optional(v.number()),
}

export const listCommunicationsWithSecret = query({
  args: {
    secret: v.string(),
    module: v.optional(moduleValue),
    channel: v.optional(channelValue),
    batch_id: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const limit = Math.min(args.limit ?? 200, 500)
    let rows = args.module
      ? await ctx.db
          .query('communications')
          .withIndex('by_module', (q) => q.eq('module', args.module!))
          .order('desc')
          .take(limit)
      : await ctx.db.query('communications').order('desc').take(limit)

    if (args.channel) {
      rows = rows.filter((r) => r.channel === args.channel)
    }
    if (args.batch_id) {
      rows = rows.filter((r) => r.batch_id === args.batch_id)
    }
    return rows
  },
})

export const logCommunicationWithSecret = mutation({
  args: {
    secret: v.string(),
    ...communicationInput,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const now = Date.now()
    const id = await ctx.db.insert('communications', {
      module: args.module,
      channel: args.channel,
      audience_type: args.audience_type,
      sender_id: args.sender_id,
      batch_id: args.batch_id,
      recipient_name: args.recipient_name,
      recipient_email: args.recipient_email,
      recipient_phone: args.recipient_phone,
      recipient_entity_type: args.recipient_entity_type,
      recipient_entity_id: args.recipient_entity_id,
      subject: args.subject,
      message_body: args.message_body,
      filter_criteria: args.filter_criteria,
      status: args.status,
      provider_message_id: args.provider_message_id,
      error_message: args.error_message,
      metadata: args.metadata,
      sent_at: args.sent_at,
      delivered_at: args.delivered_at,
      updated_at: now,
    })
    return await ctx.db.get('communications', id)
  },
})

export const logCommunicationsBatchWithSecret = mutation({
  args: {
    secret: v.string(),
    records: v.array(v.object(communicationInput)),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const now = Date.now()
    const created = []
    for (const record of args.records) {
      const id = await ctx.db.insert('communications', {
        ...record,
        updated_at: now,
      })
      const doc = await ctx.db.get('communications', id)
      if (doc) created.push(doc)
    }
    return created
  },
})

export const getCommunicationStatsWithSecret = query({
  args: {
    secret: v.string(),
    module: v.optional(moduleValue),
  },
  returns: v.object({
    total: v.number(),
    sent: v.number(),
    failed: v.number(),
    pending: v.number(),
    email: v.number(),
    sms: v.number(),
  }),
  handler: async (ctx, args) => {
    assertServerSecret(args.secret)
    const rows = args.module
      ? await ctx.db
          .query('communications')
          .withIndex('by_module', (q) => q.eq('module', args.module!))
          .collect()
      : await ctx.db.query('communications').collect()

    return {
      total: rows.length,
      sent: rows.filter((r) => r.status === 'sent' || r.status === 'delivered').length,
      failed: rows.filter((r) => r.status === 'failed' || r.status === 'bounced').length,
      pending: rows.filter((r) => r.status === 'pending').length,
      email: rows.filter((r) => r.channel === 'email').length,
      sms: rows.filter((r) => r.channel === 'sms').length,
    }
  },
})
