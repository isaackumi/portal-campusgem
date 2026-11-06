'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { RLC_NAME } from '@/lib/constants/rlc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Church, Home } from 'lucide-react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') ?? 'Friend'
  const id = searchParams.get('id')
  const code = searchParams.get('code')

  return (
    <Card className="w-full max-w-md border-brand-100/80 text-center shadow-md dark:border-brand-400/20">
      <CardHeader>
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-400/10">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
        </div>
        <CardTitle className="text-2xl text-emerald-800 dark:text-emerald-300">Welcome, {name}!</CardTitle>
        <CardDescription className="text-base">
          You&apos;re registered as a member of {RLC_NAME}. Our team will be in touch.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {code ? (
          <p className="rounded-lg bg-brand-50 px-3 py-2 font-mono text-sm font-semibold text-brand-900 dark:bg-brand-400/10 dark:text-brand-300">
            Check-in code: {code}
          </p>
        ) : null}
        {id ? (
          <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-muted-foreground dark:bg-white/[0.04]">
            Reference: <span className="font-mono">{id.slice(-8)}</span>
          </p>
        ) : null}
        <Button asChild variant="outline" className="h-12 w-full text-base">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Done
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function PublicRlcJoinSuccessPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-neutral-50 px-4 py-12 dark:bg-neutral-950">
      <div className="mb-6 flex items-center gap-2 text-brand-800 dark:text-brand-300">
        <Church className="h-5 w-5" />
        <span className="text-sm font-medium">{RLC_NAME}</span>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <SuccessContent />
      </Suspense>
    </div>
  )
}
