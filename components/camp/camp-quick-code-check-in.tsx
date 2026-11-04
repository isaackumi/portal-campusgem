'use client'

import { useState } from 'react'
import type { CampRegistration } from '@/lib/types'
import { campService } from '@/lib/services/camp-service'
import { resolveCampCheckInCode } from '@/lib/camp/check-in-code'
import { campRegistrationDisplayName } from '@/lib/camp/manual-check-in-search'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { Hash, UserCheck } from 'lucide-react'
import { PhoneLink, QuickContactButtons } from '@/components/contact/phone-link'

type Props = {
  registrations: CampRegistration[]
  activityId?: string
  sessionCheckedInIds?: Set<string>
  performedByUserId?: string
  onCheckInComplete?: () => void
}

export function CampQuickCodeCheckIn({
  registrations,
  activityId,
  sessionCheckedInIds,
  performedByUserId,
  onCheckInComplete,
}: Props) {
  const { toast } = useToast()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastMatch, setLastMatch] = useState<CampRegistration | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const normalized = code.trim().toUpperCase()
    if (!normalized) return

    const reg = registrations.find(
      (row) => resolveCampCheckInCode(row)?.toUpperCase() === normalized
    )
    if (!reg) {
      toast({
        variant: 'destructive',
        title: 'Code not found',
        description: 'No camper matches that GEM code for this year.',
      })
      setLastMatch(null)
      return
    }

    const inSession = activityId ? sessionCheckedInIds?.has(reg.id) : reg.status === 'checked_in'
    if (inSession) {
      toast({
        title: activityId ? 'Already in session' : 'Already checked in',
        description: campRegistrationDisplayName(reg),
      })
      setLastMatch(reg)
      return
    }

    if (activityId && !performedByUserId) {
      toast({
        variant: 'destructive',
        title: 'Sign in required',
        description: 'You must be signed in to record check-ins.',
      })
      return
    }

    setSubmitting(true)
    try {
      if (activityId && performedByUserId) {
        const { data, error } = await campService.recordSessionCheckIn({
          activity_id: activityId,
          registration_id: reg.id,
          performed_by: performedByUserId,
          check_in_method: 'code',
        })
        if (error || !data) throw new Error(error ?? 'Check-in failed')
      } else {
        const { error } = await campService.updateRegistration(reg.id, { status: 'checked_in' })
        if (error) throw new Error(error)
        if (performedByUserId) {
          await campService.addInteraction({
            registration_id: reg.id,
            performed_by: performedByUserId,
            interaction_type: 'status_change',
            notes: 'Camp arrival check-in via desk code',
          })
        }
      }

      setLastMatch(reg)
      setCode('')
      toast({
        title: 'Checked in',
        description: campRegistrationDisplayName(reg),
      })
      onCheckInComplete?.()
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Check-in failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="border-b border-neutral-200/80 bg-neutral-50 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Hash className="h-5 w-5" />
          Quick code entry
        </CardTitle>
        <CardDescription>
          Type or paste a GEM code (e.g. GEM-26-K7M3) — fastest when the camera is unavailable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6 sm:pt-4">
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="GEM-26-XXXX"
            className="h-11 min-h-11 flex-1 font-mono text-base uppercase"
            autoComplete="off"
            autoFocus
          />
          <Button type="submit" className="h-11 min-h-11 w-full sm:w-auto sm:min-w-[9rem]" disabled={submitting || !code.trim()}>
            {submitting ? (
              <LoadingSpinner className="h-4 w-4" />
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Check in
              </>
            )}
          </Button>
        </form>

        {lastMatch ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-sm dark:border-emerald-400/20 dark:bg-emerald-400/10">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-emerald-900 dark:text-emerald-200">{campRegistrationDisplayName(lastMatch)}</p>
                {lastMatch.phone ? (
                  <PhoneLink
                    phone={lastMatch.phone}
                    whatsapp={lastMatch.whatsapp}
                    name={campRegistrationDisplayName(lastMatch)}
                    className="text-neutral-700 dark:text-neutral-300"
                  />
                ) : null}
              </div>
              <QuickContactButtons
                phone={lastMatch.phone}
                whatsapp={lastMatch.whatsapp}
                name={campRegistrationDisplayName(lastMatch)}
              />
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge variant="outline">{lastMatch.role}</Badge>
              {resolveCampCheckInCode(lastMatch) ? (
                <Badge variant="secondary" className="font-mono">
                  {resolveCampCheckInCode(lastMatch)}
                </Badge>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
