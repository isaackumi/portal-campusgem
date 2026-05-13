'use client'

import { SimpleAuthProvider as AuthProvider } from './simple-auth-provider'
import { ConvexClientProvider } from './convex-client-provider'
import { PWAProvider } from './pwa-provider'
import { ThemeProvider } from './theme-provider'
import { ReactQueryDevtoolsLoader } from './react-query-devtools-loader'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        gcTime: 1000 * 60 * 2,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        retry: 1,
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
        <ConvexClientProvider>
          <AuthProvider>
            <PWAProvider>
              {children}
              <ReactQueryDevtoolsLoader />
            </PWAProvider>
          </AuthProvider>
        </ConvexClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

// Re-export useAuth for convenience
export { useAuth } from './simple-auth-provider'