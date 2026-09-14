/**
 * SMS client — Hubtel, generic API, Twilio, mock, or dry-run.
 *
 * Env (Hubtel — recommended for Ghana):
 * - NEXT_PUBLIC_SMS_PROVIDER=hubtel
 * - HUBTEL_CLIENT_ID / HUBTEL_CLIENT_SECRET
 * - SMS_SENDER_ID (e.g. CAMPUSGEM)
 *
 * Developer:
 * - ENVIRONMENT=development|production
 * - SMS_FORCE_MOCK=true — always mock even when Hubtel is configured
 * - SMS_ALLOW_DRY_RUN=true — enable UI dry-run (default on when not production)
 * - SMS_BULK_GAP_MS — delay between bulk sends (default 150)
 */

import { phoneDigitsForWhatsApp } from '@/lib/contact-links'

export type SmsProviderName = 'hubtel' | 'api' | 'twilio' | 'mock' | 'dry_run'

export interface SmsSendOptions {
  /** Validate + normalize only; do not call provider. */
  dryRun?: boolean
  /** Force mock path even when Hubtel/API is configured. */
  forceMock?: boolean
}

export interface SmsSendResult {
  success: boolean
  messageId?: string
  error?: string
  provider: SmsProviderName
  normalizedPhone?: string
  dryRun?: boolean
}

/** Hubtel expects digits like 23324xxxxxxx (no +). */
export function normalizeSmsPhone(phone: string): string {
  const digits = phoneDigitsForWhatsApp(phone)
  if (digits) return digits
  const fallback = phone.trim().replace(/\s+/g, '').replace(/^\+/, '').replace(/\D/g, '')
  if (fallback.startsWith('0') && fallback.length === 10) return `233${fallback.slice(1)}`
  return fallback
}

/** Ghana mobile for Hubtel: 233 + 9 digits (12 total). */
export function isValidSmsPhone(phone: string | null | undefined): boolean {
  if (!phone?.trim()) return false
  const normalized = normalizeSmsPhone(phone)
  return /^233\d{9}$/.test(normalized)
}

export function resolveSmsProvider(): SmsProviderName {
  if (process.env.SMS_FORCE_MOCK === 'true' || process.env.SMS_FORCE_MOCK === '1') {
    return 'mock'
  }
  const explicit = process.env.NEXT_PUBLIC_SMS_PROVIDER?.trim().toLowerCase()
  if (explicit === 'hubtel' || explicit === 'api' || explicit === 'twilio' || explicit === 'mock') {
    return explicit
  }
  if (process.env.HUBTEL_CLIENT_ID && process.env.HUBTEL_CLIENT_SECRET) return 'hubtel'
  if (process.env.SMS_API_URL) return 'api'
  return 'mock'
}

export function getSmsSenderId(): string {
  return process.env.SMS_SENDER_ID || process.env.HUBTEL_SENDER_ID || 'CAMPUSGEM'
}

export function getAppEnvironment(): string {
  return process.env.ENVIRONMENT || process.env.NODE_ENV || 'development'
}

export function isSmsDevModeAvailable(): boolean {
  const env = getAppEnvironment().toLowerCase()
  if (process.env.SMS_ALLOW_DRY_RUN === 'true' || process.env.SMS_ALLOW_DRY_RUN === '1') return true
  if (process.env.SMS_ALLOW_DRY_RUN === 'false' || process.env.SMS_ALLOW_DRY_RUN === '0') return false
  return env !== 'production'
}

export function isSmsConfigured(): boolean {
  const provider = resolveSmsProvider()
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

export function getSmsProviderStatus() {
  const provider = resolveSmsProvider()
  return {
    provider,
    configured: isSmsConfigured(),
    senderId: getSmsSenderId(),
    environment: getAppEnvironment(),
    devModeAvailable: isSmsDevModeAvailable(),
    forceMock: process.env.SMS_FORCE_MOCK === 'true' || process.env.SMS_FORCE_MOCK === '1',
  }
}

async function sendViaHubtel(phone: string, message: string): Promise<SmsSendResult> {
  const clientId = process.env.HUBTEL_CLIENT_ID
  const clientSecret = process.env.HUBTEL_CLIENT_SECRET
  const from = getSmsSenderId()
  const baseUrl =
    process.env.HUBTEL_SMS_URL?.trim() || 'https://smsc.hubtel.com/v1/messages/send'
  const to = normalizeSmsPhone(phone)

  if (!clientId || !clientSecret) {
    return { success: false, error: 'Hubtel client id/secret not configured', provider: 'hubtel', normalizedPhone: to }
  }
  if (!isValidSmsPhone(phone)) {
    return {
      success: false,
      error: `Invalid phone for SMS (need Ghana mobile like 233XXXXXXXXX). Got: ${to || 'empty'}`,
      provider: 'hubtel',
      normalizedPhone: to,
    }
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
        provider: 'hubtel',
        normalizedPhone: to,
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
        provider: 'hubtel',
        normalizedPhone: to,
      }
    }

    const messageId =
      (data.MessageId as string) ??
      (data.messageId as string) ??
      (data.message_id as string) ??
      (data.id as string)

    return { success: true, messageId, provider: 'hubtel', normalizedPhone: to }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Hubtel SMS request failed',
      provider: 'hubtel',
      normalizedPhone: to,
    }
  }
}

async function sendViaApi(phone: string, message: string): Promise<SmsSendResult> {
  const url = process.env.SMS_API_URL
  const apiKey = process.env.SMS_API_KEY
  const to = normalizeSmsPhone(phone)
  if (!url) {
    return { success: false, error: 'SMS_API_URL is not configured', provider: 'api', normalizedPhone: to }
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
        to,
        phone: to,
        message,
        body: message,
        sender: getSmsSenderId(),
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
        provider: 'api',
        normalizedPhone: to,
      }
    }

    const messageId =
      (data.messageId as string) ??
      (data.message_id as string) ??
      (data.id as string) ??
      (data.sid as string)

    return { success: true, messageId, provider: 'api', normalizedPhone: to }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SMS API request failed',
      provider: 'api',
      normalizedPhone: to,
    }
  }
}

async function sendViaTwilio(phone: string, message: string): Promise<SmsSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER
  const to = normalizeSmsPhone(phone)
  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: 'Twilio credentials not configured', provider: 'twilio', normalizedPhone: to }
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
        To: `+${to}`,
        Body: message,
      }),
    }
  )

  if (!response.ok) {
    return { success: false, error: await response.text(), provider: 'twilio', normalizedPhone: to }
  }
  const data = (await response.json()) as { sid?: string }
  return { success: true, messageId: data.sid, provider: 'twilio', normalizedPhone: to }
}

async function sendViaMock(phone: string, message: string): Promise<SmsSendResult> {
  const to = normalizeSmsPhone(phone)
  await new Promise((r) => setTimeout(r, 80))
  console.log('[Mock SMS]', { to, message: message.slice(0, 80) })
  return {
    success: true,
    messageId: `mock_sms_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    provider: 'mock',
    normalizedPhone: to,
  }
}

export async function sendSms(
  phone: string,
  message: string,
  options: SmsSendOptions = {}
): Promise<SmsSendResult> {
  if (!phone?.trim()) {
    return { success: false, error: 'Phone number is required', provider: 'mock' }
  }
  if (!message?.trim()) {
    return { success: false, error: 'Message is required', provider: 'mock' }
  }

  const normalizedPhone = normalizeSmsPhone(phone)
  if (!isValidSmsPhone(phone)) {
    return {
      success: false,
      error: `Invalid phone for SMS (need Ghana mobile like 024… / +233… / 233…). Got: ${normalizedPhone || 'empty'}`,
      provider: options.dryRun ? 'dry_run' : resolveSmsProvider(),
      normalizedPhone,
      dryRun: Boolean(options.dryRun),
    }
  }

  if (options.dryRun) {
    return {
      success: true,
      messageId: `dry_run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      provider: 'dry_run',
      normalizedPhone,
      dryRun: true,
    }
  }

  const provider =
    options.forceMock || process.env.SMS_FORCE_MOCK === 'true' || process.env.SMS_FORCE_MOCK === '1'
      ? 'mock'
      : resolveSmsProvider()

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
