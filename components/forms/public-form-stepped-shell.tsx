'use client'

import type { ReactNode } from 'react'
import type { ChurchForm } from '@/lib/types'
import {
  PublicFormThemeProvider,
  usePublicFormTheme,
} from '@/components/forms/public-form-theme-context'
import { cn } from '@/lib/utils'

const DOT_PATTERN =
  'radial-gradient(circle, rgba(255,255,255,0.14) 1px, transparent 1px)'

export function PublicFormSteppedShell({
  form,
  children,
  progress = 0,
}: {
  form: Pick<ChurchForm, 'category' | 'accent_color'>
  children: ReactNode
  progress?: number
}) {
  return (
    <PublicFormThemeProvider
      form={form}
      key={`${form.accent_color ?? 'auto'}-${form.category ?? 'general'}`}
    >
      <PublicFormSteppedShellInner progress={progress}>{children}</PublicFormSteppedShellInner>
    </PublicFormThemeProvider>
  )
}

function PublicFormSteppedShellInner({
  children,
  progress,
}: {
  children: ReactNode
  progress: number
}) {
  const theme = usePublicFormTheme()

  return (
    <div
      className={cn(
        'relative flex min-h-[100dvh] flex-col bg-gradient-to-br text-white antialiased',
        theme.heroGradient
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: theme.steppedPatternOpacity,
          backgroundImage: DOT_PATTERN,
          backgroundSize: '22px 22px',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.08) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.15) 0%, transparent 50%)',
        }}
      />

      <div className="relative h-1.5 w-full bg-black/20">
        <div
          className="h-full bg-white shadow-sm transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        {children}
        <footer className="mt-auto pt-6 text-center">
          <p className="text-xs font-medium text-white/70">Campus Gem Ministries</p>
        </footer>
      </div>
    </div>
  )
}

export function SteppedQuestionCard({ children }: { children: ReactNode }) {
  const theme = usePublicFormTheme()

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/20 bg-white text-slate-900 shadow-2xl shadow-black/25">
      <div className="h-1.5 w-full" style={{ backgroundColor: theme.accentHex }} />
      <div className="px-5 py-7 sm:px-8 sm:py-9">{children}</div>
    </div>
  )
}
