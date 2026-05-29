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
}: {
  form: Pick<ChurchForm, 'category' | 'accent_color'>
  children: ReactNode
}) {
  return (
    <PublicFormThemeProvider
      form={form}
      key={`${form.accent_color ?? 'auto'}-${form.category ?? 'general'}`}
    >
      <PublicFormSteppedShellInner>{children}</PublicFormSteppedShellInner>
    </PublicFormThemeProvider>
  )
}

function PublicFormSteppedShellInner({ children }: { children: ReactNode }) {
  const theme = usePublicFormTheme()

  return (
    <div
      className={cn(
        'relative min-h-[100dvh] bg-gradient-to-br text-white antialiased',
        theme.heroGradient
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at 20% 20%, ${theme.accentHex}55 0%, transparent 45%), radial-gradient(circle at 80% 80%, #ffffff22 0%, transparent 40%)`,
        }}
      />
      <div className="relative flex min-h-[100dvh] flex-col">{children}</div>
    </div>
  )
}
