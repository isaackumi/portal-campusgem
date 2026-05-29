'use client'

import type { ReactNode } from 'react'
import type { ChurchForm } from '@/lib/types'
import {
  PublicFormThemeProvider,
  usePublicFormTheme,
} from '@/components/forms/public-form-theme-context'
import { cn } from '@/lib/utils'

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
      className={cn('min-h-[100dvh] bg-[#eceff1] text-slate-900 antialiased')}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className="h-1.5 w-full bg-slate-200">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            backgroundColor: theme.accentHex,
          }}
        />
      </div>
      <div className="mx-auto flex min-h-[calc(100dvh-6px)] w-full max-w-2xl flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        {children}
        <footer className="mt-auto pt-8 text-center">
          <p className="text-xs text-slate-500">Campus Gem Ministries</p>
        </footer>
      </div>
    </div>
  )
}

export function SteppedQuestionCard({ children }: { children: ReactNode }) {
  const theme = usePublicFormTheme()

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
      <div className="h-1.5 w-full" style={{ backgroundColor: theme.accentHex }} />
      <div className="px-5 py-7 sm:px-8 sm:py-9">{children}</div>
    </div>
  )
}
