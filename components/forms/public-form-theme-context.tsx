'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { PublicFormTheme } from '@/lib/forms/public-form-theme'
import { resolvePublicFormTheme } from '@/lib/forms/public-form-theme'
import type { ChurchForm } from '@/lib/types'

const PublicFormThemeContext = createContext<PublicFormTheme | null>(null)

export function PublicFormThemeProvider({
  form,
  children,
}: {
  form: Pick<ChurchForm, 'category' | 'accent_color'>
  children: ReactNode
}) {
  const theme = resolvePublicFormTheme(form)
  return <PublicFormThemeContext.Provider value={theme}>{children}</PublicFormThemeContext.Provider>
}

export function usePublicFormTheme(): PublicFormTheme {
  const theme = useContext(PublicFormThemeContext)
  if (!theme) {
    return resolvePublicFormTheme({})
  }
  return theme
}
