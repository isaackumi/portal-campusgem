'use client'

import type { ReactNode } from 'react'
import type { ChurchForm } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading'
import { cn } from '@/lib/utils'
import { isValidCoverImageUrl } from '@/lib/forms/public-form-theme'
import {
  PublicFormThemeProvider,
  usePublicFormTheme,
} from '@/components/forms/public-form-theme-context'
import { PublicFormCommunityJoin } from '@/components/forms/public-form-community-join'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

const SHELL_WIDTH =
  'mx-auto w-full max-w-[640px] px-4 py-5 sm:px-6 sm:py-8 md:max-w-2xl lg:max-w-3xl xl:max-w-4xl'

export function PublicFormPageShell({
  form,
  children,
}: {
  form?: Pick<ChurchForm, 'category' | 'accent_color'>
  children: ReactNode
}) {
  if (form) {
    return (
      <PublicFormThemeProvider
        form={form}
        key={`${form.accent_color ?? 'auto'}-${form.category ?? 'general'}`}
      >
        <PublicFormPageShellInner>{children}</PublicFormPageShellInner>
      </PublicFormThemeProvider>
    )
  }
  return <PublicFormPageShellInner>{children}</PublicFormPageShellInner>
}

function PublicFormPageShellInner({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-[100dvh] bg-[#eceff1] text-slate-900 antialiased"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className={cn(SHELL_WIDTH, 'pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]')}>
        {children}
        <footer className="pt-8 text-center">
          <p className="text-xs text-slate-500">Campus Gem Ministries</p>
        </footer>
      </div>
    </div>
  )
}

function PublicFormTitleCard({
  form,
  step,
  groupName,
  campYearLabel,
}: {
  form: ChurchForm
  step: 'fill' | 'review'
  groupName?: string | null
  campYearLabel?: string | null
}) {
  const theme = usePublicFormTheme()
  const coverUrl = isValidCoverImageUrl(form.cover_image_url) ? form.cover_image_url!.trim() : null
  const title = step === 'review' ? 'Review your answers' : form.title
  const fillActive = step === 'fill'

  return (
    <header className="mb-3 overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm">
      <div className="h-2.5 w-full" style={{ backgroundColor: theme.accentHex }} />
      {coverUrl ? (
        <div className="relative aspect-[21/9] max-h-56 w-full border-b border-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverUrl} alt="" className="h-full w-full object-cover" loading="eager" />
        </div>
      ) : null}
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
          <span className={cn('rounded-full px-2.5 py-0.5', theme.badge)}>
            {fillActive ? 'Step 1 of 2' : 'Step 2 of 2'}
          </span>
          {campYearLabel ? <span>Camp Meeting {campYearLabel}</span> : null}
          {groupName && !campYearLabel ? <span>{groupName}</span> : null}
        </div>
        <h1 className="text-2xl font-normal leading-snug tracking-tight text-slate-900 sm:text-3xl lg:text-[2rem]">
          {title}
        </h1>
        {step === 'fill' && form.description?.trim() ? (
          <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-slate-600">{form.description}</p>
        ) : step === 'review' ? (
          <p className="mt-3 text-base text-slate-500">Check your answers, then submit.</p>
        ) : null}
      </div>
    </header>
  )
}

export function PublicFormDocument({
  step,
  form,
  groupName,
  campYearLabel,
  toolbar,
  children,
}: {
  step: 'fill' | 'review'
  form: ChurchForm
  groupName?: string | null
  campYearLabel?: string | null
  toolbar?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      {toolbar}
      <PublicFormTitleCard
        form={form}
        step={step}
        groupName={groupName}
        campYearLabel={campYearLabel}
      />
      <div className="space-y-3">{children}</div>
    </div>
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
  const theme = usePublicFormTheme()

  return (
    <section className="rounded-lg border border-slate-200/80 bg-white px-5 py-5 shadow-sm sm:px-6 sm:py-6">
      <Label htmlFor="lookup-phone" className="text-base font-medium text-slate-900">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      {description ? <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p> : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          id="lookup-phone"
          className="h-11 flex-1 border-slate-300 bg-white text-base shadow-none"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="054 123 4567"
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0 border-slate-300 px-5"
          onClick={onLookup}
          disabled={lookupLoading}
        >
          {lookupLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching…
            </>
          ) : (
            'Find my details'
          )}
        </Button>
      </div>

      {profileName ? (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Welcome back, <span className="font-medium">{profileName}</span>.
        </p>
      ) : null}
      {alreadySubmitted ? (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Already submitted
            {submittedAt ? ` on ${new Date(submittedAt).toLocaleDateString('en-GB')}` : ''}.
          </span>
        </p>
      ) : null}
      <div className="mt-4 h-0.5 w-12 rounded-full opacity-40" style={{ backgroundColor: theme.accentHex }} />
    </section>
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
        'mt-4 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-end',
        className
      )}
    >
      {children}
    </div>
  )
}

export function PublicFormPrimaryButton({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const theme = usePublicFormTheme()
  return (
    <Button
      {...props}
      className={cn(
        'h-11 min-w-[140px] rounded-md px-8 text-sm font-medium text-white shadow-none',
        theme.button,
        className
      )}
    >
      {children}
    </Button>
  )
}

export function PublicFormLoadingState() {
  return (
    <PublicFormPageShell>
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-white py-24 shadow-sm">
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
        <CardHeader className="text-center">
          <CardTitle>Form not available</CardTitle>
          <CardDescription>This link may be unpublished or incorrect.</CardDescription>
        </CardHeader>
      </Card>
    </PublicFormPageShell>
  )
}

export function PublicFormSuccess({ title }: { title: string; form?: ChurchForm }) {
  const theme = usePublicFormTheme()

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white text-center shadow-sm">
        <div className="h-2.5 w-full" style={{ backgroundColor: theme.accentHex }} />
        <div className="space-y-3 px-6 py-10 sm:py-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-normal text-slate-900">Your response has been recorded</h2>
          <p className="text-base text-slate-600">
            Thank you for completing <span className="font-medium text-slate-800">{title}</span>.
          </p>
        </div>
      </div>
      <PublicFormCommunityJoin />
    </div>
  )
}

export function PublicFormReviewRow({ label, value }: { label: string; value: string }) {
  const empty = value === '—' || !value.trim()
  return (
    <section className="rounded-lg border border-slate-200/80 bg-white px-5 py-4 shadow-sm sm:px-6 sm:py-5">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className={cn('mt-2 text-base', empty ? 'italic text-slate-400' : 'text-slate-900')}>
        {empty ? 'No answer' : value}
      </p>
    </section>
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
      <Button type="button" variant="ghost" className="h-11" onClick={onEdit}>
        Back
      </Button>
      <PublicFormPrimaryButton type="button" onClick={onSubmit} disabled={submitting || disabled}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          'Submit'
        )}
      </PublicFormPrimaryButton>
    </PublicFormSubmitBar>
  )
}
