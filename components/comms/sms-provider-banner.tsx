'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { sendTestSmsAction } from '@/lib/actions/comms'
import { normalizeSmsPhone, isValidSmsPhone } from '@/lib/comms/sms-client'
import { useToast } from '@/hooks/use-toast'
import { Beaker, MessageSquare, Radio } from 'lucide-react'

export type SmsProviderStatus = {
  email?: string
  sms?: boolean
  smsConfigured: boolean
  smsProvider: string
  smsSenderId: string
  environment: string
  devModeAvailable: boolean
  forceMock: boolean
}

type Props = {
  status: SmsProviderStatus | null
  dryRun: boolean
  onDryRunChange: (value: boolean) => void
  forceMock: boolean
  onForceMockChange: (value: boolean) => void
  senderId?: string
  className?: string
}

export function SmsProviderBanner({
  status,
  dryRun,
  onDryRunChange,
  forceMock,
  onForceMockChange,
  senderId,
  className,
}: Props) {
  const { toast } = useToast()
  const [testPhone, setTestPhone] = useState('')
  const [testing, setTesting] = useState(false)

  if (!status) return null

  const live = status.smsConfigured && !forceMock && !dryRun && !status.forceMock

  async function handleTestSend() {
    if (!isValidSmsPhone(testPhone)) {
      toast({
        variant: 'destructive',
        title: 'Invalid phone',
        description: `Need a full Ghana mobile. Got: ${normalizeSmsPhone(testPhone) || 'empty'}`,
      })
      return
    }
    setTesting(true)
    const result = await sendTestSmsAction({
      phone: testPhone,
      dry_run: dryRun,
      force_mock: forceMock || status.forceMock,
      sender_id: senderId,
    })
    setTesting(false)
    if (result.error || !result.data?.success) {
      toast({
        variant: 'destructive',
        title: 'Test SMS failed',
        description: result.error ?? result.data?.error ?? 'Unknown error',
      })
      return
    }
    toast({
      title: dryRun ? 'Dry run OK' : 'Test SMS sent',
      description: `${result.data.normalizedPhone} via ${result.data.provider}${
        result.data.messageId ? ` · ${result.data.messageId}` : ''
      }`,
    })
  }

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${className ?? ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Radio className="h-4 w-4 text-emerald-600" />
            SMS provider
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <Badge variant={live ? 'default' : 'secondary'}>
              {live ? 'Live' : dryRun ? 'Dry run' : status.forceMock || forceMock ? 'Mock' : status.smsProvider}
            </Badge>
            <span className="font-mono uppercase">{status.smsProvider}</span>
            <span>· sender {status.smsSenderId}</span>
            <span>· env {status.environment}</span>
            {!status.smsConfigured ? (
              <span className="text-amber-700">Hubtel credentials not configured on this server</span>
            ) : null}
          </div>
        </div>
        {status.devModeAvailable ? (
          <Badge variant="outline" className="gap-1">
            <Beaker className="h-3 w-3" />
            Developer mode
          </Badge>
        ) : null}
      </div>

      {status.devModeAvailable ? (
        <div className="mt-4 space-y-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <Checkbox checked={dryRun} onCheckedChange={(v) => onDryRunChange(v === true)} />
              Dry run (no real SMS)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <Checkbox
                checked={forceMock || status.forceMock}
                disabled={status.forceMock}
                onCheckedChange={(v) => onForceMockChange(v === true)}
              />
              Force mock
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="sms-test-phone" className="text-xs">
                Test send to one number
              </Label>
              <Input
                id="sms-test-phone"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="024XXXXXXX or 233XXXXXXXXX"
              />
              {testPhone.trim() ? (
                <p className="text-xs text-muted-foreground">
                  → {normalizeSmsPhone(testPhone) || 'invalid'}{' '}
                  {isValidSmsPhone(testPhone) ? '(valid)' : '(invalid)'}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={testing || !testPhone.trim()}
              onClick={() => void handleTestSend()}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {testing ? 'Sending…' : dryRun ? 'Dry-run test' : 'Send test'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function commsMetaBadge(metadata?: Record<string, unknown> | null) {
  const provider = typeof metadata?.provider === 'string' ? metadata.provider : null
  const dryRun = Boolean(metadata?.dry_run)
  const test = Boolean(metadata?.test)
  return { provider, dryRun, test }
}
