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
import { AlertTriangle, CheckCircle2, Loader2, Phone, Sparkles } from 'lucide-react'

function PublicFormBranding() {
  return (
    <footer className="pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-6 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/70">Campus Gem Ministries</p>
    </footer>
  )
}

export function PublicFormPageShell({
  form,
  children,
}: {
  form?: Pick<ChurchForm, 'category' | 'accent_color'>
  children: ReactNode
}) {
  const inner = form ? (
    <PublicFormThemeProvider form={form}>
      <PublicFormPageShellInner>{children}</PublicFormPageShellInner>
    </PublicFormThemeProvider>
  ) : (
    <PublicFormPageShellInner>{children}</PublicFormPageShellInner>
  )

  return inner
}

function PublicFormPageShellInner({ children }: { children: ReactNode }) {
  const theme = usePublicFormTheme()

  return (
    <div
      className={cn(
        'min-h-[100dvh] bg-gradient-to-b',
        theme.pageGradient,
        'text-slate-900 antialiased'
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 sm:pt-4">
        <div className="flex-1">{children}</div>
        <PublicFormBranding />
      </div>
    </div>
  )
}

export function PublicFormProgress({ step }: { step: 'fill' | 'review' }) {
  const theme = usePublicFormTheme()
  const fillActive = step === 'fill'

  return (
    <div className="flex items-center gap-2 px-4 py-3" aria-label={fillActive ? 'Step 1 of 2' : 'Step 2 of 2'}>
      <div className="flex flex-1 gap-1.5">
        <div
          className={cn('h-1.5 flex-1 rounded-full transition-all', fillActive ? theme.progressActive : theme.progressDone)}
        />
        <div
          className={cn(
            'h-1.5 flex-1 rounded-full transition-all',
            !fillActive ? theme.progressActive : 'bg-white/30'
          )}
        />
      </div>
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-white/80">
        {fillActive ? '1 / 2' : '2 / 2'}
      </span>
    </div>
  )
}

function PublicFormCoverHero({
  form,
  groupName,
  step,
}: {
  form: ChurchForm
  groupName?: string | null
  step: 'fill' | 'review'
}) {
  const theme = usePublicFormTheme()
  const coverUrl = isValidCoverImageUrl(form.cover_image_url) ? form.cover_image_url!.trim() : null
  const title = step === 'review' ? 'Review your answers' : form.title

  return (
    <div className="relative overflow-hidden">
      {coverUrl ? (
        <div className="relative h-44 w-full sm:h-48">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
        </div>
      ) : (
        <div className={cn('relative h-36 w-full bg-gradient-to-br sm:h-40', theme.heroGradient)}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-4 pb-3 pt-8">
            <Sparkles className="h-4 w-4 text-white/80" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wider text-white/80">Campus Gem</span>
          </div>
        </div>
      )}

      <div className={cn('px-4 pb-4', coverUrl ? 'absolute inset-x-0 bottom-0' : 'relative -mt-1 pt-1')}>
        {groupName ? (
          <span
            className={cn(
              'mb-2 inline-flex max-w-full truncate rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
              coverUrl ? 'bg-white/20 text-white backdrop-blur-sm' : theme.badge
            )}
          >
            {groupName}
          </span>
        ) : null}
        <h1 className="text-xl font-bold leading-tight tracking-tight text-white drop-shadow-sm sm:text-2xl">
          {title}
        </h1>
      </div>
    </div>
  )
}

export function PublicFormDocument({
  step,
  form,
  groupName,
  children,
}: {
  step: 'fill' | 'review'
  form: ChurchForm
  groupName?: string | null
  children: ReactNode
}) {
  const theme = usePublicFormTheme()
  const showDescription = step === 'fill' && Boolean(form.description?.trim())

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
      <PublicFormCoverHero form={form} groupName={groupName} step={step} />
      <div className={cn('bg-gradient-to-r', theme.heroGradient)}>
        <PublicFormProgress step={step} />
      </div>

      {showDescription ? (
        <div className="px-4 pt-4">
          <div
            className={cn(
              'rounded-xl border px-3.5 py-3 text-sm leading-relaxed',
              theme.descriptionBox
            )}
          >
            {form.description}
          </div>
        </div>
      ) : step === 'review' ? (
        <p className="px-4 pt-4 text-sm text-slate-500">Check everything below, then submit.</p>
      ) : null}

      <div className="mt-1">{children}</div>
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
  const theme = usePublicFormTheme()

  return (
    <div className={cn('mx-4 mb-4 mt-4 space-y-3 rounded-xl border p-4', theme.accentSoft, theme.accentBorder)}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm',
            theme.button.split(' ')[0]
          )}
        >
          <Phone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="lookup-phone" className="text-base font-semibold text-slate-900">
            {label}
            {required ? <span className="text-red-500"> *</span> : null}
          </Label>
          {description ? <p className="text-sm leading-relaxed text-slate-600">{description}</p> : null}
        </div>
      </div>

      <Input
        id="lookup-phone"
        className="h-12 border-white/80 bg-white text-base shadow-none focus-visible:ring-2"
        inputMode="tel"
        autoComplete="tel"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="054 123 4567"
      />

      <Button
        type="button"
        variant="outline"
        className="h-12 w-full border-slate-200 bg-white text-base font-medium"
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

      {profileName ? (
        <p className="rounded-lg bg-emerald-100/90 px-3 py-2.5 text-sm text-emerald-900">
          Welcome back, <span className="font-semibold">{profileName}</span>. Update anything that changed below.
        </p>
      ) : null}
      {alreadySubmitted ? (
        <p className="flex items-start gap-2 rounded-lg bg-amber-100/90 px-3 py-2.5 text-sm text-amber-950">
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
        'sticky bottom-0 z-10 -mx-3 mt-4 border-t border-white/40 bg-white/85 px-3 py-3 backdrop-blur-md',
        'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        'shadow-[0_-8px_24px_rgba(15,23,42,0.08)] sm:-mx-0 sm:rounded-2xl sm:border sm:border-slate-200/80',
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
        'h-12 w-full rounded-xl text-base font-semibold text-white shadow-md transition-transform active:scale-[0.99]',
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
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white py-24 shadow-lg ring-1 ring-black/5">
        <LoadingSpinner />
        <p className="text-sm font-medium text-slate-600">Loading form…</p>
      </div>
    </PublicFormPageShell>
  )
}

export function PublicFormNotFound() {
  return (
    <PublicFormPageShell>
      <Card className="overflow-hidden rounded-2xl border-0 shadow-lg ring-1 ring-black/5">
        <CardHeader className="px-5 py-8 text-center">
          <CardTitle className="text-xl">Form not available</CardTitle>
          <CardDescription className="text-base">
            This link may be unpublished or incorrect. Check with your campus leader for the right link.
          </CardDescription>
        </CardHeader>
      </Card>
    </PublicFormPageShell>
  )
}

export function PublicFormSuccess({ title, form }: { title: string; form: ChurchForm }) {
  const theme = usePublicFormTheme()

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl bg-white text-center shadow-lg ring-1 ring-black/5">
        <div className={cn('h-1.5 w-full bg-gradient-to-r', theme.heroGradient)} />
        <div className="space-y-3 px-5 py-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">You&apos;re all set!</h2>
          <p className="text-base leading-relaxed text-slate-600">
            Thanks for completing{' '}
            <span className="font-semibold text-slate-800">{title}</span>. Join our WhatsApp and Telegram
            communities below.
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
    <div className="px-4 py-3.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-slate-100">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('mt-1 text-base leading-snug', empty ? 'italic text-slate-400' : 'text-slate-900')}>
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
      <div className="flex flex-col gap-2.5">
        <PublicFormPrimaryButton type="button" onClick={onSubmit} disabled={submitting || disabled}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            'Submit form'
          )}
        </PublicFormPrimaryButton>
        <Button type="button" variant="ghost" className="h-11 w-full text-base" onClick={onEdit}>
          Back to edit
        </Button>
      </div>
    </PublicFormSubmitBar>
  )
}
