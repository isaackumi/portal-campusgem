'use client'

import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { useMemo, type ReactNode } from 'react'

/**
 * When `NEXT_PUBLIC_CONVEX_URL` is set, enables Convex React hooks.
 * Without it, children render unchanged so Firebase-backed flows keep working.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  const client = useMemo(() => (url ? new ConvexReactClient(url) : null), [url])
  if (!client) {
    return <>{children}</>
  }
  return <ConvexProvider client={client}>{children}</ConvexProvider>
}
