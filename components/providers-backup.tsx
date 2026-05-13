'use client'

import { SimpleAuthProvider as AuthProvider } from './simple-auth-provider'
import { PWAProvider } from './pwa-provider'
import { ThemeProvider } from './theme-provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0, // Always consider data stale in development
        gcTime: 1000 * 60 * 2, // 2 minutes cache time
        refetchOnWindowFocus: true, // Refetch when window gains focus
        refetchOnMount: true, // Always refetch on mount
        retry: 1, // Only retry once on failure
      },
    },
  }))
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PWAProvider>
            {children}
            <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
          </PWAProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

// Re-export useAuth for convenience
export { useAuth } from './simple-auth-provider'


