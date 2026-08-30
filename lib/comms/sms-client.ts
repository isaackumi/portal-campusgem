/**
 * SMS client — calls your SMS API when configured, otherwise mock/logs only.
 *
 * Env:
 * - SMS_API_URL — POST endpoint (body: { to, message, sender? })
 * - SMS_API_KEY — Bearer token or x-api-key header
 * - SMS_API_KEY_HEADER — header name (default Authorization Bearer)
 * - NEXT_PUBLIC_SMS_PROVIDER — mock | api | twilio | africas_talking
 * - TWILIO_* / AFRICAS_TALKING_* — direct provider fallback
 */

export interface SmsSendResult {
  success: boolean
  messageId?: string
  error?: string
}

function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s+/g, '')
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
        to: normalizePhone(phone),
        phone: normalizePhone(phone),
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
      body: new URLSearchParams({ From: fromNumber, To: normalizePhone(phone), Body: message }),
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

  const provider = process.env.NEXT_PUBLIC_SMS_PROVIDER ?? (process.env.SMS_API_URL ? 'api' : 'mock')

  switch (provider) {
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
  const provider = process.env.NEXT_PUBLIC_SMS_PROVIDER ?? (process.env.SMS_API_URL ? 'api' : 'mock')
  if (provider === 'mock') return false
  if (provider === 'api') return Boolean(process.env.SMS_API_URL)
  if (provider === 'twilio') {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER
    )
  }
  return false
}
