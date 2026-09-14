/**
 * SMS client — Hubtel, generic API, Twilio, or mock.
 *
 * Env (Hubtel — recommended for Ghana):
 * - NEXT_PUBLIC_SMS_PROVIDER=hubtel
 * - HUBTEL_CLIENT_ID
 * - HUBTEL_CLIENT_SECRET
 * - SMS_SENDER_ID (registered sender, e.g. CAMPUSGEM)
 * - HUBTEL_SMS_URL (optional, default https://smsc.hubtel.com/v1/messages/send)
 *
 * Env (generic JSON API):
 * - SMS_API_URL — POST endpoint (body: { to, message, sender? })
 * - SMS_API_KEY — Bearer token or x-api-key header
 * - SMS_API_KEY_HEADER — header name (default Authorization Bearer)
 * - SMS_SENDER_ID
 *
 * Env (Twilio):
 * - NEXT_PUBLIC_SMS_PROVIDER=twilio
 * - TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER
 */

import { phoneDigitsForWhatsApp } from '@/lib/contact-links'

export interface SmsSendResult {
  success: boolean
  messageId?: string
  error?: string
}

/** Hubtel expects digits like 23324xxxxxxx (no +). */
export function normalizeSmsPhone(phone: string): string {
  const digits = phoneDigitsForWhatsApp(phone)
  if (digits) return digits
  return phone.trim().replace(/\s+/g, '').replace(/^\+/, '')
}

function resolveProvider(): string {
  if (process.env.NEXT_PUBLIC_SMS_PROVIDER) return process.env.NEXT_PUBLIC_SMS_PROVIDER
  if (process.env.HUBTEL_CLIENT_ID && process.env.HUBTEL_CLIENT_SECRET) return 'hubtel'
  if (process.env.SMS_API_URL) return 'api'
  return 'mock'
}

async function sendViaHubtel(phone: string, message: string): Promise<SmsSendResult> {
  const clientId = process.env.HUBTEL_CLIENT_ID
  const clientSecret = process.env.HUBTEL_CLIENT_SECRET
  const from = process.env.SMS_SENDER_ID || process.env.HUBTEL_SENDER_ID || 'CAMPUSGEM'
  const baseUrl =
    process.env.HUBTEL_SMS_URL?.trim() || 'https://smsc.hubtel.com/v1/messages/send'

  if (!clientId || !clientSecret) {
    return { success: false, error: 'Hubtel client id/secret not configured' }
  }

  const to = normalizeSmsPhone(phone)
  if (!to) {
    return { success: false, error: 'Invalid phone number for SMS' }
  }

  const url = new URL(baseUrl)
  url.searchParams.set('clientid', clientId)
  url.searchParams.set('clientsecret', clientSecret)
  url.searchParams.set('from', from)
  url.searchParams.set('to', to)
  url.searchParams.set('content', message)

  try {
    const response = await fetch(url.toString(), { method: 'GET' })
    const text = await response.text()
    let data: Record<string, unknown> = {}
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch {
      data = { raw: text }
    }

    // Hubtel commonly returns Status: 0 on success
    const status = data.Status ?? data.status ?? data.responseCode
    const okHttp = response.ok
    const okStatus =
      status === 0 ||
      status === '0' ||
      status === '0000' ||
      status === 'Success' ||
      status === 'success'

    if (!okHttp && !okStatus) {
      return {
        success: false,
        error:
          (data.StatusDescription as string) ??
          (data.statusDescription as string) ??
          (data.message as string) ??
          (data.Message as string) ??
          text ??
          `HTTP ${response.status}`,
      }
    }

    if (okHttp && status !== undefined && !okStatus) {
      return {
        success: false,
        error:
          (data.StatusDescription as string) ??
          (data.statusDescription as string) ??
          (data.message as string) ??
          `Hubtel status ${String(status)}`,
      }
    }

    const messageId =
      (data.MessageId as string) ??
      (data.messageId as string) ??
      (data.message_id as string) ??
      (data.id as string)

    return { success: true, messageId }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Hubtel SMS request failed',
    }
  }
}

async function sendViaApi(phone: string, message: string): Promise<SmsSendResult> {
  const url = process.env.SMS_API_URL
  const apiKey = process.env.SMS_API_KEY
  if (!url) {
    return { success: false, error: 'SMS_API_URL is not configured' }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const keyHeader = process.env.SMS_API_KEY_HEADER ?? 'Authorization'
  if (apiKey) {
    headers[keyHeader] =
      keyHeader.toLowerCase() === 'authorization' ? `Bearer ${apiKey}` : apiKey
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: normalizeSmsPhone(phone),
        phone: normalizeSmsPhone(phone),
        message,
        body: message,
        sender: process.env.SMS_SENDER_ID,
      }),
    })

    const text = await response.text()
    let data: Record<string, unknown> = {}
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch {
      data = { raw: text }
    }

    if (!response.ok) {
      return {
        success: false,
        error: (data.error as string) ?? (data.message as string) ?? text ?? `HTTP ${response.status}`,
      }
    }

    const messageId =
      (data.messageId as string) ??
      (data.message_id as string) ??
      (data.id as string) ??
      (data.sid as string)

    return { success: true, messageId }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SMS API request failed',
    }
  }
}

async function sendViaTwilio(phone: string, message: string): Promise<SmsSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER
  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: 'Twilio credentials not configured' }
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: `+${normalizeSmsPhone(phone)}`,
        Body: message,
      }),
    }
  )

  if (!response.ok) {
    return { success: false, error: await response.text() }
  }
  const data = (await response.json()) as { sid?: string }
  return { success: true, messageId: data.sid }
}

async function sendViaMock(phone: string, message: string): Promise<SmsSendResult> {
  await new Promise((r) => setTimeout(r, 80))
  console.log('[Mock SMS]', { to: phone, message: message.slice(0, 80) })
  return {
    success: true,
    messageId: `mock_sms_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  }
}

export async function sendSms(phone: string, message: string): Promise<SmsSendResult> {
  if (!phone?.trim()) {
    return { success: false, error: 'Phone number is required' }
  }
  if (!message?.trim()) {
    return { success: false, error: 'Message is required' }
  }

  const provider = resolveProvider()

  switch (provider) {
    case 'hubtel':
      return sendViaHubtel(phone, message)
    case 'api':
      return sendViaApi(phone, message)
    case 'twilio':
      return sendViaTwilio(phone, message)
    case 'mock':
    default:
      return sendViaMock(phone, message)
  }
}

export function isSmsConfigured(): boolean {
  const provider = resolveProvider()
  if (provider === 'mock') return false
  if (provider === 'hubtel') {
    return Boolean(process.env.HUBTEL_CLIENT_ID && process.env.HUBTEL_CLIENT_SECRET)
  }
  if (provider === 'api') return Boolean(process.env.SMS_API_URL)
  if (provider === 'twilio') {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER
    )
  }
  return false
}
