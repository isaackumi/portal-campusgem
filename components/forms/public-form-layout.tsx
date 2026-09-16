'use client'

import type { ReactNode } from 'react'
import type { ChurchForm } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading'
import { cn } from '@/lib/utils'
import { formatPublicCampYearLabel } from '@/lib/forms/camp-year-label'
import { isValidCoverImageUrl } from '@/lib/forms/public-form-theme'
import {
  PublicFormThemeProvider,
  usePublicFormTheme,
} from '@/components/forms/public-form-theme-context'
import { PublicFormCommunityJoin } from '@/components/forms/public-form-community-join'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

const SHELL_WIDTH =
  'mx-auto w-full max-w-[640px] px-4 py-5 sm:px-6 sm:py-10 md:max-w-2xl'

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
      className="grain relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-mist via-mist-deep to-white text-ink antialiased"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[42vh] bg-[radial-gradient(ellipse_at_50%_0%,rgba(29,93,224,0.14),transparent_62%)]"
      />
      <div className={cn(SHELL_WIDTH, 'relative z-[1] pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]')}>
        {children}
        <footer className="pt-10 text-center">
          <p className="eyebrow text-brand-700/80">Campus Gem Ministries</p>
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
  const campMeta = formatPublicCampYearLabel(campYearLabel)

  return (
    <header className="animate-editorial-fade-up mb-4 overflow-hidden rounded-2xl border border-ink/8 bg-white/90 shadow-card backdrop-blur-sm">
      <div className="h-1.5 w-full" style={{ backgroundColor: theme.accentHex }} />
      {coverUrl ? (
        <div className="relative aspect-[21/9] max-h-56 w-full border-b border-ink/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverUrl} alt="" className="h-full w-full object-cover" loading="eager" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/35 via-transparent to-transparent" />
        </div>
      ) : null}
      <div className="px-5 py-7 sm:px-8 sm:py-9">
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={cn('rounded-md px-2.5 py-1 text-[11px] font-medium', theme.badge)}>
            {fillActive ? 'Step 1 of 2' : 'Step 2 of 2'}
          </span>
          {campMeta ? (
            <span className="eyebrow text-brand-700">{campMeta}</span>
          ) : groupName ? (
            <span className="eyebrow text-brand-700">{groupName}</span>
          ) : null}
        </div>
        <h1 className="font-display text-3xl font-bold leading-[1.08] tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        {step === 'fill' && form.description?.trim() ? (
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink-soft">{form.description}</p>
        ) : step === 'review' ? (
          <p className="mt-3 text-base leading-7 text-ink-soft">Check your answers, then submit.</p>
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
  showLookupButton?: boolean
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
  showLookupButton = true,
}: PhoneLookupProps) {
  const theme = usePublicFormTheme()

  return (
    <section className="animate-editorial-fade-up rounded-2xl border border-ink/8 bg-white/95 px-5 py-6 shadow-card sm:px-6 sm:py-7 [animation-delay:80ms]">
      <Label htmlFor="lookup-phone" className="text-base font-medium text-ink">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      {description ? <p className="mt-1 text-sm leading-relaxed text-ink-soft">{description}</p> : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          id="lookup-phone"
          className="h-11 flex-1 border-ink/15 bg-white text-base shadow-none"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="054 123 4567"
        />
        {showLookupButton ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0 border-brand-200 bg-white px-5 text-brand-700 hover:bg-brand-50"
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
        ) : null}
      </div>

      {profileName ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Welcome back, <span className="font-medium">{profileName}</span>.
        </p>
      ) : null}
      {alreadySubmitted ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
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
        'h-11 min-w-[140px] rounded-lg px-8 text-sm font-semibold text-white shadow-none',
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
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-ink/8 bg-white/95 py-24 shadow-card">
        <LoadingSpinner />
        <p className="text-sm text-ink-soft">Loading form…</p>
      </div>
    </PublicFormPageShell>
  )
}

export function PublicFormNotFound() {
  return (
    <PublicFormPageShell>
      <Card className="rounded-2xl border-ink/8 shadow-card">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-ink">Form not available</CardTitle>
          <CardDescription className="text-ink-soft">
            This link may be unpublished or incorrect.
          </CardDescription>
        </CardHeader>
      </Card>
    </PublicFormPageShell>
  )
}

export function PublicCampRegistrationClosed({
  campYearLabel,
}: {
  campYearLabel?: string | null
}) {
  return (
    <PublicFormPageShell>
      <Card className="shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <AlertTriangle className="h-8 w-8 text-slate-500" />
          </div>
          <CardTitle>
            {formatPublicCampYearLabel(campYearLabel) ?? 'Camp Meeting registration'}
          </CardTitle>
          <CardDescription className="text-base">
            Registration is not open for this camp year yet. Check back later or contact the church
            office if you think this is a mistake.
          </CardDescription>
        </CardHeader>
      </Card>
    </PublicFormPageShell>
  )
}

export function PublicFormSuccess({ title }: { title: string; form?: ChurchForm }) {
  const theme = usePublicFormTheme()

  return (
    <div className="space-y-3">
      <div className="animate-editorial-fade-up overflow-hidden rounded-2xl border border-ink/8 bg-white text-center shadow-card">
        <div className="h-1.5 w-full" style={{ backgroundColor: theme.accentHex }} />
        <div className="space-y-3 px-6 py-10 sm:py-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Your response has been recorded
          </h2>
          <p className="mx-auto max-w-md text-base leading-7 text-ink-soft">
            Thank you for completing <span className="font-medium text-ink">{title}</span>.
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
    <section className="rounded-2xl border border-ink/8 bg-white/95 px-5 py-4 shadow-card sm:px-6 sm:py-5">
      <p className="text-sm font-medium text-ink-soft">{label}</p>
      <p className={cn('mt-2 text-base', empty ? 'italic text-ink-soft/70' : 'text-ink')}>
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
