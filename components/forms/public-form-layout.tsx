'use client'

import type { ReactNode } from 'react'
import type { ChurchForm } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

export function PublicFormPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#eef2f6]">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 py-6 sm:py-10">
        <div className="flex-1">{children}</div>
        <p className="pb-2 pt-8 text-center text-xs text-slate-400">Campus Gem Ministries</p>
      </div>
    </div>
  )
}

export function PublicFormProgress({ step }: { step: 'fill' | 'review' }) {
  const fillActive = step === 'fill'
  return (
    <div className="flex gap-1 px-6 pt-5" aria-label={fillActive ? 'Step 1 of 2' : 'Step 2 of 2'}>
      <div className={cn('h-1 flex-1 rounded-full transition-colors', fillActive ? 'bg-primary' : 'bg-primary/30')} />
      <div className={cn('h-1 flex-1 rounded-full transition-colors', !fillActive ? 'bg-primary' : 'bg-slate-200')} />
    </div>
  )
}

export function PublicFormDocument({
  step,
  form,
  children,
}: {
  step: 'fill' | 'review'
  form: ChurchForm
  children: ReactNode
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.04)]">
      <PublicFormProgress step={step} />
      <header className="px-6 pb-5 pt-4">
        <h1 className="text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-2xl">
          {step === 'review' ? 'Review your answers' : form.title}
        </h1>
        {step === 'fill' && form.description ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{form.description}</p>
        ) : step === 'review' ? (
          <p className="mt-1.5 text-sm text-slate-500">{form.title}</p>
        ) : null}
      </header>
      <div className="border-t border-slate-100">{children}</div>
    </article>
  )
}

type PhoneLookupProps = {
  label: string
  description: string
  required: boolean
  value: string
  onChange: (value: string) => void
  onLookup: () => void
  lookupLoading: boolean
  profileName: string | null
  alreadySubmitted: boolean
  submittedAt: string | null
}

export function PublicFormPhoneLookup({
  label,
  description,
  required,
  value,
  onChange,
  onLookup,
  lookupLoading,
  profileName,
  alreadySubmitted,
  submittedAt,
}: PhoneLookupProps) {
  return (
    <div className="space-y-3 bg-slate-50/80 px-6 py-5">
      <div className="space-y-1">
        <Label htmlFor="lookup-phone" className="text-sm font-medium text-slate-900">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </Label>
        {description ? <p className="text-sm leading-relaxed text-slate-500">{description}</p> : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="lookup-phone"
          className="h-11 flex-1 border-slate-200 bg-white shadow-none focus-visible:ring-primary/30"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="054 123 4567"
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0 border-slate-200 bg-white hover:bg-slate-50"
          onClick={onLookup}
          disabled={lookupLoading}
        >
          {lookupLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching
            </>
          ) : (
            'Find my details'
          )}
        </Button>
      </div>
      {profileName ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Welcome back, <span className="font-medium">{profileName}</span>. Check the fields below and update anything
          that changed.
        </p>
      ) : null}
      {alreadySubmitted ? (
        <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            You already submitted this form
            {submittedAt ? ` on ${new Date(submittedAt).toLocaleDateString('en-GB')}` : ''}.
          </span>
        </p>
      ) : null}
    </div>
  )
}

export function PublicFormSubmitBar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'sticky bottom-0 -mx-4 mt-5 border-t border-slate-200/80 bg-[#eef2f6]/95 px-4 py-4 backdrop-blur-sm sm:-mx-0 sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none',
        className
      )}
    >
      {children}
    </div>
  )
}

export function PublicFormLoadingState() {
  return (
    <PublicFormPageShell>
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-24 shadow-sm">
        <LoadingSpinner />
        <p className="text-sm text-slate-500">Loading form…</p>
      </div>
    </PublicFormPageShell>
  )
}

export function PublicFormNotFound() {
  return (
    <PublicFormPageShell>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Form not available</CardTitle>
          <CardDescription>This link may be unpublished or incorrect.</CardDescription>
        </CardHeader>
      </Card>
    </PublicFormPageShell>
  )
}

export function PublicFormSuccess({ title }: { title: string }) {
  return (
    <PublicFormPageShell>
      <Card className="overflow-hidden text-center shadow-sm">
        <div className="h-1 bg-primary" />
        <CardHeader className="space-y-3 px-6 py-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <CardTitle className="text-xl">You&apos;re all set</CardTitle>
          <CardDescription className="text-base">
            Thanks for completing <span className="font-medium text-slate-700">{title}</span>.
          </CardDescription>
        </CardHeader>
      </Card>
    </PublicFormPageShell>
  )
}

export function PublicFormReviewRow({ label, value }: { label: string; value: string }) {
  const empty = value === '—' || !value.trim()
  return (
    <div className="px-6 py-4 sm:py-[1.125rem] [&:not(:last-child)]:border-b [&:not(:last-child)]:border-slate-100">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={cn('mt-1 text-[15px] leading-snug', empty ? 'italic text-slate-400' : 'text-slate-900')}>
        {empty ? 'No answer' : value}
      </p>
    </div>
  )
}

export function PublicFormReviewActions({
  onEdit,
  onSubmit,
  submitting,
  disabled,
}: {
  onEdit: () => void
  onSubmit: () => void
  submitting: boolean
  disabled: boolean
}) {
  return (
    <PublicFormSubmitBar>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="h-11 w-full sm:w-auto" onClick={onEdit}>
          Back to edit
        </Button>
        <Button type="button" className="h-11 w-full sm:min-w-[140px]" onClick={onSubmit} disabled={submitting || disabled}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting
            </>
          ) : (
            'Submit'
          )}
        </Button>
      </div>
    </PublicFormSubmitBar>
  )
}
